import { useRef, useCallback } from "react";
import type { RefObject } from "react";
import type { Point } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CanvasAction =
	| { type: "hit-test"; imgX: number; imgY: number }
	| { type: "rect-select"; x0: number; y0: number; x1: number; y1: number }
	| { type: "positive-prompt"; imgX: number; imgY: number }
	| { type: "negative-prompt"; imgX: number; imgY: number }
	| { type: "add-polygon-vertex"; imgX: number; imgY: number }
	| { type: "brush-stroke-start"; imgX: number; imgY: number }
	| { type: "brush-stroke-move"; imgX: number; imgY: number }
	| { type: "brush-stroke-end" }
	| {
			type: "move-edit-vertex";
			vertexIndex: number;
			imgX: number;
			imgY: number;
	  }
	| { type: "add-edit-vertex"; edgeIndex: number; imgX: number; imgY: number };

type Viewport = { scale: number; originX: number; originY: number };

// Internal mouse FSM states
type MouseState =
	| { phase: "idle" }
	| {
			phase: "leftDown";
			startClientX: number;
			startClientY: number;
			startImgX: number;
			startImgY: number;
	  }
	| { phase: "selecting"; startImgX: number; startImgY: number }
	| {
			phase: "rightPanning";
			lastClientX: number;
			lastClientY: number;
			startClientX: number;
			startClientY: number;
			startImgX: number;
			startImgY: number;
	  }
	| { phase: "editDragging"; vertexIndex: number }
	| { phase: "editAddOnUp"; edgeIndex: number; imgX: number; imgY: number }
	| { phase: "brushPainting"; lastX: number; lastY: number };

// Selection rect in image coordinates (exposed for drawing)
export type SelectionRect = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
};

const DRAG_THRESHOLD = 5; // pixels before a click becomes a drag
const EDIT_HIT_RADIUS_PX = 8; // screen pixels for vertex/edge hit-testing

function distanceToSegment(
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number,
): number {
	const dx = bx - ax;
	const dy = by - ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(px - ax, py - ay);
	const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function hitTestVertex(
	points: Point[],
	x: number,
	y: number,
	radius: number,
): number {
	let best = -1;
	let bestDist = radius;
	for (let i = 0; i < points.length; i++) {
		const d = Math.hypot(points[i].x - x, points[i].y - y);
		if (d <= bestDist) {
			bestDist = d;
			best = i;
		}
	}
	return best;
}

function nearestEdge(
	points: Point[],
	x: number,
	y: number,
	radius: number,
): number {
	const n = points.length;
	if (n < 2) return -1;
	let best = -1;
	let bestDist = radius;
	for (let i = 0; i < n; i++) {
		const a = points[i];
		const b = points[(i + 1) % n];
		const d = distanceToSegment(x, y, a.x, a.y, b.x, b.y);
		if (d <= bestDist) {
			bestDist = d;
			best = i;
		}
	}
	return best;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Encapsulates all canvas mouse interactions with mode-aware behaviour.
 *
 * Select mode:
 *   - Left click          → hit-test (single annotation selection)
 *   - Left drag           → rectangle selection
 *   - Right drag          → pan
 *
 * Add mode:
 *   - point prompt: Left click  → positive point prompt
 *                   Right click → negative point prompt
 *   - polygon prompt: Left click → add polygon vertex
 *   - brush prompt: Left drag → paint a brush stroke
 *   - Dragging disabled for point/polygon prompts
 *
 * Edit mode:
 *   - vertex tool: Left click/drag on a vertex → move it
 *                  Left click on an edge       → add a vertex
 *   - brush tool:  Left drag → paint additional regions
 *
 * Scroll-to-zoom is handled separately in AnnotationCanvas via a native
 * wheel listener (needs passive:false), so it is not part of this hook.
 */
export function useCanvasInteraction(
	mode: "select" | "add" | "edit",
	promptMode: "point" | "polygon" | "brush",
	editTool: "vertex" | "brush",
	brushSize: number,
	editPointsRef: RefObject<Point[]>,
	brushCursorRef: RefObject<{ x: number; y: number } | null>,
	canvasRef: RefObject<HTMLCanvasElement | null>,
	viewportRef: RefObject<Viewport>,
	imageSizeRef: RefObject<{ width: number; height: number }>,
	requestDraw: () => void,
	onAction: (action: CanvasAction) => void,
) {
	const mouseStateRef = useRef<MouseState>({ phase: "idle" });
	const selectionRectRef = useRef<SelectionRect | null>(null);

	// Convert browser client coords → image-space coords
	const toImageCoords = useCallback(
		(clientX: number, clientY: number) => {
			const canvas = canvasRef.current;
			if (!canvas) return null;
			const { left, top } = canvas.getBoundingClientRect();
			const { scale, originX, originY } = viewportRef.current!;
			return {
				x: (clientX - left) / scale + originX,
				y: (clientY - top) / scale + originY,
			};
		},
		[canvasRef, viewportRef],
	);

	const isInImageBounds = useCallback(
		(imgX: number, imgY: number) => {
			const { width, height } = imageSizeRef.current;
			return imgX >= 0 && imgY >= 0 && imgX <= width && imgY <= height;
		},
		[imageSizeRef],
	);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			const img = toImageCoords(e.clientX, e.clientY);
			if (!img) return;

			function isRightClick(e: React.MouseEvent) {
				return e.button === 2;
			}

			function isLeftClick(e: React.MouseEvent) {
				return e.button === 0;
			}

			if (!isLeftClick(e) && !isRightClick(e)) return;

			// Right-drag pans the canvas in every mode. A right-click without
			// dragging is resolved on mouse-up (negative point prompt in
			// point-prompt add mode).
			if (isRightClick(e)) {
				mouseStateRef.current = {
					phase: "rightPanning",
					lastClientX: e.clientX,
					lastClientY: e.clientY,
					startClientX: e.clientX,
					startClientY: e.clientY,
					startImgX: img.x,
					startImgY: img.y,
				};
				if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
				return;
			}

			// Only left-clicks reach the mode-specific handling below.
			if (mode === "add") {
				if (!isInImageBounds(img.x, img.y)) return;
				if (promptMode === "polygon") {
					onAction({
						type: "add-polygon-vertex",
						imgX: img.x,
						imgY: img.y,
					});
					return;
				}
				if (promptMode === "brush") {
					mouseStateRef.current = {
						phase: "brushPainting",
						lastX: img.x,
						lastY: img.y,
					};
					onAction({ type: "brush-stroke-start", imgX: img.x, imgY: img.y });
					return;
				}
				onAction({ type: "positive-prompt", imgX: img.x, imgY: img.y });
				return;
			}

			// Edit mode: drag a vertex, click an edge to add a vertex, or paint
			if (mode === "edit") {
				if (!isInImageBounds(img.x, img.y)) return;
				if (editTool === "brush") {
					mouseStateRef.current = {
						phase: "brushPainting",
						lastX: img.x,
						lastY: img.y,
					};
					onAction({ type: "brush-stroke-start", imgX: img.x, imgY: img.y });
					return;
				}
				const pts = editPointsRef.current;
				const hitRadius = EDIT_HIT_RADIUS_PX / viewportRef.current.scale;

				const vertexIndex = hitTestVertex(pts, img.x, img.y, hitRadius);
				if (vertexIndex >= 0) {
					mouseStateRef.current = { phase: "editDragging", vertexIndex };
					if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
					return;
				}

				const edgeIndex = nearestEdge(pts, img.x, img.y, hitRadius);
				if (edgeIndex >= 0) {
					mouseStateRef.current = {
						phase: "editAddOnUp",
						edgeIndex,
						imgX: img.x,
						imgY: img.y,
					};
				}
				return;
			}

			// Select mode: left click/drag selects
			if (!isInImageBounds(img.x, img.y)) return;
			mouseStateRef.current = {
				phase: "leftDown",
				startClientX: e.clientX,
				startClientY: e.clientY,
				startImgX: img.x,
				startImgY: img.y,
			};
		},
		[
			mode,
			promptMode,
			editTool,
			editPointsRef,
			canvasRef,
			viewportRef,
			toImageCoords,
			isInImageBounds,
			onAction,
		],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			const img = toImageCoords(e.clientX, e.clientY);
			if (img) brushCursorRef.current = { x: img.x, y: img.y };

			// Keep the brush-size cursor following the pointer while a brush
			// tool is active (the actual stroke points are emitted below).
			const brushCursorActive =
				(mode === "add" && promptMode === "brush") ||
				(mode === "edit" && editTool === "brush");
			if (brushCursorActive) requestDraw();

			const ms = mouseStateRef.current;

			if (ms.phase === "leftDown") {
				const dx = e.clientX - ms.startClientX;
				const dy = e.clientY - ms.startClientY;
				if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
					// Promote to rectangle selection
					mouseStateRef.current = {
						phase: "selecting",
						startImgX: ms.startImgX,
						startImgY: ms.startImgY,
					};
					selectionRectRef.current = {
						startX: ms.startImgX,
						startY: ms.startImgY,
						endX: ms.startImgX,
						endY: ms.startImgY,
					};
					if (canvasRef.current) canvasRef.current.style.cursor = "crosshair";
				}
			} else if (ms.phase === "selecting") {
				const img = toImageCoords(e.clientX, e.clientY);
				if (img && selectionRectRef.current) {
					// If the mouse goes outside the image bounds,
					// clamp the selection rect to the image edges
					if (!isInImageBounds(img.x, img.y)) {
						const { width, height } = imageSizeRef.current;
						img.x = Math.max(0, Math.min(width, img.x));
						img.y = Math.max(0, Math.min(height, img.y));
					}
					selectionRectRef.current.endX = img.x;
					selectionRectRef.current.endY = img.y;
					requestDraw();
				}
			} else if (ms.phase === "editDragging") {
				const img = toImageCoords(e.clientX, e.clientY);
				if (!img) return;
				const { width, height } = imageSizeRef.current;
				const cx = Math.max(0, Math.min(width, img.x));
				const cy = Math.max(0, Math.min(height, img.y));
				onAction({
					type: "move-edit-vertex",
					vertexIndex: ms.vertexIndex,
					imgX: cx,
					imgY: cy,
				});
			} else if (ms.phase === "brushPainting") {
				const img = toImageCoords(e.clientX, e.clientY);
				if (!img) return;
				const { width, height } = imageSizeRef.current;
				const cx = Math.max(0, Math.min(width, img.x));
				const cy = Math.max(0, Math.min(height, img.y));
				const spacing = Math.max(1, brushSize / 4);
				if (Math.hypot(cx - ms.lastX, cy - ms.lastY) >= spacing) {
					ms.lastX = cx;
					ms.lastY = cy;
					onAction({ type: "brush-stroke-move", imgX: cx, imgY: cy });
				}
			} else if (ms.phase === "rightPanning") {
				const dx = e.clientX - ms.lastClientX;
				const dy = e.clientY - ms.lastClientY;
				const vp = viewportRef.current!;
				vp.originX -= dx / vp.scale;
				vp.originY -= dy / vp.scale;
				mouseStateRef.current = {
					...ms,
					lastClientX: e.clientX,
					lastClientY: e.clientY,
				};
				requestDraw();
			}
		},
		[
			canvasRef,
			toImageCoords,
			viewportRef,
			requestDraw,
			onAction,
			imageSizeRef,
			isInImageBounds,
			brushCursorRef,
			brushSize,
			mode,
			promptMode,
			editTool,
		],
	);

	const handleMouseUp = useCallback(
		(e: React.MouseEvent) => {
			const ms = mouseStateRef.current;

			if (ms.phase === "leftDown") {
				// No drag → single click
				const img = toImageCoords(e.clientX, e.clientY);
				if (img) onAction({ type: "hit-test", imgX: img.x, imgY: img.y });
			} else if (ms.phase === "selecting") {
				const rect = selectionRectRef.current;
				if (rect) {
					onAction({
						type: "rect-select",
						x0: rect.startX,
						y0: rect.startY,
						x1: rect.endX,
						y1: rect.endY,
					});
				}
				selectionRectRef.current = null;
				requestDraw();
			} else if (ms.phase === "editDragging") {
				// Vertex drag completed — the position was already applied per-move.
			} else if (ms.phase === "editAddOnUp") {
				onAction({
					type: "add-edit-vertex",
					edgeIndex: ms.edgeIndex,
					imgX: ms.imgX,
					imgY: ms.imgY,
				});
			} else if (ms.phase === "brushPainting") {
				onAction({ type: "brush-stroke-end" });
			} else if (ms.phase === "rightPanning") {
				// A right-click (no drag) in point-prompt add mode is a negative
				// prompt; otherwise the right-drag just panned the canvas.
				const dist = Math.hypot(
					e.clientX - ms.startClientX,
					e.clientY - ms.startClientY,
				);
				if (
					dist <= DRAG_THRESHOLD &&
					mode === "add" &&
					promptMode === "point"
				) {
					onAction({
						type: "negative-prompt",
						imgX: ms.startImgX,
						imgY: ms.startImgY,
					});
				}
			}

			mouseStateRef.current = { phase: "idle" };
			if (canvasRef.current) {
				canvasRef.current.style.cursor =
					mode === "add" ? "crosshair" : "default";
			}
		},
		[mode, promptMode, canvasRef, toImageCoords, onAction, requestDraw],
	);

	// Cancel any in-progress gesture when the pointer leaves the canvas
	const handleMouseLeave = useCallback(() => {
		mouseStateRef.current = { phase: "idle" };
		selectionRectRef.current = null;
		brushCursorRef.current = null;
		if (canvasRef.current) {
			canvasRef.current.style.cursor = mode === "add" ? "crosshair" : "default";
		}
		requestDraw();
	}, [mode, canvasRef, requestDraw, brushCursorRef]);

	// Prevent the browser context menu so right-click works in add mode
	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
	}, []);

	return {
		selectionRectRef,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseLeave,
		handleContextMenu,
	};
}
