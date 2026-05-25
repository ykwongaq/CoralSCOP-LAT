import { useRef, useEffect, useCallback, useState } from "react";
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
	computeDisplayScale,
	type DisplayScale,
} from "../../../utils";
import { useCanvasInteraction, type CanvasAction } from "../../../hooks";

import { predictInstance } from "../../../services";
import styles from "./CanvasCommon.module.css";

type Viewport = {
	scale: number;
	originX: number;
	originY: number;
};

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

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// -----------------------------------------------------------------------
	// Rendering refs — updates don't trigger re-renders
	// -----------------------------------------------------------------------
	const imageRef = useRef<HTMLImageElement | null>(null);
	const imageSizeRef = useRef({ width: 0, height: 0 });
	const displayScaleRef = useRef<DisplayScale>(computeDisplayScale(0, 0));
	const viewportRef = useRef<Viewport>({ scale: 1, originX: 0, originY: 0 });
	const layersRef = useRef<Layers | null>(null);
	const pixelMasksRef = useRef<Uint8Array[] | null>(null);

	// Live refs so draw() always reads the latest value without re-subscribing
	const vizRef = useRef(visualizationSettingState);
	vizRef.current = visualizationSettingState;

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

	const rafRef = useRef(0);

	const [imageSize, setImageSize] = useState<{
		width: number;
		height: number;
	} | null>(null);

	// Track previous build dependencies to detect selection-only changes
	const prevBuildDepsRef = useRef<{
		data: typeof data;
		imageSize: typeof imageSize;
		hiddingLabels: typeof visualizationSettingState.hiddingLabels;
	} | null>(null);

	// -----------------------------------------------------------------------
	// Core draw — reads everything from refs, safe to call from rAF
	// -----------------------------------------------------------------------
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

		// Image
		if (imageRef.current) {
			ctx.drawImage(imageRef.current, 0, 0);
		}

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
	}, []);

	const requestDraw = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(draw);
	}, [draw]);

	// -----------------------------------------------------------------------
	// Canvas action handler — translates CanvasAction into state changes
	// -----------------------------------------------------------------------
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
					requestDraw();

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
		[data, annotationSessionDispatch, requestDraw],
	);

	// -----------------------------------------------------------------------
	// Canvas interaction hook
	// -----------------------------------------------------------------------
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
		requestDraw,
		onCanvasAction,
	);

	// -----------------------------------------------------------------------
	// Viewport reset — fits image into canvas with letterboxing
	// -----------------------------------------------------------------------
	const resetViewport = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width;
		canvas.height = rect.height;

		const { width: imgW, height: imgH } = imageSizeRef.current;
		if (imgW === 0 || imgH === 0) {
			return;
		}

		const scale = Math.min(rect.width / imgW, rect.height / imgH);
		const originX = -(rect.width / scale - imgW) / 2;
		const originY = -(rect.height / scale - imgH) / 2;

		viewportRef.current = { scale, originX, originY };
		requestDraw();
	}, [requestDraw]);

	// -----------------------------------------------------------------------
	// Effects
	// -----------------------------------------------------------------------

	// Load image when URL changes
	const imageUrl = data?.imageData.imageUrl ?? null;
	useEffect(() => {
		if (!imageUrl) {
			imageRef.current = null;
			setImageSize(null);
			return;
		}
		const img = new Image();
		img.onload = () => {
			imageRef.current = img;
			displayScaleRef.current = computeDisplayScale(img.naturalWidth, img.naturalHeight);
			const size = { width: img.naturalWidth, height: img.naturalHeight };
			imageSizeRef.current = size;
			setImageSize(size);
		};
		img.onerror = () => {};
		img.src = imageUrl;
	}, [imageUrl]);

	// Reset viewport after image loads
	useEffect(() => {
		if (!imageSize) {
			requestDraw();
			return;
		}
		resetViewport();
	}, [imageSize, resetViewport, requestDraw]);

	// Rebuild layers when data or image size changes
	useEffect(() => {
		if (!data || !imageSize) {
			layersRef.current = null;
			pixelMasksRef.current = null;
			prevBuildDepsRef.current = null;
			requestDraw();
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
			requestDraw();
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
					requestDraw();
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
		requestDraw,
	]);

	// Repaint pending mask layer when it changes (cheap — single RLE decode, no full rebuild)
	useEffect(() => {
		if (!layersRef.current) return;
		updatePendingMaskLayer(
			layersRef.current.pendingMask,
			annotationSessionState.pendingMask,
			displayScaleRef.current,
		);
		requestDraw();
	}, [annotationSessionState.pendingMask, requestDraw]);

	// Redraw when visualization settings, point prompts, or mode changes
	useEffect(() => {
		if (canvasRef.current) {
			canvasRef.current.style.cursor = mode === "add" ? "crosshair" : "default";
		}
		requestDraw();
	}, [
		visualizationSettingState,
		annotationSessionState.pointPrompts,
		mode,
		requestDraw,
	]);

	// Window resize
	useEffect(() => {
		window.addEventListener("resize", resetViewport);
		return () => window.removeEventListener("resize", resetViewport);
	}, [resetViewport]);

	// Cancel pending rAF on unmount
	useEffect(() => {
		return () => cancelAnimationFrame(rafRef.current);
	}, []);

	// -----------------------------------------------------------------------
	// Wheel zoom — native listener (needs passive:false for preventDefault)
	// -----------------------------------------------------------------------
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			e.preventDefault();
			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const rect = canvas.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const { scale, originX, originY } = viewportRef.current;
			const zoom = e.deltaY < 0 ? 1.1 : 0.9;
			const newScale = Math.max(0.05, Math.min(50, scale * zoom));

			viewportRef.current = {
				scale: newScale,
				originX: mouseX / scale + originX - mouseX / newScale,
				originY: mouseY / scale + originY - mouseY / newScale,
			};
			requestDraw();
		},
		[requestDraw],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.addEventListener("wheel", handleWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", handleWheel);
	}, [handleWheel]);

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------
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
