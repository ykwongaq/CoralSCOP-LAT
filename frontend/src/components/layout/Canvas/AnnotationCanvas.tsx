import { useRef, useEffect, useCallback } from "react";
import {
	useAnnotationSession,
	useProject,
	useVisualizationSetting,
} from "../../../store";
import type { Annotation, PointPrompt } from "../../../types";

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

import { predictInstance } from "../../../services";
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

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.save();
		ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);

		// Image (all viz adjustments handled by the hook)
		drawImageToContext(ctx);

		// Annotation layers
		if (viz.showMasks && layersRef.current) {
			const { originalWidth: origW, originalHeight: origH } = displayScaleRef.current;
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

						predictInstance(
							{ sessionId, stem, inputPrompts: allPrompts, maskInput },
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
		const selectionOnlyChanged = prev !== null &&
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
		buildLayers(data, annotationSessionState.selectedAnnotations, visualizationSettingState, displayScaleRef.current)
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

	// Redraw when visualization settings, point prompts, or mode changes
	useEffect(() => {
		if (canvasRef.current) {
			canvasRef.current.style.cursor = mode === "add" ? "crosshair" : "default";
		}
		scheduleDraw();
	}, [
		visualizationSettingState,
		annotationSessionState.pointPrompts,
		mode,
		scheduleDraw,
	]);

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
						cursor: mode === "add" ? "crosshair" : "default",
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
