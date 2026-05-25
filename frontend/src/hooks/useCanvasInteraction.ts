import { useRef, useCallback } from "react";
import type { RefObject } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CanvasAction =
	| { type: "hit-test"; imgX: number; imgY: number }
	| { type: "rect-select"; x0: number; y0: number; x1: number; y1: number }
	| { type: "positive-prompt"; imgX: number; imgY: number }
	| { type: "negative-prompt"; imgX: number; imgY: number };

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
	| { phase: "rightPanning"; lastClientX: number; lastClientY: number };

// Selection rect in image coordinates (exposed for drawing)
export type SelectionRect = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
};

const DRAG_THRESHOLD = 5; // pixels before a click becomes a drag

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
 *   - Left click          → positive point prompt
 *   - Right click         → negative point prompt
 *   - Dragging disabled
 *
 * Scroll-to-zoom is handled separately in AnnotationCanvas via a native
 * wheel listener (needs passive:false), so it is not part of this hook.
 */
export function useCanvasInteraction(
	mode: "select" | "add",
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

			if (mode === "add") {
				if (!isInImageBounds(img.x, img.y)) return;
				if (isLeftClick(e))
					onAction({ type: "positive-prompt", imgX: img.x, imgY: img.y });
				if (isRightClick(e))
					onAction({ type: "negative-prompt", imgX: img.x, imgY: img.y });
				return;
			}

			// Select mode
			if (isLeftClick(e)) {
				if (!isInImageBounds(img.x, img.y)) return;
				mouseStateRef.current = {
					phase: "leftDown",
					startClientX: e.clientX,
					startClientY: e.clientY,
					startImgX: img.x,
					startImgY: img.y,
				};
			} else if (isRightClick(e)) {
				mouseStateRef.current = {
					phase: "rightPanning",
					lastClientX: e.clientX,
					lastClientY: e.clientY,
				};
				if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
			}
		},
		[mode, canvasRef, toImageCoords, isInImageBounds, onAction],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
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
		[canvasRef, toImageCoords, viewportRef, requestDraw],
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
			}

			mouseStateRef.current = { phase: "idle" };
			if (canvasRef.current) {
				canvasRef.current.style.cursor =
					mode === "add" ? "crosshair" : "default";
			}
		},
		[mode, canvasRef, toImageCoords, onAction, requestDraw],
	);

	// Cancel any in-progress gesture when the pointer leaves the canvas
	const handleMouseLeave = useCallback(() => {
		mouseStateRef.current = { phase: "idle" };
		selectionRectRef.current = null;
		if (canvasRef.current) {
			canvasRef.current.style.cursor = mode === "add" ? "crosshair" : "default";
		}
		requestDraw();
	}, [mode, canvasRef, requestDraw]);

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
