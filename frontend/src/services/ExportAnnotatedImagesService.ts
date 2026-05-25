import JSZip from "jszip";
import { buildLayers } from "../utils/canvasLayers";
import triggerDownload from "../utils/download";

import type { ProjectState, Data, VisualizationSetting } from "../types";
import type { DisplayScale } from "../utils/displayScale";

// Max images rendered concurrently. Each image's buildLayers already fans out
// to navigator.hardwareConcurrency workers for RLE decoding, so keep this low
// to avoid spawning too many workers at once on large projects.
const EXPORT_CONCURRENCY = 4;

// Neutral session state — no selections, no pending mask, no point prompts.
// Passed to buildLayers so every mask renders with its label color (no blue
// selection highlight).
const EXPORT_SESSION = {
	pendingMask: null,
	activateLabel: null,
	selectedAnnotations: [] as number[],
	annotationMode: "select" as const,
	currentDataIndex: 0,
	pointPrompts: [],
	selectedScaledLineId: null,
};

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
		img.src = url;
	});
}

async function renderAnnotatedImage(
	data: Data,
	vizSetting: VisualizationSetting,
): Promise<Blob> {
	const { width, height, imageUrl } = data.imageData;

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d")!;

	// Draw the original image as the base layer.
	const img = await loadImage(imageUrl);
	ctx.drawImage(img, 0, 0);

	if (data.annotations.length > 0) {
		// buildLayers decodes all RLE masks in parallel via Web Workers.
		// Pass scale=1 to export at full resolution without downscaling.
		const displayScale: DisplayScale = {
			originalWidth: width,
			originalHeight: height,
			displayWidth: width,
			displayHeight: height,
			scale: 1,
		};
		const { layers } = await buildLayers(data, EXPORT_SESSION.selectedAnnotations, vizSetting, displayScale);

		// Mask fill at the user-configured opacity, then border + text badges at
		// full opacity — mirrors how AnnotationCanvas composites the layers.
		ctx.globalAlpha = vizSetting.maskOpacity;
		ctx.drawImage(layers.mask, 0, 0);
		ctx.globalAlpha = 1;
		ctx.drawImage(layers.border, 0, 0);
		ctx.drawImage(layers.text, 0, 0);
	}

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob);
			else
				reject(
					new Error(`Failed to encode image: ${data.imageData.imageName}`),
				);
		}, "image/png");
	});
}

/**
 * Run `fn` over `items` with at most `concurrency` tasks in flight at once.
 * Results are returned in the same order as `items`.
 */
async function mapWithConcurrency<T, R>(
	items: T[],
	fn: (item: T) => Promise<R>,
	concurrency: number,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i]);
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, worker),
	);
	return results;
}

/**
 * Exports all annotated images from the project as a ZIP file.
 * Each image is composited: original photo → mask fill → boundaries → label badges.
 *
 * Mask fill opacity is taken from `vizSetting.maskOpacity` to match what the
 * user sees in the annotation view. Uses Web Workers for parallel RLE decoding
 * and a concurrency pool to bound peak memory usage on large projects.
 *
 * @param state      - The current project state
 * @param vizSetting - The user's current visualization settings
 */
export async function exportAllAnnotatedImages(
	state: ProjectState,
	vizSetting: VisualizationSetting,
): Promise<void> {
	if (state.dataList.length === 0) {
		throw new Error("No images available. Load a project first.");
	}

	const exportZip = new JSZip();

	await mapWithConcurrency(
		state.dataList,
		async (data) => {
			const blob = await renderAnnotatedImage(data, vizSetting);
			// Preserve the original filename but always output as PNG.
			const baseName = data.imageData.imageName.replace(/\.[^.]+$/, "");
			exportZip.file(`${baseName}.png`, blob);
		},
		EXPORT_CONCURRENCY,
	);

	// STORE (no recompression) — PNGs are already compressed.
	const zipBlob = await exportZip.generateAsync({
		type: "blob",
		compression: "STORE",
	});

	triggerDownload(zipBlob, `${state.projectName}_annotated_images.zip`);
}
