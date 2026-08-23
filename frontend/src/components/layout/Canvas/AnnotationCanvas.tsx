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

	const editToolRef = useRef(annotationSessionState.editTool);
	editToolRef.current = annotationSessionState.editTool;

	const brushSizeRef = useRef(annotationSessionState.brushSize);
	brushSizeRef.current = annotationSessionState.brushSize;

	const brushStrokesRef = useRef(annotationSessionState.brushStrokes);
	brushStrokesRef.current = annotationSessionState.brushStrokes;

	const editBrushStrokesRef = useRef(
		annotationSessionState.editPolygon?.brushStrokes ?? [],
	);
	editBrushStrokesRef.current =
		annotationSessionState.editPolygon?.brushStrokes ?? [];

	const brushCursorRef = useRef<{ x: number; y: number } | null>(null);

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
			if (pts.length > 1) {
				const start = pts[0];

				if (pts.length >= 3) {
					ctx.beginPath();
					ctx.moveTo(start.x, start.y);
					for (let i = 1; i < pts.length; i++) {
						ctx.lineTo(pts[i].x, pts[i].y);
					}
					ctx.closePath();
					ctx.fillStyle = "rgba(20, 145, 255, 0.25)";
					ctx.fill();
				}

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

		// Brush strokes painted while editing
		if (currentMode === "edit") {
			paintStrokes(editBrushStrokesRef.current);
		}

		// Brush size cursor
		const brushActive =
			(currentMode === "add" && promptModeRef.current === "brush") ||
			(currentMode === "edit" && editToolRef.current === "brush");
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
			ctx.strokeStyle = "#1491ff";
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
				case "add-edit-vertex": {
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
		annotationSessionState.brushSize,
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
			(mode === "edit" && annotationSessionState.editTool === "brush");
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
		annotationSessionState.brushSize,
		annotationSessionState.editTool,
		mode,
		promptMode,
		scheduleDraw,
	]);

	// Adjust brush size with the mouse wheel while a brush tool is active.
	// Capture-phase listener on the container runs before the canvas zoom
	// wheel handler and stops propagation so painting mode scales the brush
	// instead of zooming the image.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const onWheel = (e: WheelEvent) => {
			const brushActive =
				modeRef.current === "edit"
					? editToolRef.current === "brush"
					: modeRef.current === "add" && promptModeRef.current === "brush";
			if (!brushActive) return;
			e.preventDefault();
			e.stopPropagation();
			const delta = e.deltaY < 0 ? 2 : -2;
			const next = Math.max(2, Math.min(200, brushSizeRef.current + delta));
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
							(mode === "edit" && annotationSessionState.editTool === "brush")
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
