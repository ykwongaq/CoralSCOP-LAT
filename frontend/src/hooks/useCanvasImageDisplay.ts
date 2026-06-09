import { useRef, useEffect, useCallback, useState } from "react";
import { useVisualizationSetting } from "../store";
import {
	getImageDisplayFilter,
	hasWhiteBalanceAdjustment,
	createWhiteBalancedImage,
	computeDisplayScale,
	type DisplayScale,
} from "../utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Viewport = {
	scale: number;
	originX: number;
	originY: number;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Shared hook that manages everything needed to display an image on a canvas
 * with visualization adjustments (brightness, contrast, saturation,
 * temperature, tint), viewport management (fit-to-container, zoom, pan),
 * and rAF-based draw scheduling.
 *
 * Three canvas components (AnnotationCanvas, ScaledLineCanvas,
 * StatisticCanvas) previously duplicated this logic.  This hook is the
 * single source of truth.
 */
export function useCanvasImageDisplay(imageUrl: string | null) {
	const { visualizationSettingState } = useVisualizationSetting();

	// ------------------------------------------------------------------
	// Refs — stable across renders, safe to read from rAF callbacks
	// ------------------------------------------------------------------
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const wbImageRef = useRef<HTMLCanvasElement | null>(null);
	const imageSizeRef = useRef({ width: 0, height: 0 });
	const displayScaleRef = useRef<DisplayScale>(computeDisplayScale(0, 0));
	const viewportRef = useRef<Viewport>({ scale: 1, originX: 0, originY: 0 });
	const rafRef = useRef(0);

	// Live ref so draw callbacks always read the latest viz settings without
	// re-subscribing.
	const vizRef = useRef(visualizationSettingState);
	vizRef.current = visualizationSettingState;

	// The latest draw function, set by requestDraw.  Used by handleWheel and
	// resetViewport so they can trigger a redraw without knowing the
	// component's specific draw callback.
	const drawFnRef = useRef<(() => void) | null>(null);

	// ------------------------------------------------------------------
	// State — triggers re-renders so dependents (e.g. layer building)
	// can react to image changes.
	// ------------------------------------------------------------------
	const [imageSize, setImageSize] = useState<{
		width: number;
		height: number;
	} | null>(null);

	// ------------------------------------------------------------------
	// requestDraw — rAF-based draw scheduler
	// ------------------------------------------------------------------

	const requestDraw = useCallback((fn: () => void) => {
		drawFnRef.current = fn;
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(fn);
	}, []);

	// ------------------------------------------------------------------
	// drawImageToContext — applies CSS filter + white balance and draws
	// the image at (0,0).  Callers are responsible for setting up the
	// transform beforehand.
	// ------------------------------------------------------------------

	const drawImageToContext = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			if (!imageRef.current) return;

			const filter = getImageDisplayFilter(vizRef.current);
			if (filter) {
				ctx.filter = filter;
			}
			const source = wbImageRef.current ?? imageRef.current;
			ctx.drawImage(source, 0, 0);
			ctx.filter = "none";
		},
		// Only reads from refs — stable for the lifetime of the component
		[],
	);

	// ------------------------------------------------------------------
	// resetViewport — fit the image into the canvas with letterboxing
	// ------------------------------------------------------------------

	const resetViewport = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width;
		canvas.height = rect.height;

		const { width: imgW, height: imgH } = imageSizeRef.current;
		if (imgW === 0 || imgH === 0) return;

		const scale = Math.min(rect.width / imgW, rect.height / imgH);
		const originX = -(rect.width / scale - imgW) / 2;
		const originY = -(rect.height / scale - imgH) / 2;

		viewportRef.current = { scale, originX, originY };

		// Redraw after viewport change
		if (drawFnRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = requestAnimationFrame(drawFnRef.current);
		}
	}, []);

	// ------------------------------------------------------------------
	// zoomAt — programmatic zoom (used by StatisticCanvas imperative handle)
	// ------------------------------------------------------------------

	const zoomAt = useCallback(
		(factor: number, centerX: number, centerY: number) => {
			const { scale, originX, originY } = viewportRef.current;
			const newScale = Math.max(0.05, Math.min(50, scale * factor));
			viewportRef.current = {
				scale: newScale,
				originX: centerX / scale + originX - centerX / newScale,
				originY: centerY / scale + originY - centerY / newScale,
			};
			if (drawFnRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = requestAnimationFrame(drawFnRef.current);
			}
		},
		[],
	);

	// ------------------------------------------------------------------
	// handleWheel — mouse-wheel zoom
	// ------------------------------------------------------------------

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

			if (drawFnRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = requestAnimationFrame(drawFnRef.current);
			}
		},
		[],
	);

	// ==================================================================
	// Effects
	// ==================================================================

	// --- Image loading ---
	useEffect(() => {
		if (!imageUrl) {
			imageRef.current = null;
			wbImageRef.current = null;
			setImageSize(null);
			// Clear the canvas when there's no image
			if (drawFnRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = requestAnimationFrame(drawFnRef.current);
			}
			return;
		}

		const img = new Image();
		img.onload = () => {
			imageRef.current = img;
			wbImageRef.current = null;
			displayScaleRef.current = computeDisplayScale(
				img.naturalWidth,
				img.naturalHeight,
			);
			const size = { width: img.naturalWidth, height: img.naturalHeight };
			imageSizeRef.current = size;
			setImageSize(size);
		};
		img.onerror = () => {};
		img.src = imageUrl;
	}, [imageUrl]);

	// --- Reset viewport after image loads ---
	useEffect(() => {
		if (!imageSize) {
			// Draw anyway to clear the canvas
			if (drawFnRef.current) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = requestAnimationFrame(drawFnRef.current);
			}
			return;
		}
		resetViewport();
	}, [imageSize, resetViewport]);

	// --- White balance ---
	useEffect(() => {
		wbImageRef.current = null;
		const img = imageRef.current;
		if (!img) return;
		const viz = visualizationSettingState;
		if (!hasWhiteBalanceAdjustment(viz)) return;
		const size = imageSizeRef.current;
		if (size.width === 0 || size.height === 0) return;
		wbImageRef.current = createWhiteBalancedImage(
			img,
			size.width,
			size.height,
			viz.temperature,
			viz.tint,
		);
		// Redraw so the new WB image is used
		if (drawFnRef.current) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = requestAnimationFrame(drawFnRef.current);
		}
	}, [visualizationSettingState.temperature, visualizationSettingState.tint, imageSize]);

	// --- ResizeObserver (handles window resize, sidebar toggles, etc.) ---
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const resizeObserver = new ResizeObserver(() => {
			resetViewport();
		});
		resizeObserver.observe(canvas);
		return () => resizeObserver.disconnect();
	}, [resetViewport]);

	// --- Wheel listener ---
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.addEventListener("wheel", handleWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", handleWheel);
	}, [handleWheel]);

	// --- rAF cleanup on unmount ---
	useEffect(() => {
		return () => cancelAnimationFrame(rafRef.current);
	}, []);

	// ==================================================================
	// Public API
	// ==================================================================

	return {
		/** Ref for the <canvas> element — attach this to your canvas JSX. */
		canvasRef,
		/** Ref for the container <div> — attach this to your wrapper JSX. */
		containerRef,
		/** The loaded HTMLImageElement (or null). */
		imageRef,
		/** Image dimensions as a ref — safe to read from rAF callbacks. */
		imageSizeRef,
		/** Display-scale metadata computed from the image's natural size. */
		displayScaleRef,
		/** Current viewport transform { scale, originX, originY }. */
		viewportRef,
		/**
		 * Live ref to VisualizationSetting — always up-to-date, no
		 * re-subscription needed.
		 */
		vizRef,
		/**
		 * Image dimensions as React state — use this as a dependency in
		 * effects that need to rebuild when the image changes.
		 */
		imageSize,
		/**
		 * Schedule a draw callback via requestAnimationFrame.  Pass your
		 * component's `draw` function.  Automatically cancels any pending
		 * frame first.
		 */
		requestDraw,
		/**
		 * Fit the image into the canvas (letterboxed) and redraw.
		 * Call this after the image loads or the container resizes.
		 */
		resetViewport,
		/**
		 * Draw the base image onto a 2D context, applying all current
		 * visualization adjustments (brightness, contrast, saturation,
		 * temperature, tint).  The caller must have set up the desired
		 * transform on the context beforehand.
		 */
		drawImageToContext,
		/**
		 * Programmatic zoom by a factor around a point in canvas-client
		 * coordinates.
		 */
		zoomAt,
	};
}
