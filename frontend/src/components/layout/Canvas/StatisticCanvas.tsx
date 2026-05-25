import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";

import { useVisualizationSetting } from "../../../store";
import { type Data, type Annotation } from "../../../types";
import {
	type Layers,
	buildLayers,
	buildLayersWithCachedMasks,
	hitTestMask,
	maskIntersectsRect,
	computeDisplayScale,
	type DisplayScale,
} from "../../../utils";
import { useCanvasInteraction, type CanvasAction } from "../../../hooks";
import styles from "./CanvasCommon.module.css";
type Viewport = { scale: number; originX: number; originY: number };

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

const StatisticCanvas = forwardRef<StatisticCanvasRef, Props>(function StatisticCanvas({
	data,
	selectedIds,
	onSelectIds,
}, ref) {
	const { visualizationSettingState } = useVisualizationSetting();

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const imageSizeRef = useRef({ width: 0, height: 0 });
	const displayScaleRef = useRef<DisplayScale>(computeDisplayScale(0, 0));
	const viewportRef = useRef<Viewport>({ scale: 1, originX: 0, originY: 0 });
	const layersRef = useRef<Layers | null>(null);
	const pixelMasksRef = useRef<Uint8Array[] | null>(null);

	const vizRef = useRef(visualizationSettingState);
	vizRef.current = visualizationSettingState;

	const rafRef = useRef(0);
	const [imageSize, setImageSize] = useState<{
		width: number;
		height: number;
	} | null>(null);

	// Track previous build dependencies to detect selection-only changes
	const prevBuildDepsRef = useRef<{
		data: typeof data;
		imageSize: typeof imageSize;
	} | null>(null);

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

		if (imageRef.current) {
			ctx.drawImage(imageRef.current, 0, 0);
		}

		if (viz.showMasks && layersRef.current) {
			const { originalWidth: origW, originalHeight: origH } = displayScaleRef.current;
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
	}, []);

	const requestDraw = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(draw);
	}, [draw]);

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
					// Only select the last (top-most) annotation in the rect
					const lastId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
					onSelectIds(lastId ? [lastId] : []);
					break;
				}
				default:
					return;
			}
		},
		[data, onSelectIds],
	);

	const {
		selectionRectRef,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseLeave,
		handleContextMenu,
	} = useCanvasInteraction(
		"select",
		canvasRef,
		viewportRef,
		imageSizeRef,
		requestDraw,
		onCanvasAction,
	);

	const resetViewport = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const width = Math.round(rect.width);
		const height = Math.round(rect.height);

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}

		const { width: imgW, height: imgH } = imageSizeRef.current;
		if (imgW === 0 || imgH === 0) return;

		const scale = Math.min(width / imgW, height / imgH);
		const originX = -(width / scale - imgW) / 2;
		const originY = -(height / scale - imgH) / 2;
		viewportRef.current = { scale, originX, originY };
		requestDraw();
	}, [requestDraw]);

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

	useEffect(() => {
		if (!imageSize) {
			requestDraw();
			return;
		}
		resetViewport();
	}, [imageSize, resetViewport, requestDraw]);

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
			prev.imageSize === imageSize;

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
			requestDraw();
			return;
		}

		// Full rebuild when data or image size changed
		let cancelled = false;
		buildLayers(data, selectedIds, visualizationSettingState, displayScaleRef.current)
			.then(({ layers, pixelMasks }) => {
				if (!cancelled) {
					layersRef.current = layers;
					pixelMasksRef.current = pixelMasks;
					requestDraw();
				}
			})
			.catch((err) => console.error("Failed to build layers:", err));
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, imageSize, selectedIds, requestDraw]);

	useEffect(() => {
		requestDraw();
	}, [visualizationSettingState, requestDraw]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const resizeObserver = new ResizeObserver(() => {
			resetViewport();
		});

		resizeObserver.observe(canvas);
		return () => resizeObserver.disconnect();
	}, [resetViewport]);

	useImperativeHandle(ref, () => ({
		resetViewport,
		zoomIn: () => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const mouseX = rect.width / 2;
			const mouseY = rect.height / 2;
			const { scale, originX, originY } = viewportRef.current;
			const newScale = Math.min(50, scale * 1.2);
			viewportRef.current = {
				scale: newScale,
				originX: mouseX / scale + originX - mouseX / newScale,
				originY: mouseY / scale + originY - mouseY / newScale,
			};
			requestDraw();
		},
		zoomOut: () => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const mouseX = rect.width / 2;
			const mouseY = rect.height / 2;
			const { scale, originX, originY } = viewportRef.current;
			const newScale = Math.max(0.05, scale / 1.2);
			viewportRef.current = {
				scale: newScale,
				originX: mouseX / scale + originX - mouseX / newScale,
				originY: mouseY / scale + originY - mouseY / newScale,
			};
			requestDraw();
		},
	}), [resetViewport, requestDraw]);

	useEffect(() => {
		return () => cancelAnimationFrame(rafRef.current);
	}, []);

	const handleWheel = useCallback(
		(e: WheelEvent) => {
			e.preventDefault();
			const canvas = canvasRef.current;
			if (!canvas) return;
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
});

export default StatisticCanvas;
