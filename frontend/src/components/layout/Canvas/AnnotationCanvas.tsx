import { useRef, useEffect, useCallback } from "react";
import {
	useAnnotationSession,
	useProject,
	useVisualizationSetting,
} from "../../../store";
import type {
	Annotation,
	BrushStroke,
	Point,
	PointPrompt,
} from "../../../types";

import {
	type Layers,
	buildLayers,
	buildLayersWithCachedMasks,
	updatePendingMaskLayer,
	hitTestMask,
	maskIntersectsRect,
	brushPercentToPixels,
	clampBrushPercent,
} from "../../../utils";
import {
	useCanvasInteraction,
	useCanvasImageDisplay,
	type CanvasAction,
} from "../../../hooks";

import { predictInstanceWithRegeneration } from "../../../services";
import styles from "./CanvasCommon.module.css";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnnotationCanvas() {
	const { projectState } = useProject();
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const { visualizationSettingState } = useVisualizationSetting();

	const mode = annotationSessionState.annotationMode;
	const promptMode = annotationSessionState.promptMode;
	const data =
		projectState.dataList[annotationSessionState.currentDataIndex] ?? null;

	const imageUrl = data?.imageData.imageUrl ?? null;

	// -------------------------------------------------------------------
	// Shared image-display hook — manages image loading, white balance,
	// viewport, zoom, and rAF scheduling.
	// -------------------------------------------------------------------
	const {
		canvasRef,
		containerRef,
		imageSizeRef,
		displayScaleRef,
		viewportRef,
		vizRef,
		imageSize,
		requestDraw,
		drawImageToContext,
	} = useCanvasImageDisplay(imageUrl);

	// -------------------------------------------------------------------
	// Rendering refs — updates don't trigger re-renders
	// -------------------------------------------------------------------
	const layersRef = useRef<Layers | null>(null);
	const pixelMasksRef = useRef<Uint8Array[] | null>(null);

	const modeRef = useRef(mode);
	modeRef.current = mode;

	const pointPromptsRef = useRef(annotationSessionState.pointPrompts);
	pointPromptsRef.current = annotationSessionState.pointPrompts;

	const promptModeRef = useRef(promptMode);
	promptModeRef.current = promptMode;

	const polygonPointsRef = useRef(annotationSessionState.polygonPoints);
	polygonPointsRef.current = annotationSessionState.polygonPoints;

	const editPointsRef = useRef<Point[]>(
		annotationSessionState.editPolygon?.points ?? [],
	);
	editPointsRef.current = annotationSessionState.editPolygon?.points ?? [];

	const editOriginalPointsRef = useRef<Point[]>(
		annotationSessionState.editPolygon?.originalPoints ?? [],
	);
	editOriginalPointsRef.current =
		annotationSessionState.editPolygon?.originalPoints ?? [];

	const editToolRef = useRef(annotationSessionState.editTool);
	editToolRef.current = annotationSessionState.editTool;

	// Brush size is stored as a % of the image's longer side; strokes and
	// the cursor work in image pixels.
	const brushSizePercent = annotationSessionState.brushSizePercent;
	const brushSizePx = brushPercentToPixels(
		brushSizePercent,
		data?.imageData.width ?? imageSize?.width ?? 0,
		data?.imageData.height ?? imageSize?.height ?? 0,
	);
	const brushSizeRef = useRef(brushSizePx);
	brushSizeRef.current = brushSizePx;

	const brushSizePercentRef = useRef(brushSizePercent);
	brushSizePercentRef.current = brushSizePercent;

	const brushStrokesRef = useRef(annotationSessionState.brushStrokes);
	brushStrokesRef.current = annotationSessionState.brushStrokes;

	const editBrushStrokesRef = useRef(
		annotationSessionState.editPolygon?.brushStrokes ?? [],
	);
	editBrushStrokesRef.current =
		annotationSessionState.editPolygon?.brushStrokes ?? [];

	const brushCursorRef = useRef<{ x: number; y: number } | null>(null);

	// Screen-sized scratch canvas used to preview edit-mode erasing.
	const editPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

	const pendingAnnotationRef = useRef(annotationSessionState.pendingMask);
	pendingAnnotationRef.current = annotationSessionState.pendingMask;

	const projectStateRef = useRef(projectState);
	projectStateRef.current = projectState;

	const activateLabelIDRef = useRef(annotationSessionState.activateLabel);
	activateLabelIDRef.current = annotationSessionState.activateLabel;

	// For hit-testing we need the current selection without stale closures
	const selectedAnnotationsRef = useRef(
		annotationSessionState.selectedAnnotations,
	);
	selectedAnnotationsRef.current = annotationSessionState.selectedAnnotations;

	// Track previous build dependencies to detect selection-only changes
	const prevBuildDepsRef = useRef<{
		data: typeof data;
		imageSize: typeof imageSize;
		hiddingLabels: typeof visualizationSettingState.hiddingLabels;
	} | null>(null);

	// -------------------------------------------------------------------
	// Core draw — reads everything from refs, safe to call from rAF
	// -------------------------------------------------------------------
	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const { scale, originX, originY } = viewportRef.current;
		const viz = vizRef.current;
		const currentMode = modeRef.current;

		const paintStrokes = (strokes: BrushStroke[]) => {
			if (strokes.length === 0) return;
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			ctx.strokeStyle = "rgba(20, 145, 255, 0.7)";
			ctx.fillStyle = "rgba(20, 145, 255, 0.7)";
			for (const stroke of strokes) {
				const w = stroke.width;
				const pts = stroke.points;
				if (pts.length === 0) continue;
				if (pts.length === 1) {
					ctx.beginPath();
					ctx.arc(pts[0].x, pts[0].y, w / 2, 0, Math.PI * 2);
					ctx.fill();
					continue;
				}
				ctx.beginPath();
				ctx.moveTo(pts[0].x, pts[0].y);
				for (let i = 1; i < pts.length; i++) {
					ctx.lineTo(pts[i].x, pts[i].y);
				}
				ctx.lineWidth = w;
				ctx.stroke();
			}
		};

		const tracePath = (
			target: CanvasRenderingContext2D,
			points: Point[],
			radius: number,
		) => {
			target.beginPath();
			if (points.length === 1) {
				target.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2);
				return;
			}
			target.moveTo(points[0].x, points[0].y);
			for (let i = 1; i < points.length; i++) {
				target.lineTo(points[i].x, points[i].y);
			}
		};

		const toPolygonPath = (points: Point[]) => {
			const path = new Path2D();
			points.forEach((p, i) =>
				i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y),
			);
			path.closePath();
			return path;
		};

		// Edit-mode preview of the changes on top of the saved mask (which is
		// drawn underneath as a normal annotation layer):
		//   - outline moved outward / brush strokes -> blue (added)
		//   - outline moved inward / eraser strokes -> red (removed)
		// Strokes apply in order, matching how the backend saves them.
		// Composited on a screen-sized scratch canvas so erasing does not
		// punch through the image underneath.
		const drawEditPreview = (
			target: CanvasRenderingContext2D,
			polygon: Point[],
			originalPolygon: Point[],
			strokes: BrushStroke[],
		) => {
			let off = editPreviewCanvasRef.current;
			if (!off) {
				off = document.createElement("canvas");
				editPreviewCanvasRef.current = off;
			}
			if (off.width !== canvas.width || off.height !== canvas.height) {
				off.width = canvas.width;
				off.height = canvas.height;
			}
			const octx = off.getContext("2d");
			if (!octx) return;

			octx.setTransform(1, 0, 0, 1, 0, 0);
			octx.clearRect(0, 0, off.width, off.height);
			octx.setTransform(
				scale,
				0,
				0,
				scale,
				-originX * scale,
				-originY * scale,
			);
			octx.lineCap = "round";
			octx.lineJoin = "round";

			const KEEP = "rgb(20, 145, 255)";
			const ERASED = "rgb(255, 51, 51)";

			// Area between the original and edited outlines (even-odd fill of
			// both = symmetric difference). Inside the new outline it was
			// added; outside it was removed.
			if (polygon !== originalPolygon) {
				const diff = new Path2D();
				if (originalPolygon.length >= 3)
					diff.addPath(toPolygonPath(originalPolygon));
				if (polygon.length >= 3) diff.addPath(toPolygonPath(polygon));
				octx.fillStyle = ERASED;
				octx.fill(diff, "evenodd");
				if (polygon.length >= 3) {
					octx.save();
					octx.clip(toPolygonPath(polygon));
					octx.fillStyle = KEEP;
					octx.fill(diff, "evenodd");
					octx.restore();
				}
			}

			for (const stroke of strokes) {
				if (stroke.points.length === 0) continue;
				const color = stroke.erase ? ERASED : KEEP;
				const passes: GlobalCompositeOperation[] = stroke.erase
					? ["destination-out", "source-over"]
					: ["source-over"];
				for (const op of passes) {
					octx.globalCompositeOperation = op;
					tracePath(octx, stroke.points, stroke.width / 2);
					if (stroke.points.length === 1) {
						octx.fillStyle = color;
						octx.fill();
					} else {
						octx.strokeStyle = color;
						octx.lineWidth = stroke.width;
						octx.stroke();
					}
				}
			}
			octx.globalCompositeOperation = "source-over";

			target.save();
			target.setTransform(1, 0, 0, 1, 0, 0);
			target.globalAlpha = 0.45;
			target.drawImage(off, 0, 0);
			target.restore();
		};

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.save();
		ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);

		// Image (all viz adjustments handled by the hook)
		drawImageToContext(ctx);

		// Annotation layers
		if (viz.showMasks && layersRef.current) {
			const { originalWidth: origW, originalHeight: origH } =
				displayScaleRef.current;
			ctx.globalAlpha = viz.maskOpacity;
			ctx.drawImage(layersRef.current.mask, 0, 0, origW, origH);
			ctx.globalAlpha = 1;
			ctx.drawImage(layersRef.current.border, 0, 0, origW, origH);
			ctx.drawImage(layersRef.current.text, 0, 0, origW, origH);
			ctx.globalAlpha = viz.pendingMaskOpacity;
			ctx.drawImage(layersRef.current.pendingMask, 0, 0, origW, origH);
			ctx.globalAlpha = 1;
		}

		// Selection rectangle (select mode only)
		if (currentMode === "select" && selectionRectRef.current) {
			const { startX, startY, endX, endY } = selectionRectRef.current;
			const x = Math.min(startX, endX);
			const y = Math.min(startY, endY);
			const w = Math.abs(endX - startX);
			const h = Math.abs(endY - startY);
			ctx.strokeStyle = "rgba(0, 120, 255, 0.9)";
			ctx.fillStyle = "rgba(0, 120, 255, 0.15)";
			ctx.lineWidth = 1 / scale;
			ctx.fillRect(x, y, w, h);
			ctx.strokeRect(x, y, w, h);
		}

		// Point prompts (add mode only)
		if (currentMode === "add") {
			const radius = 6 / scale;
			for (const prompt of pointPromptsRef.current) {
				ctx.beginPath();
				ctx.arc(prompt.x, prompt.y, radius, 0, 2 * Math.PI);
				ctx.fillStyle = prompt.type === "positive" ? "#00cc44" : "#ff3333";
				ctx.fill();
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 1.5 / scale;
				ctx.stroke();
				ctx.closePath();
			}
		}

		// Polygon vertices & edges (add mode, polygon prompt)
		if (currentMode === "add" && promptModeRef.current === "polygon") {
			const pts = polygonPointsRef.current;
			if (pts.length > 1) {
				const start = pts[0];

				// Live preview of the resulting mask: fill the closed polygon.
				// Canvas fill() is GPU-accelerated and O(vertices) — effectively
				// free even when redrawn every frame, unlike a backend round-trip
				// + RLE decode + layer rebuild.
				if (pts.length >= 3) {
					ctx.beginPath();
					ctx.moveTo(start.x, start.y);
					for (let i = 1; i < pts.length; i++) {
						ctx.lineTo(pts[i].x, pts[i].y);
					}
					ctx.closePath();
					ctx.fillStyle = "rgba(20, 145, 255, 0.4)"; // pending-mask blue
					ctx.fill();
				}

				// Polygon outline
				ctx.beginPath();
				ctx.moveTo(start.x, start.y);
				for (let i = 1; i < pts.length; i++) {
					ctx.lineTo(pts[i].x, pts[i].y);
				}
				ctx.strokeStyle = "#00cc44";
				ctx.lineWidth = 2 / scale;
				ctx.stroke();
			}
			const radius = 5 / scale;
			for (const p of pts) {
				ctx.beginPath();
				ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
				ctx.fillStyle = "#00cc44";
				ctx.fill();
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 1.5 / scale;
				ctx.stroke();
				ctx.closePath();
			}
		}

		// Editable polygon (edit mode)
		if (currentMode === "edit") {
			const pts = editPointsRef.current;
			drawEditPreview(
				ctx,
				pts,
				editOriginalPointsRef.current,
				editBrushStrokesRef.current,
			);
			if (pts.length > 1) {
				const start = pts[0];

				ctx.beginPath();
				ctx.moveTo(start.x, start.y);
				for (let i = 1; i < pts.length; i++) {
					ctx.lineTo(pts[i].x, pts[i].y);
				}
				ctx.strokeStyle = "#1491ff";
				ctx.lineWidth = 2 / scale;
				ctx.stroke();
			}

			// Vertex handles are shown only in the vertex tool; in brush tool the
			// polygon outline stays but the draggable vertices hide.
			if (editToolRef.current === "vertex") {
				const radius = 6 / scale;
				for (const p of pts) {
					ctx.beginPath();
					ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
					ctx.fillStyle = "#ffffff";
					ctx.fill();
					ctx.strokeStyle = "#1491ff";
					ctx.lineWidth = 2 / scale;
					ctx.stroke();
					ctx.closePath();
				}
			}
		}

		// Brush strokes (add mode, brush prompt)
		if (currentMode === "add" && promptModeRef.current === "brush") {
			paintStrokes(brushStrokesRef.current);
		}

		// Brush size cursor
		const brushActive =
			(currentMode === "add" && promptModeRef.current === "brush") ||
			(currentMode === "edit" && editToolRef.current !== "vertex");
		const erasing =
			currentMode === "edit" && editToolRef.current === "eraser";
		if (brushActive && brushCursorRef.current) {
			const w = brushSizeRef.current;
			ctx.beginPath();
			ctx.arc(
				brushCursorRef.current.x,
				brushCursorRef.current.y,
				w / 2,
				0,
				Math.PI * 2,
			);
			ctx.strokeStyle = erasing ? "#ff3333" : "#1491ff";
			ctx.lineWidth = 1.5 / scale;
			ctx.setLineDash([4 / scale, 4 / scale]);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		ctx.restore();
	}, [canvasRef, viewportRef, vizRef, displayScaleRef, drawImageToContext]);

	// Stable wrapper that avoids re-creating the rAF callback on every draw change
	const scheduleDraw = useCallback(
		() => requestDraw(draw),
		[requestDraw, draw],
	);

	// -------------------------------------------------------------------
	// Canvas action handler — translates CanvasAction into state changes
	// -------------------------------------------------------------------
	const onCanvasAction = useCallback(
		(action: CanvasAction) => {
			const masks = pixelMasksRef.current;
			const annotations = data?.annotations ?? [];
			const { width, height } = imageSizeRef.current;

			switch (action.type) {
				case "hit-test":
					if (!masks) {
						annotationSessionDispatch({ type: "CLEAR_SELECTION" });
						return;
					}
					let hit: Annotation | null = null;
					for (let i = 0; i < annotations.length; i++) {
						if (hitTestMask(masks[i], width, action.imgX, action.imgY)) {
							hit = annotations[i];
							break;
						}
					}
					if (hit) {
						annotationSessionDispatch({
							type: "TOGGLE_ANNOTATION_SELECTION",
							payload: { annIds: [hit.id] },
						});
					}
					break;
				case "rect-select":
					if (!masks) {
						return;
					}

					const selectedIds = annotations
						.map((ann) => ann.id)
						.filter((_, i) =>
							maskIntersectsRect(
								masks[i],
								width,
								height,
								action.x0,
								action.y0,
								action.x1,
								action.y1,
							),
						);

					annotationSessionDispatch({
						type: "TOGGLE_ANNOTATION_SELECTION",
						payload: { annIds: selectedIds },
					});
					break;
				case "positive-prompt":
				case "negative-prompt": {
					const promptType: PointPrompt["type"] =
						action.type === "positive-prompt" ? "positive" : "negative";
					const newPrompt: PointPrompt = {
						x: action.imgX,
						y: action.imgY,
						type: promptType,
					};
					annotationSessionDispatch({
						type: "ADD_POINT_PROMPT",
						payload: newPrompt,
					});
					scheduleDraw();

					const sessionId = projectStateRef.current.sessionId;
					if (sessionId && data) {
						const stem = data.imageData.imageName.replace(/\.[^.]+$/, "");
						// pointPromptsRef hasn't updated yet (dispatch is async), so append manually
						const allPrompts = [...pointPromptsRef.current, newPrompt];
						const maskInput = pendingAnnotationRef.current?.encodedLogit;

						predictInstanceWithRegeneration(
							{ sessionId, stem, inputPrompts: allPrompts, maskInput },
							data.imageData.imageUrl,
							{
								onComplete: (response) => {
									annotationSessionDispatch({
										type: "SET_PENDING_MASK",
										payload: {
											segmentation: response.mask,
											labelId: activateLabelIDRef.current?.id ?? -1,
											id: -1,
											encodedLogit: response.bestMaskLogit,
										},
										promptCount: allPrompts.length,
									});
								},
								onError: (error) => {
									console.error("SAM inference failed:", error);
								},
							},
						);
					}
					break;
				}
				case "add-polygon-vertex": {
					annotationSessionDispatch({
						type: "ADD_POLYGON_VERTEX",
						payload: { x: action.imgX, y: action.imgY },
					});
					scheduleDraw();
					break;
				}
				case "move-edit-vertex": {
					const next = editPointsRef.current.slice();
					next[action.vertexIndex] = { x: action.imgX, y: action.imgY };
					annotationSessionDispatch({
						type: "SET_EDIT_POLYGON_POINTS",
						payload: next,
					});
					scheduleDraw();
					break;
				}
				case "begin-edit-vertex-drag":
					annotationSessionDispatch({ type: "CHECKPOINT_EDIT" });
					break;
				case "add-edit-vertex": {
					annotationSessionDispatch({ type: "CHECKPOINT_EDIT" });
					const next = editPointsRef.current.slice();
					next.splice(action.edgeIndex + 1, 0, {
						x: action.imgX,
						y: action.imgY,
					});
					annotationSessionDispatch({
						type: "SET_EDIT_POLYGON_POINTS",
						payload: next,
					});
					scheduleDraw();
					break;
				}
				case "brush-stroke-start": {
					const stroke: BrushStroke = {
						points: [{ x: action.imgX, y: action.imgY }],
						width: brushSizeRef.current,
						erase:
							modeRef.current === "edit" &&
							editToolRef.current === "eraser",
					};
					if (modeRef.current === "edit") {
						annotationSessionDispatch({
							type: "ADD_EDIT_BRUSH_STROKE",
							payload: stroke,
						});
					} else {
						annotationSessionDispatch({
							type: "ADD_BRUSH_STROKE",
							payload: stroke,
						});
					}
					scheduleDraw();
					break;
				}
				case "brush-stroke-move": {
					const point = { x: action.imgX, y: action.imgY };
					if (modeRef.current === "edit") {
						annotationSessionDispatch({
							type: "APPEND_EDIT_BRUSH_POINT",
							payload: point,
						});
					} else {
						annotationSessionDispatch({
							type: "APPEND_BRUSH_POINT",
							payload: point,
						});
					}
					scheduleDraw();
					break;
				}
				case "brush-stroke-end":
					// Stroke already committed incrementally; nothing more to do.
					break;
				default:
					console.warn("Unknown canvas action:", action);
					return;
			}
		},
		[data, annotationSessionDispatch, scheduleDraw],
	);

	// -------------------------------------------------------------------
	// Canvas interaction hook
	// -------------------------------------------------------------------
	const {
		selectionRectRef,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseLeave,
		handleContextMenu,
	} = useCanvasInteraction(
		mode,
		promptMode,
		annotationSessionState.editTool,
		brushSizePx,
		editPointsRef,
		brushCursorRef,
		canvasRef,
		viewportRef,
		imageSizeRef,
		scheduleDraw,
		onCanvasAction,
	);

	// ==================================================================
	// Effects (annotation-specific; image/viewport/zoom effects live in
	// the useCanvasImageDisplay hook)
	// ==================================================================

	// Rebuild layers when data or image size changes
	useEffect(() => {
		if (!data || !imageSize) {
			layersRef.current = null;
			pixelMasksRef.current = null;
			prevBuildDepsRef.current = null;
			scheduleDraw();
			return;
		}

		const prev = prevBuildDepsRef.current;
		const selectionOnlyChanged =
			prev !== null &&
			prev.data === data &&
			prev.imageSize === imageSize &&
			prev.hiddingLabels === visualizationSettingState.hiddingLabels;

		prevBuildDepsRef.current = {
			data,
			imageSize,
			hiddingLabels: visualizationSettingState.hiddingLabels,
		};

		// Fast path: when only selectedAnnotations changed, reuse cached pixelMasks
		if (selectionOnlyChanged && pixelMasksRef.current) {
			const layers = buildLayersWithCachedMasks(
				data,
				pixelMasksRef.current,
				annotationSessionState.selectedAnnotations,
				visualizationSettingState,
				displayScaleRef.current,
			);
			layersRef.current = layers;
			updatePendingMaskLayer(
				layers.pendingMask,
				pendingAnnotationRef.current,
				displayScaleRef.current,
			);
			scheduleDraw();
			return;
		}

		// Full rebuild when data, image size, or hidden labels changed
		let cancelled = false;
		buildLayers(
			data,
			annotationSessionState.selectedAnnotations,
			visualizationSettingState,
			displayScaleRef.current,
		)
			.then(({ layers, pixelMasks }) => {
				if (!cancelled) {
					layersRef.current = layers;
					pixelMasksRef.current = pixelMasks;
					updatePendingMaskLayer(
						layers.pendingMask,
						pendingAnnotationRef.current,
						displayScaleRef.current,
					);
					scheduleDraw();
				}
			})
			.catch((err) => {
				console.error("Failed to build layers:", err);
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		data,
		imageSize,
		annotationSessionState.selectedAnnotations,
		visualizationSettingState.hiddingLabels,
		scheduleDraw,
	]);

	// Repaint pending mask layer when it changes (cheap — single RLE decode, no full rebuild)
	useEffect(() => {
		if (!layersRef.current) return;
		updatePendingMaskLayer(
			layersRef.current.pendingMask,
			annotationSessionState.pendingMask,
			displayScaleRef.current,
		);
		scheduleDraw();
	}, [annotationSessionState.pendingMask, scheduleDraw]);

	// Redraw when visualization settings, prompts, brush size, or mode change
	useEffect(() => {
		const brushActive =
			(mode === "add" && promptMode === "brush") ||
			(mode === "edit" && annotationSessionState.editTool !== "vertex");
		if (canvasRef.current) {
			canvasRef.current.style.cursor = brushActive
				? "none"
				: mode === "add"
					? "crosshair"
					: "default";
		}
		scheduleDraw();
	}, [
		visualizationSettingState,
		annotationSessionState.pointPrompts,
		brushSizePx,
		annotationSessionState.editTool,
		mode,
		promptMode,
		scheduleDraw,
	]);

	// Redraw when prompt/edit geometry changes from outside the canvas
	// (undo, reset, save via keyboard or buttons). Canvas mouse actions
	// already schedule their own draw; requestDraw coalesces to one per frame.
	useEffect(() => {
		scheduleDraw();
	}, [
		annotationSessionState.polygonPoints,
		annotationSessionState.brushStrokes,
		annotationSessionState.editPolygon,
		scheduleDraw,
	]);

	// Adjust brush size with Ctrl+wheel while a brush tool is active.
	// Capture-phase listener on the container runs before the canvas zoom
	// wheel handler and stops propagation so Ctrl+wheel scales the brush
	// instead of zooming the image. A plain wheel still zooms.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const onWheel = (e: WheelEvent) => {
			// Plain wheel zooms (handled by the canvas); Ctrl+wheel resizes
			// the brush while a brush tool is active.
			if (!(e.ctrlKey || e.metaKey)) return;
			const brushActive =
				modeRef.current === "edit"
					? editToolRef.current !== "vertex"
					: modeRef.current === "add" && promptModeRef.current === "brush";
			if (!brushActive) return;
			e.preventDefault();
			e.stopPropagation();
			// Finer steps for small brushes, coarser for large ones (in %).
			const current = brushSizePercentRef.current;
			const step = current < 2 ? 0.1 : 0.5;
			const next = clampBrushPercent(
				current + (e.deltaY < 0 ? step : -step),
			);
			annotationSessionDispatch({ type: "SET_BRUSH_SIZE", payload: next });
		};
		container.addEventListener("wheel", onWheel, {
			capture: true,
			passive: false,
		});
		return () => container.removeEventListener("wheel", onWheel);
	}, [annotationSessionDispatch, containerRef]);

	// -------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------
	return (
		<div
			ref={containerRef}
			style={{ position: "relative", flex: 1, overflow: "hidden" }}
		>
			<div className={styles.canvasContainer}>
				<canvas
					ref={canvasRef}
					className={styles.canvas}
					style={{
						cursor:
							(mode === "add" && promptMode === "brush") ||
							(mode === "edit" && annotationSessionState.editTool !== "vertex")
								? "none"
								: mode === "add"
									? "crosshair"
									: "default",
						display: "block",
					}}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseLeave}
					onContextMenu={handleContextMenu}
				/>
			</div>
		</div>
	);
}
