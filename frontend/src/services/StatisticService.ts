import type { RLE } from "../types/RLE";
import type { Label, Data, Annotation, ScaledLine } from "../types";
import type Color from "../types/Color";
import type { ClassPoint } from "../types/CoralWatch/CoralWatchCard";
export interface CoverageData {
	totalPct: number;
	byLabel: { name: string; pixels: number; pct: number; color: string }[];
}
import { getLabelColor, decodeRLE } from "../utils";

/**
 * Counts the number of pixels in an RLE-encoded mask.
 * RLE format: [count_of_0s, count_of_1s, count_of_0s, count_of_1s, ...]
 * We sum the counts at odd indices (1, 3, 5, ...) which represent the 1s (foreground pixels).
 */
export function countRLEPixels(rle: RLE): number {
	let count = 0;
	for (let i = 1; i < rle.counts.length; i += 2) {
		count += rle.counts[i];
	}
	return count;
}

/**
 * Calculates coverage statistics for a dataset.
 * Returns the total coverage percentage and per-label breakdown.
 */
export function calculateCoverageData(
	data: Data | null,
	labels: Label[],
): CoverageData {
	if (!data) return { totalPct: 0, byLabel: [] };
	const total = data.imageData.width * data.imageData.height;
	if (total === 0) return { totalPct: 0, byLabel: [] };

	const byLabelId: Record<number, number> = {};
	for (const ann of data.annotations) {
		const px = countRLEPixels(ann.segmentation);
		byLabelId[ann.labelId] = (byLabelId[ann.labelId] ?? 0) + px;
	}

	const byLabel = labels.map((label) => {
		const pixels = byLabelId[label.id] ?? 0;
		return {
			name: label.name,
			pixels,
			pct: (pixels / total) * 100,
			color: getLabelColor(label.id),
		};
	});

	const totalPixels = Object.values(byLabelId).reduce((a, b) => a + b, 0);
	return { totalPct: (totalPixels / total) * 100, byLabel };
}

/**
 * Filters coverage data to return only labels with non-zero coverage.
 */
export function getActiveLabels(
	coverage: CoverageData,
): CoverageData["byLabel"] {
	return coverage.byLabel.filter((l) => l.pixels > 0);
}

/**
 * Prepares data for the pie chart visualization.
 * Includes active labels and an "Uncovered" segment.
 */
export function preparePieData(coverage: CoverageData): Array<{
	name: string;
	pixels?: number;
	pct: number;
	color: string;
}> {
	const activeLabels = getActiveLabels(coverage);
	return [
		...activeLabels,
		{
			name: "Uncovered",
			pct: Math.max(0, 100 - coverage.totalPct),
			color: "#9ca3af",
		},
	];
}

/**
 * Prepares data for the bar chart visualization.
 */
export function prepareBarData(coverage: CoverageData): Array<{
	name: string;
	coverage: number;
	color: string;
}> {
	const activeLabels = getActiveLabels(coverage);
	return activeLabels.map((l) => ({
		name: l.name,
		coverage: parseFloat(l.pct.toFixed(2)),
		color: l.color,
	}));
}

/**
 * Gets basic image-level statistics.
 */
export function getImageStatistics(
	data: Data | null,
	coverage: CoverageData,
): {
	totalAnnotations: number;
	activeLabelCount: number;
	totalCoveragePct: number;
} {
	return {
		totalAnnotations: data?.annotations.length ?? 0,
		activeLabelCount: getActiveLabels(coverage).length,
		totalCoveragePct: coverage.totalPct,
	};
}

// ---------------------------------------------------------------------------
// Instance-level bleaching statistics
// ---------------------------------------------------------------------------

export interface BoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

/**
 * Calculates the bounding box of a binary mask.
 * @param mask - Binary mask as Uint8Array (1 = foreground, 0 = background)
 * @param width - Width of the image
 * @returns Bounding box or null if mask is empty
 */
export function getMaskBoundingBox(
	mask: Uint8Array,
	width: number,
): BoundingBox | null {
	let minX = width,
		minY = mask.length,
		maxX = -1,
		maxY = -1;
	for (let i = 0; i < mask.length; i++) {
		if (mask[i] !== 1) continue;
		const x = i % width;
		const y = Math.floor(i / width);
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
	}
	if (maxX < 0) return null;
	return { minX, minY, maxX, maxY };
}

/**
 * Calculates the bleaching percentage of a coral instance.
 * @param pixelData - Image pixel data from canvas
 * @param mask - Binary mask as Uint8Array
 * @param distanceThreshold - Color distance threshold for classifying bleached pixels (default 50)
 * @returns Bleaching percentage (0-100)
 */
export function calculateBleaching(
	pixelData: ImageData,
	mask: Uint8Array,
	distanceThreshold: number = 50,
): number {
	const { data } = pixelData;
	let total = 0;
	let bleached = 0;
	const thresholdSq = distanceThreshold * distanceThreshold;
	const whiteR = 255, whiteG = 255, whiteB = 255;

	for (let i = 0; i < mask.length; i++) {
		if (mask[i] !== 1) continue;
		total++;
		const idx = i * 4;
		const r = data[idx];
		const g = data[idx + 1];
		const b = data[idx + 2];

		const dist = colorDistanceSq(r, g, b, whiteR, whiteG, whiteB);
		if (dist <= thresholdSq) {
			bleached++;
		}
	}
	return total === 0 ? 0 : (bleached / total) * 100;
}

/**
 * Determines the bleaching status based on percentage.
 * @param pct - Bleaching percentage
 * @returns Status string: "Healthy", "Partially Bleached", or "Bleached"
 */
export function getBleachingStatus(pct: number): string {
	if (pct < 10) return "Healthy";
	if (pct < 30) return "Partially Bleached";
	return "Bleached";
}

export interface BleachingResult {
	annotationId: number;
	bleachingPct: number;
}

/**
 * Computes bleaching percentages for multiple annotations.
 * Loads the image and calculates bleaching for each annotation's mask.
 * @param imageUrl - URL of the image to analyze
 * @param annotations - Array of annotations to analyze
 * @param width - Image width
 * @param height - Image height
 * @param distanceThreshold - Color distance threshold for classifying bleached pixels
 * @returns Array of bleaching percentages in the same order as annotations
 */
export async function computeBleachingPercentages(
	imageUrl: string,
	annotations: Annotation[],
	width: number,
	height: number,
	distanceThreshold: number = 50,
): Promise<number[]> {
	const img = new Image();
	await new Promise<void>((res, rej) => {
		img.onload = () => res();
		img.onerror = () => rej();
		img.src = imageUrl;
	});
	const offscreen = document.createElement("canvas");
	offscreen.width = width;
	offscreen.height = height;
	const ctx = offscreen.getContext("2d")!;
	ctx.drawImage(img, 0, 0, width, height);
	const pixelData = ctx.getImageData(0, 0, width, height);
	return annotations.map((ann) => {
		const mask = decodeRLE(ann.segmentation);
		return calculateBleaching(pixelData, mask, distanceThreshold);
	});
}

/**
 * Computes a pixel-level map showing which pixels are bleached.
 * @param imageUrl - URL of the image to analyze
 * @param annotation - The annotation to analyze
 * @param width - Image width
 * @param height - Image height
 * @param distanceThreshold - Color distance threshold for classifying bleached pixels
 * @returns Array of pixel labels ("Bleached" or "Unbleached") in image order
 */
export async function computeBleachedPixelMap(
	imageUrl: string,
	annotation: Annotation,
	width: number,
	height: number,
	distanceThreshold: number = 50,
): Promise<string[]> {
	const img = new Image();
	await new Promise<void>((res, rej) => {
		img.onload = () => res();
		img.onerror = () => rej();
		img.src = imageUrl;
	});

	const offscreen = document.createElement("canvas");
	offscreen.width = width;
	offscreen.height = height;
	const ctx = offscreen.getContext("2d")!;
	ctx.drawImage(img, 0, 0, width, height);
	const pixelData = ctx.getImageData(0, 0, width, height);

	const mask = decodeRLE(annotation.segmentation);
	const { data } = pixelData;
	const thresholdSq = distanceThreshold * distanceThreshold;
	const whiteR = 255, whiteG = 255, whiteB = 255;

	const pixelMap = new Array(mask.length).fill("");
	for (let i = 0; i < mask.length; i++) {
		if (mask[i] !== 1) continue;
		const idx = i * 4;
		const r = data[idx];
		const g = data[idx + 1];
		const b = data[idx + 2];

		const dist = colorDistanceSq(r, g, b, whiteR, whiteG, whiteB);
		pixelMap[i] = dist <= thresholdSq ? "Bleached" : "Unbleached";
	}

	return pixelMap;
}

/**
 * Calculates the combined bounding box for multiple masks.
 * @param annotations - Array of annotations
 * @param imageWidth - Width of the image
 * @param imageHeight - Height of the image
 * @returns Combined bounding box or null if no valid masks
 */
export function getCombinedBoundingBox(
	annotations: Annotation[],
	imageWidth: number,
	imageHeight: number,
): BoundingBox | null {
	let minX = imageWidth,
		minY = imageHeight,
		maxX = -1,
		maxY = -1;

	for (const ann of annotations) {
		const mask = decodeRLE(ann.segmentation);
		const bb = getMaskBoundingBox(mask, imageWidth);
		if (!bb) continue;
		if (bb.minX < minX) minX = bb.minX;
		if (bb.minY < minY) minY = bb.minY;
		if (bb.maxX > maxX) maxX = bb.maxX;
		if (bb.maxY > maxY) maxY = bb.maxY;
	}

	if (maxX < 0) return null;
	return { minX, minY, maxX, maxY };
}

export interface PixelScaleResult {
	value: number;
	unit: "mm²" | "cm²" | "m²";
	squareMetersPerPixel: number;
}

function pickBestAreaUnit(squareMetersPerPixel: number): {
	value: number;
	unit: PixelScaleResult["unit"];
} {
	const areaUnits = [
		{ unit: "m²" as const, factor: 1 },
		{ unit: "cm²" as const, factor: 1e4 },
		{ unit: "mm²" as const, factor: 1e6 },
	];

	const preferredUnit =
		areaUnits.find(({ factor }) => {
			const convertedValue = squareMetersPerPixel * factor;
			return convertedValue >= 0.1 && convertedValue < 1000;
		}) ?? (squareMetersPerPixel * 1e6 < 0.1 ? areaUnits[2] : areaUnits[0]);

	return {
		value: squareMetersPerPixel * preferredUnit.factor,
		unit: preferredUnit.unit,
	};
}

export function calculatePixelScale(
	scaledLines: ScaledLine[],
): PixelScaleResult {
	if (scaledLines.length === 0) {
		return { value: 0, unit: "cm²", squareMetersPerPixel: 0 };
	}

	const unitToMeters: Record<ScaledLine["unit"], number> = {
		mm: 0.001,
		cm: 0.01,
		m: 1,
	};

	const areaPerPixelValues = scaledLines
		.map((line) => {
			const pixelLength = Math.hypot(
				line.end.x - line.start.x,
				line.end.y - line.start.y,
			);
			if (
				!Number.isFinite(pixelLength) ||
				pixelLength <= 0 ||
				!Number.isFinite(line.scale) ||
				line.scale <= 0
			) {
				return null;
			}

			const realWorldLengthInMeters = line.scale * unitToMeters[line.unit];
			const metersPerPixel = realWorldLengthInMeters / pixelLength;
			return metersPerPixel * metersPerPixel;
		})
		.filter((value): value is number => value !== null);

	if (areaPerPixelValues.length === 0) {
		return { value: 0, unit: "cm²", squareMetersPerPixel: 0 };
	}

	const squareMetersPerPixel =
		areaPerPixelValues.reduce((sum, value) => sum + value, 0) /
		areaPerPixelValues.length;
	const { value, unit } = pickBestAreaUnit(squareMetersPerPixel);

	return { value, unit, squareMetersPerPixel };
}

// ---------------------------------------------------------------------------
// Color classification for CoralWatch
// ---------------------------------------------------------------------------

function colorDistanceSq(r: number, g: number, b: number, cr: number, cg: number, cb: number): number {
	const dr = r - cr;
	const dg = g - cg;
	const db = b - cb;
	return dr * dr + dg * dg + db * db;
}

export interface ColorClassificationResult {
	label: string;
	pixels: number;
	pct: number;
	color: Color;
	pixelMap?: string[];
}

export async function classifyPixelsByColor(
	imageUrl: string,
	annotation: Annotation,
	classPoints: ClassPoint[],
	distanceThreshold: number = 50,
): Promise<ColorClassificationResult[]> {
	if (classPoints.length === 0) {
		return [];
	}

	const img = new Image();
	await new Promise<void>((res, rej) => {
		img.onload = () => res();
		img.onerror = () => rej();
		img.src = imageUrl;
	});

	const offscreen = document.createElement("canvas");
	offscreen.width = img.naturalWidth;
	offscreen.height = img.naturalHeight;
	const ctx = offscreen.getContext("2d")!;
	ctx.drawImage(img, 0, 0);
	const pixelData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);

	const mask = decodeRLE(annotation.segmentation);
	const { data } = pixelData;

	// Precompute class point colors as flat typed arrays for faster access
	const len = classPoints.length;
	const rs = new Int32Array(len);
	const gs = new Int32Array(len);
	const bs = new Int32Array(len);
	for (let i = 0; i < len; i++) {
		rs[i] = classPoints[i].color.r;
		gs[i] = classPoints[i].color.g;
		bs[i] = classPoints[i].color.b;
	}

	// Use typed arrays for counts and pixel label map
	const classCounts = new Uint32Array(len);
	const pixelLabelMap = new Int16Array(mask.length);
	pixelLabelMap.fill(-1); // -1 = unclassified
	const thresholdSq = distanceThreshold * distanceThreshold;

	let totalPixels = 0;
	let unclassifiedPixels = 0;
	for (let i = 0; i < mask.length; i++) {
		if (mask[i] !== 1) continue;
		totalPixels++;

		const idx = i * 4;
		const r = data[idx];
		const g = data[idx + 1];
		const b = data[idx + 2];

		let closestIdx = 0;
		let closestDist = colorDistanceSq(r, g, b, rs[0], gs[0], bs[0]);

		for (let j = 1; j < len; j++) {
			if (closestDist === 0) break; // exact match, no need to continue
			const dist = colorDistanceSq(r, g, b, rs[j], gs[j], bs[j]);
			if (dist < closestDist) {
				closestDist = dist;
				closestIdx = j;
			}
		}

		if (closestDist <= thresholdSq) {
			classCounts[closestIdx]++;
			pixelLabelMap[i] = closestIdx;
		} else {
			unclassifiedPixels++;
		}
	}

	// Convert pixelLabelMap to string[] once for results[0]
	const pixelMapStrings = Array.from(pixelLabelMap, (idx) =>
		idx >= 0 ? classPoints[idx].label : "",
	);

	const results: ColorClassificationResult[] = classPoints.map((cp, i) => ({
		label: cp.label,
		pixels: classCounts[i],
		pct: totalPixels > 0 ? (classCounts[i] / totalPixels) * 100 : 0,
		color: cp.color,
	}));

	// Add unclassified label as the last entry
	results.push({
		label: "Unclassified",
		pixels: unclassifiedPixels,
		pct: totalPixels > 0 ? (unclassifiedPixels / totalPixels) * 100 : 0,
		color: { r: 128, g: 128, b: 128 },
	});

	results.sort((a, b) => b.pct - a.pct);
	// Move unclassified to the end if it got sorted differently
	const unclassifiedIndex = results.findIndex((r) => r.label === "Unclassified");
	if (unclassifiedIndex !== -1 && unclassifiedIndex !== results.length - 1) {
		const [unclassified] = results.splice(unclassifiedIndex, 1);
		results.push(unclassified);
	}
	results[0].pixelMap = pixelMapStrings; // only attach where it's read
	return results;
}
