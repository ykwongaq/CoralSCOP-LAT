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

export type Centroid = { cx: number; cy: number; labelId: number };

export type Layers = {
	mask: HTMLCanvasElement;
	// 1px-wide mask boundaries; source for the `border` layer
	edges: HTMLCanvasElement;
	// Boundaries thickened to the current boundary width
	border: HTMLCanvasElement;
	// Label badges (circle + label id) at the current badge size
	text: HTMLCanvasElement;
	pendingMask: HTMLCanvasElement;
	centroids: Centroid[];
	// Style the border / text layers were last drawn with (NaN = not drawn yet)
	style: { boundaryWidth: number; labelBadgeSize: number };
};

export type LayersResult = {
	layers: Layers;
	pixelMasks: Uint8Array[];
};

// Automatic sizes, as a fraction of the layer's shorter side. The
// boundaryWidth / labelBadgeSize settings scale these.
const BOUNDARY_RADIUS_RATIO = 0.0015;
const BADGE_RADIUS_RATIO = 0.012;

// ---------------------------------------------------------------------------
// Layer canvases
// ---------------------------------------------------------------------------

function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

function createLayers(
	width: number,
	height: number,
	maskData: ImageData,
	edgeData: ImageData,
	centroids: Centroid[],
): Layers {
	const mask = createCanvas(width, height);
	const edges = createCanvas(width, height);
	mask.getContext("2d")!.putImageData(maskData, 0, 0);
	edges.getContext("2d")!.putImageData(edgeData, 0, 0);

	return {
		mask,
		edges,
		border: createCanvas(width, height),
		text: createCanvas(width, height),
		pendingMask: createCanvas(width, height),
		centroids,
		style: { boundaryWidth: NaN, labelBadgeSize: NaN },
	};
}

/** Boundary half-thickness in layer pixels (0 = a 1px line). */
function getBoundaryRadius(
	width: number,
	height: number,
	boundaryWidth: number,
): number {
	const base = Math.max(1, Math.min(width, height) * BOUNDARY_RADIUS_RATIO);
	return Math.max(0, Math.round(base * boundaryWidth));
}

/**
 * Thicken the 1px edges into a disk of `radius` around every edge pixel.
 *
 * Done with canvas copies instead of a per-pixel loop: first widen the edges
 * horizontally row by row, then stack those rows vertically. This needs about
 * 4 * radius copies, so dragging the width slider stays smooth.
 */
function renderBorderLayer(layers: Layers, boundaryWidth: number): void {
	const { edges, border } = layers;
	const { width, height } = border;
	const ctx = border.getContext("2d")!;
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect(0, 0, width, height);

	const radius = getBoundaryRadius(width, height, boundaryWidth);
	if (radius === 0) {
		ctx.drawImage(edges, 0, 0);
		return;
	}

	const row = createCanvas(width, height);
	const rowCtx = row.getContext("2d")!;
	rowCtx.imageSmoothingEnabled = false;
	rowCtx.drawImage(edges, 0, 0);

	// Walk from the top of the disk to its middle, so the row half-width
	// only ever grows and `row` can be widened in place.
	const r2 = radius * radius;
	let rowHalfWidth = 0;
	for (let dy = radius; dy >= 0; dy--) {
		const halfWidth = Math.floor(Math.sqrt(r2 - dy * dy));
		while (rowHalfWidth < halfWidth) {
			rowHalfWidth++;
			rowCtx.drawImage(edges, rowHalfWidth, 0);
			rowCtx.drawImage(edges, -rowHalfWidth, 0);
		}
		ctx.drawImage(row, 0, dy);
		if (dy !== 0) ctx.drawImage(row, 0, -dy);
	}
}

function renderTextLayer(layers: Layers, labelBadgeSize: number): void {
	const { text, centroids } = layers;
	const { width, height } = text;
	const ctx = text.getContext("2d")!;
	ctx.clearRect(0, 0, width, height);

	const baseRadius = Math.max(
		4,
		Math.floor(Math.min(width, height) * BADGE_RADIUS_RATIO),
	);
	const badgeRadius = Math.max(2, baseRadius * labelBadgeSize);
	const fontSize = badgeRadius * 1.2;

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	for (const { cx, cy, labelId } of centroids) {
		if (labelId < 0) continue;

		const displayText = String(labelId);

		ctx.beginPath();
		ctx.arc(cx, cy, badgeRadius, 0, 2 * Math.PI);
		ctx.fillStyle = getLabelColor(labelId);
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = Math.max(1, badgeRadius * 0.12);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();

		// Shrink longer ids so they stay inside the circle
		const textScale =
			displayText.length > 2 ? 0.6 : displayText.length > 1 ? 0.75 : 1;
		ctx.font = `bold ${Math.floor(fontSize * textScale)}px Arial`;
		ctx.fillStyle = getTextColor(labelId);
		ctx.fillText(displayText, cx, cy);
	}
}

/**
 * Redraw the border / text layers if their size settings changed since they
 * were last drawn. Cheap no-op otherwise, so it is safe to call every frame.
 */
export function syncLayerStyle(
	layers: Layers,
	viz: VisualizationSetting,
): void {
	if (viz.showBoundaries && layers.style.boundaryWidth !== viz.boundaryWidth) {
		renderBorderLayer(layers, viz.boundaryWidth);
		layers.style.boundaryWidth = viz.boundaryWidth;
	}
	if (
		viz.showLabelBadges &&
		layers.style.labelBadgeSize !== viz.labelBadgeSize
	) {
		renderTextLayer(layers, viz.labelBadgeSize);
		layers.style.labelBadgeSize = viz.labelBadgeSize;
	}
}

/**
 * Draw the annotation overlays (mask fill, boundaries, label badges and,
 * optionally, the pending mask) onto `ctx`, stretched to `width` x `height`.
 * Shared by the annotation canvas, the statistic canvas and image export so
 * they all look the same.
 */
export function drawAnnotationLayers(
	ctx: CanvasRenderingContext2D,
	layers: Layers,
	viz: VisualizationSetting,
	width: number,
	height: number,
	{ includePending = false }: { includePending?: boolean } = {},
): void {
	if (!viz.showMasks) return;

	syncLayerStyle(layers, viz);

	const prevAlpha = ctx.globalAlpha;
	if (viz.maskOpacity > 0) {
		ctx.globalAlpha = viz.maskOpacity;
		ctx.drawImage(layers.mask, 0, 0, width, height);
	}
	ctx.globalAlpha = 1;
	if (viz.showBoundaries) {
		ctx.drawImage(layers.border, 0, 0, width, height);
	}
	if (viz.showLabelBadges) {
		ctx.drawImage(layers.text, 0, 0, width, height);
	}
	if (includePending) {
		ctx.globalAlpha = viz.pendingMaskOpacity;
		ctx.drawImage(layers.pendingMask, 0, 0, width, height);
	}
	ctx.globalAlpha = prevAlpha;
}

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
	const {
		displayWidth: width,
		displayHeight: height,
		originalWidth: originalWidthVar,
		originalHeight: originalHeightVar,
		scale,
	} = displayScale;

	const maskImgData = new ImageData(width, height);
	const edgeImgData = new ImageData(width, height);
	const md = maskImgData.data;
	const ed = edgeImgData.data;

	const centroids: Centroid[] = [];

	const hiddenLabelIds = new Set(
		visualizationSetting.hiddingLabels.map((label) => label.id),
	);
	const selectedIds = new Set(selectedAnnotationIds);

	for (let annIdx = 0; annIdx < data.annotations.length; annIdx++) {
		const ann: Annotation = data.annotations[annIdx];

		if (hiddenLabelIds.has(ann.labelId)) {
			continue;
		}

		const color = selectedIds.has(ann.id)
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
				(origY < originalHeightVar - 1 &&
					pixelMask[i + originalWidthVar] === 0);

			if (isEdge) {
				ed[idx] = r;
				ed[idx + 1] = g;
				ed[idx + 2] = b;
				ed[idx + 3] = 255;
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

	return createLayers(width, height, maskImgData, edgeImgData, centroids);
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

	const ds = displayScale ?? computeDisplayScale(originalWidth, originalHeight);
	const width = ds.displayWidth;
	const height = ds.displayHeight;

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

	const [{ maskBuffer, edgeBuffer, centroids }, pixelMasks] =
		await Promise.all([
			// Worker: decode RLE + fill pixels (off main thread)
			new Promise<{
				maskBuffer: ArrayBuffer;
				edgeBuffer: ArrayBuffer;
				centroids: Centroid[];
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
			decodeRleMasks(data.annotations.map((ann) => ann.segmentation)),
		]);

	const layers = createLayers(
		width,
		height,
		new ImageData(new Uint8ClampedArray(maskBuffer), width, height),
		new ImageData(new Uint8ClampedArray(edgeBuffer), width, height),
		centroids,
	);

	return { layers, pixelMasks };
}

// ---------------------------------------------------------------------------
// Pending mask layer — cheap repaint, called whenever pendingMask changes
// ---------------------------------------------------------------------------

export function updatePendingMaskLayer(
	canvas: HTMLCanvasElement,
	pendingAnnotation: PendingAnnotation | null,
	displayScale: DisplayScale,
): void {
	const {
		originalWidth,
		displayWidth,
		displayHeight,
		scale: dsScale,
	} = displayScale;
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
