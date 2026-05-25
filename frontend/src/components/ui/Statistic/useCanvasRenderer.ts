import { useRef, useEffect, useCallback } from "react";
import type { Annotation } from "../../../types";
import type { ColorClassificationResult } from "../../../services";
import { getMaskBoundingBox } from "../../../services";
import { decodeRLE } from "../../../utils/cocoRle";

interface Viewport {
	scale: number;
	offsetX: number;
	offsetY: number;
}

export function useCanvasRenderer(
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	imageUrl: string,
	annotation: Annotation,
	imageWidth: number,
	imageHeight: number,
	showMask: boolean,
	maskAlpha: number,
	colorClassification: ColorClassificationResult[] | null | undefined,
) {
	const imageRef = useRef<HTMLImageElement | null>(null);
	const maskRef = useRef<Uint8Array | null>(null);
	const boundingBoxRef = useRef<{
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	} | null>(null);
	const viewportRef = useRef<Viewport>({ scale: 1, offsetX: 0, offsetY: 0 });
	const rafRef = useRef(0);
	const showMaskRef = useRef(showMask);
	const maskAlphaRef = useRef(maskAlpha);
	const colorClassificationRef = useRef(colorClassification);
	const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
	const pixelDataRef = useRef<ImageData | null>(null);
	const colorLookupRef = useRef<{
		lookup: Record<string, { r: number; g: number; b: number }>;
		pixelMap: string[] | null;
	} | null>(null);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas || !imageRef.current || !maskRef.current) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const mask = maskRef.current;
		const bbox = boundingBoxRef.current;
		if (!bbox) return;

		if (!offscreenCanvasRef.current) {
			offscreenCanvasRef.current = document.createElement("canvas");
			offscreenCtxRef.current = offscreenCanvasRef.current.getContext(
				"2d",
			);
		}

		const offscreenCanvas = offscreenCanvasRef.current;
		const offscreenCtx = offscreenCtxRef.current;
		if (!offscreenCtx) return;

		offscreenCanvas.width = imageWidth;
		offscreenCanvas.height = imageHeight;

		offscreenCtx.drawImage(imageRef.current, 0, 0);

		if (!pixelDataRef.current) {
			pixelDataRef.current = offscreenCtx.getImageData(
				0,
				0,
				imageWidth,
				imageHeight,
			);
		} else {
			pixelDataRef.current = offscreenCtx.getImageData(
				0,
				0,
				imageWidth,
				imageHeight,
			);
		}

		const pixelData = pixelDataRef.current;
		const data = pixelData.data;

		const currentShowMask = showMaskRef.current;
		const currentMaskAlpha = maskAlphaRef.current;
		const currentColorClassification = colorClassificationRef.current;

		if (
			currentShowMask &&
			currentColorClassification &&
			currentMaskAlpha > 0
		) {
			let colorLookup = colorLookupRef.current?.lookup;
			let pixelMap = colorLookupRef.current?.pixelMap;

			if (!colorLookup || !pixelMap) {
				colorLookup = {};
				currentColorClassification.forEach((c) => {
					colorLookup![c.label] = c.color;
				});
				pixelMap = currentColorClassification[0]?.pixelMap || null;
				colorLookupRef.current = { lookup: colorLookup, pixelMap };
			}

			const alpha = currentMaskAlpha / 100;
			const invAlpha = 1 - alpha;

			if (pixelMap) {
				for (let i = 0; i < mask.length; i++) {
					const idx = i * 4;

					if (mask[i] === 1) {
						const label = pixelMap[i];
						const colorData = colorLookup[label];

						const r = colorData ? colorData.r : 169;
						const g = colorData ? colorData.g : 169;
						const b = colorData ? colorData.b : 169;

						data[idx] = (data[idx] * invAlpha + r * alpha) | 0;
						data[idx + 1] =
							(data[idx + 1] * invAlpha + g * alpha) | 0;
						data[idx + 2] =
							(data[idx + 2] * invAlpha + b * alpha) | 0;
					} else {
						data[idx + 3] = 0;
					}
				}
			}
		} else {
			for (let i = 0; i < mask.length; i++) {
				if (mask[i] !== 1) {
					data[i * 4 + 3] = 0;
				}
			}
		}

		offscreenCtx.putImageData(pixelData, 0, 0);

		const bboxWidth = bbox.maxX - bbox.minX + 1;
		const bboxHeight = bbox.maxY - bbox.minY + 1;

		const baseScale = Math.min(canvas.width / bboxWidth, canvas.height / bboxHeight) * 0.9;
		const { scale, offsetX, offsetY } = viewportRef.current;
		const finalScale = baseScale * scale;
		const scaledWidth = bboxWidth * finalScale;
		const scaledHeight = bboxHeight * finalScale;

		const x = (canvas.width - scaledWidth) / 2 + offsetX;
		const y = (canvas.height - scaledHeight) / 2 + offsetY;

		ctx.drawImage(
			offscreenCanvas,
			bbox.minX,
			bbox.minY,
			bboxWidth,
			bboxHeight,
			x,
			y,
			scaledWidth,
			scaledHeight,
		);
	}, [imageWidth, imageHeight]);

	const requestDraw = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(draw);
	}, [draw]);

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

		viewportRef.current = {
			scale: 1,
			offsetX: 0,
			offsetY: 0,
		};

		draw();
	}, [draw]);

	// Load image and decode mask
	useEffect(() => {
		const loadImageAndMask = async () => {
			const img = new Image();
			await new Promise<void>((res, rej) => {
				img.onload = () => res();
				img.onerror = () => rej();
				img.src = imageUrl;
			});

			imageRef.current = img;
			const mask = decodeRLE(annotation.segmentation);
			maskRef.current = mask;

			const bbox = getMaskBoundingBox(mask, imageWidth);
			boundingBoxRef.current = bbox;

			resetViewport();
		};

		loadImageAndMask();
	}, [imageUrl, annotation, imageWidth, resetViewport]);

	// Canvas resize observer
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const resizeObserver = new ResizeObserver(() => {
			resetViewport();
		});

		resizeObserver.observe(canvas);
		return () => resizeObserver.disconnect();
	}, [resetViewport]);

	// Sync refs with props
	useEffect(() => {
		showMaskRef.current = showMask;
	}, [showMask]);

	useEffect(() => {
		maskAlphaRef.current = maskAlpha;
	}, [maskAlpha]);

	useEffect(() => {
		colorClassificationRef.current = colorClassification;
		colorLookupRef.current = null;
	}, [colorClassification]);

	// Trigger redraw when mask settings change
	useEffect(() => {
		requestDraw();
	}, [showMask, maskAlpha, colorClassification, requestDraw]);

	// Cleanup RAF
	useEffect(() => {
		return () => cancelAnimationFrame(rafRef.current);
	}, []);

	return { viewportRef, requestDraw, resetViewport, boundingBoxRef };
}
