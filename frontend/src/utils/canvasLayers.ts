import { decodeRLE, decodeRleMasks } from "./cocoRle";
import { hexToRgb } from "./color";
import { computeDisplayScale, type DisplayScale } from "./displayScale";
import type {
	Annotation,
	Data,
	PendingAnnotation,
	VisualizationSetting,
} from "../types";
import {
	getLabelColor,
	getPendingMaskColor,
	getSelectedMaskColor,
	getTextColor,
} from "./LabelColorMap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Layers = {
	mask: HTMLCanvasElement;
	border: HTMLCanvasElement;
	text: HTMLCanvasElement;
	pendingMask: HTMLCanvasElement;
};

export type LayersResult = {
	layers: Layers;
	pixelMasks: Uint8Array[];
};

// ---------------------------------------------------------------------------
// Layer builder — pure function, no React, called once per data change
// ---------------------------------------------------------------------------

// Fast path: accepts pre-decoded pixelMasks, skips RLE decode (for selection-only changes)
export function buildLayersWithCachedMasks(
	data: Data,
	pixelMasks: Uint8Array[],
	selectedAnnotationIds: number[],
	visualizationSetting: VisualizationSetting,
	displayScale: DisplayScale,
): Layers {
	const { displayWidth: width, displayHeight: height, originalWidth: originalWidthVar, originalHeight: originalHeightVar, scale } = displayScale;

	const maskCanvas = document.createElement("canvas");
	const borderCanvas = document.createElement("canvas");
	const textCanvas = document.createElement("canvas");
	const pendingMaskCanvas = document.createElement("canvas");

	maskCanvas.width = borderCanvas.width = textCanvas.width = pendingMaskCanvas.width = width;
	maskCanvas.height = borderCanvas.height = textCanvas.height = pendingMaskCanvas.height = height;

	const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
	const borderCtx = borderCanvas.getContext("2d")!;
	const textCtx = textCanvas.getContext("2d")!;

	const maskImgData = maskCtx.getImageData(0, 0, width, height);
	const md = maskImgData.data;

	const centroids: Array<{ cx: number; cy: number; labelId: number }> = [];
	const edges: Array<{
		x: number;
		y: number;
		r: number;
		g: number;
		b: number;
	}> = [];

	const hiddenLabelIds = new Set(
		visualizationSetting.hiddingLabels.map((label) => label.id),
	);

	function isMaskSelected(annotation: Annotation): boolean {
		return selectedAnnotationIds.some((sel) => sel === annotation.id);
	}

	function isLabelHidden(labelId: number): boolean {
		return hiddenLabelIds.has(labelId);
	}

	for (let annIdx = 0; annIdx < data.annotations.length; annIdx++) {
		const ann = data.annotations[annIdx];

		if (isLabelHidden(ann.labelId)) {
			continue;
		}

		const color = isMaskSelected(ann)
			? getSelectedMaskColor()
			: getLabelColor(ann.labelId);
		const [r, g, b] = hexToRgb(color);
		const pixelMask = pixelMasks[annIdx];

		if (!pixelMask || pixelMask.length === 0) continue;

		let sumX = 0,
			sumY = 0,
			count = 0;

		for (let i = 0; i < pixelMask.length; i++) {
			if (pixelMask[i] !== 1) continue;

			const origX = i % originalWidthVar;
			const origY = Math.floor(i / originalWidthVar);
			const dispX = Math.round(origX * scale);
			const dispY = Math.round(origY * scale);
			const idx = (dispY * width + dispX) * 4;

			md[idx] = r;
			md[idx + 1] = g;
			md[idx + 2] = b;
			md[idx + 3] = 255;

			const isEdge =
				(origX > 0 && pixelMask[i - 1] === 0) ||
				(origX < originalWidthVar - 1 && pixelMask[i + 1] === 0) ||
				(origY > 0 && pixelMask[i - originalWidthVar] === 0) ||
				(origY < originalHeightVar - 1 && pixelMask[i + originalWidthVar] === 0);

			if (isEdge) {
				edges.push({ x: dispX, y: dispY, r, g, b });
			}

			sumX += dispX;
			sumY += dispY;
			count++;
		}

		if (count > 0) {
			centroids.push({
				cx: Math.round(sumX / count),
				cy: Math.round(sumY / count),
				labelId: ann.labelId,
			});
		}
	}

	const minDim = Math.min(width, height);
	const boundaryRadius = Math.max(1, Math.round(minDim * 0.0015));

	const borderImgData = borderCtx.getImageData(0, 0, width, height);
	const bd = borderImgData.data;
	const r2 = boundaryRadius * boundaryRadius;

	for (const { x, y, r, g, b } of edges) {
		for (let dy = -boundaryRadius; dy <= boundaryRadius; dy++) {
			for (let dx = -boundaryRadius; dx <= boundaryRadius; dx++) {
				if (dx * dx + dy * dy > r2) continue;

				const px = x + dx;
				const py = y + dy;
				if (px < 0 || px >= width || py < 0 || py >= height) continue;
				const pIdx = (py * width + px) * 4;
				bd[pIdx] = r;
				bd[pIdx + 1] = g;
				bd[pIdx + 2] = b;
				bd[pIdx + 3] = 255;
			}
		}
	}

	maskCtx.putImageData(maskImgData, 0, 0);
	borderCtx.putImageData(borderImgData, 0, 0);

	const badgeRadius = Math.max(4, Math.floor(minDim * 0.012));
	const fontSize = Math.round(badgeRadius * 1.2);

	textCtx.textAlign = "center";
	textCtx.textBaseline = "middle";

	for (const { cx, cy, labelId } of centroids) {
		if (labelId < 0) continue;

		const color = getLabelColor(labelId);
		const textColor = getTextColor(labelId);
		const displayText = String(labelId + 1);

		textCtx.beginPath();
		textCtx.arc(cx, cy, badgeRadius, 0, 2 * Math.PI);
		textCtx.fillStyle = color;
		textCtx.strokeStyle = "#fff";
		textCtx.lineWidth = Math.max(1, badgeRadius * 0.12);
		textCtx.fill();
		textCtx.stroke();
		textCtx.closePath();

		const adjFontSize =
			displayText.length > 1 ? Math.floor(fontSize * 0.75) : fontSize;
		textCtx.font = `bold ${adjFontSize}px Arial`;
		textCtx.fillStyle = textColor;
		textCtx.fillText(displayText, cx, cy);
	}

	return {
		mask: maskCanvas,
		border: borderCanvas,
		text: textCanvas,
		pendingMask: pendingMaskCanvas,
	};
}

export async function buildLayers(
	data: Data,
	selectedAnnotationIds: number[],
	visualizationSetting: VisualizationSetting,
	displayScale?: DisplayScale,
): Promise<LayersResult> {
	const originalWidth =
		data.imageData.width ?? data.annotations[0]?.segmentation.size[1] ?? 0;
	const originalHeight =
		data.imageData.height ?? data.annotations[0]?.segmentation.size[0] ?? 0;

	const ds =
		displayScale ?? computeDisplayScale(originalWidth, originalHeight);
	const width = ds.displayWidth;
	const height = ds.displayHeight;

	const maskCanvas = document.createElement("canvas");
	const borderCanvas = document.createElement("canvas");
	const textCanvas = document.createElement("canvas");
	const pendingMaskCanvas = document.createElement("canvas");

	maskCanvas.width =
		borderCanvas.width =
		textCanvas.width =
		pendingMaskCanvas.width =
			width;
	maskCanvas.height =
		borderCanvas.height =
		textCanvas.height =
		pendingMaskCanvas.height =
			height;

	const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
	const borderCtx = borderCanvas.getContext("2d")!;
	const textCtx = textCanvas.getContext("2d")!;

	// Pre-compute color map on main thread
	const colorMap: Record<number, [number, number, number]> = {};
	for (const ann of data.annotations) {
		if (!(ann.labelId in colorMap)) {
			colorMap[ann.labelId] = hexToRgb(getLabelColor(ann.labelId));
		}
	}
	const selectedRGB = hexToRgb(getSelectedMaskColor());

	// Run worker and decodeRleMasks in parallel
	const hiddenLabelIds = visualizationSetting.hiddingLabels.map(
		(label) => label.id,
	);

	const [{ maskBuffer, borderBuffer, centroids }, pixelMasks] =
		await Promise.all([
			// Worker: decode RLE + fill pixels (off main thread)
			new Promise<{
				maskBuffer: ArrayBuffer;
				borderBuffer: ArrayBuffer;
				centroids: Array<{ cx: number; cy: number; labelId: number }>;
			}>((resolve, reject) => {
				const BuildLayersWorker = new Worker(
					new URL("./canvasLayers.worker.ts", import.meta.url),
					{ type: "module" },
				);

				BuildLayersWorker.onmessage = (e) => {
					resolve(e.data);
					BuildLayersWorker.terminate();
				};

				BuildLayersWorker.onerror = (e) => {
					reject(e);
					BuildLayersWorker.terminate();
				};

				BuildLayersWorker.postMessage({
					rles: data.annotations.map((ann) => ann.segmentation),
					annotations: data.annotations.map((ann) => ({
						id: ann.id,
						labelId: ann.labelId,
					})),
					selectedAnnotationIds,
					hiddenLabelIds,
					colorMap,
					selectedRGB,
					displayScale: ds,
				});
			}),
			// Main thread workers: decode RLE for hit-testing
			decodeRleMasks(
				data.annotations.map((ann) => ann.segmentation),
			),
		]);

	// Apply transferred buffers to canvases
	maskCtx.putImageData(
		new ImageData(new Uint8ClampedArray(maskBuffer), width, height),
		0,
		0,
	);
	borderCtx.putImageData(
		new ImageData(new Uint8ClampedArray(borderBuffer), width, height),
		0,
		0,
	);

	// Draw text badges on main thread
	const minDim = Math.min(width, height);
	const badgeRadius = Math.max(4, Math.floor(minDim * 0.012));
	const fontSize = Math.round(badgeRadius * 1.2);

	textCtx.textAlign = "center";
	textCtx.textBaseline = "middle";

	for (const { cx, cy, labelId } of centroids) {
		if (labelId < 0) continue;

		const color = getLabelColor(labelId);
		const textColor = getTextColor(labelId);
		const displayText = String(labelId + 1);

		textCtx.beginPath();
		textCtx.arc(cx, cy, badgeRadius, 0, 2 * Math.PI);
		textCtx.fillStyle = color;
		textCtx.strokeStyle = "#fff";
		textCtx.lineWidth = Math.max(1, badgeRadius * 0.12);
		textCtx.fill();
		textCtx.stroke();
		textCtx.closePath();

		const adjFontSize =
			displayText.length > 1 ? Math.floor(fontSize * 0.75) : fontSize;
		textCtx.font = `bold ${adjFontSize}px Arial`;
		textCtx.fillStyle = textColor;
		textCtx.fillText(displayText, cx, cy);
	}

	return {
		layers: {
			mask: maskCanvas,
			border: borderCanvas,
			text: textCanvas,
			pendingMask: pendingMaskCanvas,
		},
		pixelMasks,
	};
}

// ---------------------------------------------------------------------------
// Pending mask layer — cheap repaint, called whenever pendingMask changes
// ---------------------------------------------------------------------------

export function updatePendingMaskLayer(
	canvas: HTMLCanvasElement,
	pendingAnnotation: PendingAnnotation | null,
	displayScale: DisplayScale,
): void {
	const { originalWidth, displayWidth, displayHeight, scale: dsScale } = displayScale;
	const ctx = canvas.getContext("2d")!;
	ctx.clearRect(0, 0, displayWidth, displayHeight);

	if (pendingAnnotation === null) return;

	const pixelMask = decodeRLE(pendingAnnotation.segmentation);
	const [r, g, b] = hexToRgb(getPendingMaskColor());
	const imgData = ctx.createImageData(displayWidth, displayHeight);
	const d = imgData.data;

	for (let i = 0; i < pixelMask.length; i++) {
		if (pixelMask[i] !== 1) continue;

		const dispX = Math.round((i % originalWidth) * dsScale);
		const dispY = Math.round(Math.floor(i / originalWidth) * dsScale);
		const idx = (dispY * displayWidth + dispX) * 4;

		d[idx] = r;
		d[idx + 1] = g;
		d[idx + 2] = b;
		d[idx + 3] = 255;
	}

	ctx.putImageData(imgData, 0, 0);
}

// ---------------------------------------------------------------------------
// Image display adjustments (brightness, contrast, saturation, white balance)
// ---------------------------------------------------------------------------

/**
 * Normalize a setting value that may be in 0–100 range (initial reducer
 * values) or 0–1 range (after slider interaction).
 */
function normalizeDisplayValue(value: number): number {
	return value > 1 ? value / 100 : value;
}

/**
 * Build a CSS filter string for brightness, contrast, and saturation.
 * Returns an empty string when all values are at their neutral position so
 * callers can skip the filter overhead.
 */
export function getImageDisplayFilter(viz: VisualizationSetting): string {
	const filters: string[] = [];

	const brightness = normalizeDisplayValue(viz.brightness);
	if (brightness !== 1) {
		filters.push(`brightness(${brightness})`);
	}

	const contrast = normalizeDisplayValue(viz.contrast);
	if (contrast !== 1) {
		filters.push(`contrast(${contrast})`);
	}

	const saturation = normalizeDisplayValue(viz.saturation);
	if (saturation !== 1) {
		filters.push(`saturate(${saturation})`);
	}

	return filters.join(" ");
}

/**
 * Returns true when either temperature or tint has been moved from its
 * neutral position, signalling that the (more expensive) white-balance
 * path is needed.
 */
export function hasWhiteBalanceAdjustment(viz: VisualizationSetting): boolean {
	return viz.temperature !== 0 || viz.tint !== 0;
}

/**
 * Create a new off-screen canvas with white-balance (temperature / tint)
 * applied to the source image.
 *
 * Temperature shifts the blue–amber axis: higher values warm the image
 * (more red / less blue).  Tint shifts the green–magenta axis: higher
 * values push toward magenta (more red+blue / less green).
 *
 * When both values are 0 the source is drawn unchanged and returned
 * immediately — callers should guard with {@link hasWhiteBalanceAdjustment}
 * to avoid unnecessary copies.
 */
export function createWhiteBalancedImage(
	source: CanvasImageSource,
	width: number,
	height: number,
	temperature: number,
	tint: number,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d")!;

	ctx.drawImage(source, 0, 0);

	if (temperature === 0 && tint === 0) {
		return canvas;
	}

	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;

	for (let i = 0; i < data.length; i += 4) {
		let r = data[i];
		let g = data[i + 1];
		let b = data[i + 2];

		// Temperature — warm shift (amber)
		if (temperature !== 0) {
			const t = temperature * 0.7;
			r = Math.min(255, Math.max(0, r + 255 * t * 0.4));
			g = Math.min(255, Math.max(0, g + 255 * t * 0.1));
			b = Math.min(255, Math.max(0, b - 255 * t * 0.4));
		}

		// Tint — magenta shift
		if (tint !== 0) {
			const tn = tint * 0.7;
			r = Math.min(255, Math.max(0, r + 255 * tn * 0.4));
			g = Math.min(255, Math.max(0, g - 255 * tn * 0.4));
			b = Math.min(255, Math.max(0, b + 255 * tn * 0.4));
		}

		data[i] = r;
		data[i + 1] = g;
		data[i + 2] = b;
	}

	ctx.putImageData(imageData, 0, 0);
	return canvas;
}

// ---------------------------------------------------------------------------
// Hit-test helpers
// ---------------------------------------------------------------------------

export function hitTestMask(
	mask: Uint8Array,
	width: number,
	imgX: number,
	imgY: number,
): boolean {
	const px = Math.floor(imgX);
	const py = Math.floor(imgY);
	if (px < 0 || py < 0 || px >= width || py >= mask.length / width) {
		return false;
	}
	const hit = mask[py * width + px] === 1;
	return hit;
}

export function maskIntersectsRect(
	mask: Uint8Array,
	width: number,
	height: number,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
): boolean {
	const minX = Math.max(0, Math.floor(Math.min(x0, x1)));
	const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1)));
	const minY = Math.max(0, Math.floor(Math.min(y0, y1)));
	const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1)));

	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			if (mask[y * width + x] === 1) {
				return true;
			}
		}
	}
	return false;
}
