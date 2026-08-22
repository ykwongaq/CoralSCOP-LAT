import {
	useRef,
	useEffect,
	useCallback,
	forwardRef,
	useImperativeHandle,
} from "react";

import { useVisualizationSetting } from "../../../store";
import { type Data, type Annotation, type Point } from "../../../types";
import {
	type Layers,
	buildLayers,
	buildLayersWithCachedMasks,
	hitTestMask,
	maskIntersectsRect,
} from "../../../utils";
import {
	useCanvasInteraction,
	useCanvasImageDisplay,
	type CanvasAction,
} from "../../../hooks";
import styles from "./CanvasCommon.module.css";

interface Props {
	data: Data | null;
	selectedIds: number[];
	onSelectIds: (ids: number[]) => void;
}

export interface StatisticCanvasRef {
	resetViewport: () => void;
	zoomIn: () => void;
	zoomOut: () => void;
}

const StatisticCanvas = forwardRef<StatisticCanvasRef, Props>(
	function StatisticCanvas({ data, selectedIds, onSelectIds }, ref) {
		const { visualizationSettingState } = useVisualizationSetting();

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
			resetViewport,
			drawImageToContext,
			zoomAt,
		} = useCanvasImageDisplay(imageUrl);

		const layersRef = useRef<Layers | null>(null);
		const pixelMasksRef = useRef<Uint8Array[] | null>(null);
		const editPointsRef = useRef<Point[]>([]);

		// Track previous build dependencies to detect selection-only changes
		const prevBuildDepsRef = useRef<{
			data: typeof data;
			imageSize: typeof imageSize;
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

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.save();
			ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);

			// Image (all viz adjustments handled by the hook)
			drawImageToContext(ctx);

			if (viz.showMasks && layersRef.current) {
				const { originalWidth: origW, originalHeight: origH } =
					displayScaleRef.current;
				ctx.globalAlpha = viz.maskOpacity;
				ctx.drawImage(layersRef.current.mask, 0, 0, origW, origH);
				ctx.globalAlpha = 1;
				ctx.drawImage(layersRef.current.border, 0, 0, origW, origH);
				ctx.drawImage(layersRef.current.text, 0, 0, origW, origH);
			}

			if (selectionRectRef.current) {
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

			ctx.restore();
		}, [canvasRef, viewportRef, vizRef, displayScaleRef, drawImageToContext]);

		// Stable wrapper that avoids re-creating the rAF callback on every draw change
		const scheduleDraw = useCallback(
			() => requestDraw(draw),
			[requestDraw, draw],
		);

		// -------------------------------------------------------------------
		// Canvas action handler
		// -------------------------------------------------------------------
		const onCanvasAction = useCallback(
			(action: CanvasAction) => {
				const masks = pixelMasksRef.current;
				const annotations = data?.annotations ?? [];
				const { width, height } = imageSizeRef.current;

				switch (action.type) {
					case "hit-test": {
						if (!masks) {
							onSelectIds([]);
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
							onSelectIds([hit.id]);
						} else {
							onSelectIds([]);
						}
						break;
					}
					case "rect-select": {
						if (!masks) return;
						const ids = annotations
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
						// Only select the last (top-most) annotation in the rect
						const lastId = ids.length > 0 ? ids[ids.length - 1] : null;
						onSelectIds(lastId ? [lastId] : []);
						break;
					}
					default:
						return;
				}
			},
			[data, onSelectIds],
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
			"select",
			"point",
			editPointsRef,
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
				prev !== null && prev.data === data && prev.imageSize === imageSize;

			prevBuildDepsRef.current = {
				data,
				imageSize,
			};

			// Fast path: when only selectedIds changed, reuse cached pixelMasks
			if (selectionOnlyChanged && pixelMasksRef.current) {
				const layers = buildLayersWithCachedMasks(
					data,
					pixelMasksRef.current,
					selectedIds,
					visualizationSettingState,
					displayScaleRef.current,
				);
				layersRef.current = layers;
				scheduleDraw();
				return;
			}

			// Full rebuild when data or image size changed
			let cancelled = false;
			buildLayers(
				data,
				selectedIds,
				visualizationSettingState,
				displayScaleRef.current,
			)
				.then(({ layers, pixelMasks }) => {
					if (!cancelled) {
						layersRef.current = layers;
						pixelMasksRef.current = pixelMasks;
						scheduleDraw();
					}
				})
				.catch((err) => console.error("Failed to build layers:", err));
			return () => {
				cancelled = true;
			};
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [data, imageSize, selectedIds, scheduleDraw]);

		// Redraw when any visualization setting changes
		useEffect(() => {
			scheduleDraw();
		}, [visualizationSettingState, scheduleDraw]);

		// -------------------------------------------------------------------
		// Imperative handle (zoom controls for the parent toolbar)
		// -------------------------------------------------------------------
		useImperativeHandle(
			ref,
			() => ({
				resetViewport,
				zoomIn: () => {
					const canvas = canvasRef.current;
					if (!canvas) return;
					const rect = canvas.getBoundingClientRect();
					zoomAt(1.2, rect.width / 2, rect.height / 2);
				},
				zoomOut: () => {
					const canvas = canvasRef.current;
					if (!canvas) return;
					const rect = canvas.getBoundingClientRect();
					zoomAt(1 / 1.2, rect.width / 2, rect.height / 2);
				},
			}),
			[resetViewport, zoomAt, canvasRef],
		);

		// -------------------------------------------------------------------
		// Render
		// -------------------------------------------------------------------
		return (
			<div
				ref={containerRef}
				style={{ position: "relative", flex: 1, overflow: "hidden" }}
			>
				<div
					className={styles.canvasContainer}
					style={{ backgroundColor: "var(--surface-surface-primary3)" }}
				>
					<canvas
						ref={canvasRef}
						className={styles.canvas}
						style={{ cursor: "default", display: "block" }}
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={handleMouseUp}
						onMouseLeave={handleMouseLeave}
						onContextMenu={handleContextMenu}
					/>
				</div>
			</div>
		);
	},
);

export default StatisticCanvas;
