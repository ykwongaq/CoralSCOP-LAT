/// <reference lib="webworker" />
import { decodeRLE } from "./cocoRle";
import type { RLE } from "../types";

type WorkerInput = {
	rles: RLE[];
	annotations: Array<{ id: number; labelId: number }>;
	selectedAnnotationIds: number[];
	hiddenLabelIds: number[];
	colorMap: Record<number, [number, number, number]>;
	selectedRGB: [number, number, number];
	displayScale: {
		displayWidth: number;
		displayHeight: number;
		originalWidth: number;
		originalHeight: number;
		scale: number;
	};
};

type WorkerOutput = {
	maskBuffer: ArrayBuffer;
	borderBuffer: ArrayBuffer;
	centroids: Array<{ cx: number; cy: number; labelId: number }>;
};

self.onmessage = (e: MessageEvent<WorkerInput>) => {
	const {
		rles,
		annotations,
		selectedAnnotationIds,
		hiddenLabelIds,
		colorMap,
		selectedRGB,
		displayScale,
	} = e.data;

	const {
		displayWidth: width,
		displayHeight: height,
		originalWidth: originalWidthVar,
		originalHeight: originalHeightVar,
		scale,
	} = displayScale;

	const hiddenSet = new Set(hiddenLabelIds);
	const selectedSet = new Set(selectedAnnotationIds);

	const maskData = new Uint8ClampedArray(width * height * 4);
	const borderData = new Uint8ClampedArray(width * height * 4);
	const centroids: Array<{ cx: number; cy: number; labelId: number }> = [];
	const edges: Array<{
		x: number;
		y: number;
		r: number;
		g: number;
		b: number;
	}> = [];

	for (let annIdx = 0; annIdx < annotations.length; annIdx++) {
		const ann = annotations[annIdx];

		if (hiddenSet.has(ann.labelId)) {
			continue;
		}

		const pixelMask = decodeRLE(rles[annIdx]);
		const [r, g, b] = selectedSet.has(ann.id)
			? selectedRGB
			: colorMap[ann.labelId] ?? [128, 128, 128];

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

			maskData[idx] = r;
			maskData[idx + 1] = g;
			maskData[idx + 2] = b;
			maskData[idx + 3] = 255;

			const isEdge =
				(origX > 0 && pixelMask[i - 1] === 0) ||
				(origX < originalWidthVar - 1 && pixelMask[i + 1] === 0) ||
				(origY > 0 && pixelMask[i - originalWidthVar] === 0) ||
				(origY < originalHeightVar - 1 &&
					pixelMask[i + originalWidthVar] === 0);

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
	const r2 = boundaryRadius * boundaryRadius;

	for (const { x, y, r, g, b } of edges) {
		for (let dy = -boundaryRadius; dy <= boundaryRadius; dy++) {
			for (let dx = -boundaryRadius; dx <= boundaryRadius; dx++) {
				if (dx * dx + dy * dy > r2) continue;

				const px = x + dx;
				const py = y + dy;
				if (px < 0 || px >= width || py < 0 || py >= height) continue;
				const pIdx = (py * width + px) * 4;
				borderData[pIdx] = r;
				borderData[pIdx + 1] = g;
				borderData[pIdx + 2] = b;
				borderData[pIdx + 3] = 255;
			}
		}
	}

	const output: WorkerOutput = {
		maskBuffer: maskData.buffer,
		borderBuffer: borderData.buffer,
		centroids,
	};

	self.postMessage(output, [maskData.buffer, borderData.buffer]);
};
