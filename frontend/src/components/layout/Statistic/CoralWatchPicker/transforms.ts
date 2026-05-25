import type { Point, Color } from "../../../../types";
import { CORAL_WATCH_POINTS, OUTPUT_WIDTH, OUTPUT_HEIGHT } from "./constants";

function gaussianElimination(A: number[][], b: number[]): number[] {
	const n = b.length;
	const augmented = A.map((row, i) => [...row, b[i]]);

	// Forward elimination
	for (let i = 0; i < n; i++) {
		let maxRow = i;
		for (let k = i + 1; k < n; k++) {
			if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
				maxRow = k;
			}
		}
		[augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

		for (let k = i + 1; k < n; k++) {
			const factor = augmented[k][i] / augmented[i][i];
			for (let j = i; j <= n; j++) {
				augmented[k][j] -= factor * augmented[i][j];
			}
		}
	}

	// Back substitution
	const x = new Array(n);
	for (let i = n - 1; i >= 0; i--) {
		x[i] = augmented[i][n];
		for (let j = i + 1; j < n; j++) {
			x[i] -= augmented[i][j] * x[j];
		}
		x[i] /= augmented[i][i];
	}

	return x;
}

export function getPerspectiveTransform(src: Point[], dst: Point[]): number[] {
	const A: number[][] = [];
	for (let i = 0; i < 4; i++) {
		A.push([
			src[i].x,
			src[i].y,
			1,
			0,
			0,
			0,
			-dst[i].x * src[i].x,
			-dst[i].x * src[i].y,
		]);
		A.push([
			0,
			0,
			0,
			src[i].x,
			src[i].y,
			1,
			-dst[i].y * src[i].x,
			-dst[i].y * src[i].y,
		]);
	}

	const b = [
		dst[0].x,
		dst[0].y,
		dst[1].x,
		dst[1].y,
		dst[2].x,
		dst[2].y,
		dst[3].x,
		dst[3].y,
	];

	const h = gaussianElimination(A, b);
	h.push(1);
	return h;
}

export function applyMatrix(matrix: number[], x: number, y: number): Point {
	const w = matrix[6] * x + matrix[7] * y + 1;
	return {
		x: (matrix[0] * x + matrix[1] * y + matrix[2]) / w,
		y: (matrix[3] * x + matrix[4] * y + matrix[5]) / w,
	};
}

function getPixel(
	imageData: ImageData,
	x: number,
	y: number,
): { r: number; g: number; b: number; a: number } {
	const idx = (y * imageData.width + x) * 4;
	return {
		r: imageData.data[idx],
		g: imageData.data[idx + 1],
		b: imageData.data[idx + 2],
		a: imageData.data[idx + 3],
	};
}

export function getPixelBilinear(
	imageData: ImageData,
	x: number,
	y: number,
): { r: number; g: number; b: number; a: number } {
	const x1 = Math.floor(x);
	const x2 = Math.ceil(x);
	const y1 = Math.floor(y);
	const y2 = Math.ceil(y);

	if (x1 < 0 || x2 >= imageData.width || y1 < 0 || y2 >= imageData.height) {
		return { r: 255, g: 255, b: 255, a: 255 };
	}

	const dx = x - x1;
	const dy = y - y1;

	const c11 = getPixel(imageData, x1, y1);
	const c21 = getPixel(imageData, x2, y1);
	const c12 = getPixel(imageData, x1, y2);
	const c22 = getPixel(imageData, x2, y2);

	return {
		r: Math.round(
			c11.r * (1 - dx) * (1 - dy) +
				c21.r * dx * (1 - dy) +
				c12.r * (1 - dx) * dy +
				c22.r * dx * dy,
		),
		g: Math.round(
			c11.g * (1 - dx) * (1 - dy) +
				c21.g * dx * (1 - dy) +
				c12.g * (1 - dx) * dy +
				c22.g * dx * dy,
		),
		b: Math.round(
			c11.b * (1 - dx) * (1 - dy) +
				c21.b * dx * (1 - dy) +
				c12.b * (1 - dx) * dy +
				c22.b * dx * dy,
		),
		a: Math.round(
			c11.a * (1 - dx) * (1 - dy) +
				c21.a * dx * (1 - dy) +
				c12.a * (1 - dx) * dy +
				c22.a * dx * dy,
		),
	};
}

export function perspectiveWarpImage(
	image: HTMLImageElement,
	srcCorners: Point[],
): { imageData: ImageData; colors: Map<string, Color> } {
	// Destination corners (perfect rectangle)
	const dstCorners: Point[] = [
		{ x: 0, y: 0 },
		{ x: OUTPUT_WIDTH, y: 0 },
		{ x: OUTPUT_WIDTH, y: OUTPUT_HEIGHT },
		{ x: 0, y: OUTPUT_HEIGHT },
	];

	const matrix = getPerspectiveTransform(dstCorners, srcCorners);

	// Create temporary canvas with original image data
	const tempCanvas = document.createElement("canvas");
	tempCanvas.width = image.width;
	tempCanvas.height = image.height;
	const tempCtx = tempCanvas.getContext("2d");
	if (!tempCtx) throw new Error("Failed to get 2d context");
	tempCtx.drawImage(image, 0, 0);
	const srcImageData = tempCtx.getImageData(0, 0, image.width, image.height);

	// Create output image data
	const outputImageData = new ImageData(OUTPUT_WIDTH, OUTPUT_HEIGHT);

	// Apply transformation
	for (let y = 0; y < OUTPUT_HEIGHT; y++) {
		for (let x = 0; x < OUTPUT_WIDTH; x++) {
			const srcPoint = applyMatrix(matrix, x, y);
			const color = getPixelBilinear(srcImageData, srcPoint.x, srcPoint.y);

			const dstIdx = (y * OUTPUT_WIDTH + x) * 4;
			outputImageData.data[dstIdx] = color.r;
			outputImageData.data[dstIdx + 1] = color.g;
			outputImageData.data[dstIdx + 2] = color.b;
			outputImageData.data[dstIdx + 3] = color.a;
		}
	}

	// Sample colors at CoralWatch class positions
	const colors = new Map<string, Color>();
	for (const pt of CORAL_WATCH_POINTS) {
		const sx = Math.min(Math.max(Math.round(pt.x), 0), OUTPUT_WIDTH - 1);
		const sy = Math.min(Math.max(Math.round(pt.y), 0), OUTPUT_HEIGHT - 1);
		const idx = (sy * OUTPUT_WIDTH + sx) * 4;
		const r = outputImageData.data[idx];
		const g = outputImageData.data[idx + 1];
		const b = outputImageData.data[idx + 2];
		const a = outputImageData.data[idx + 3];
		colors.set(pt.label, { r, g, b, a });
	}

	return { imageData: outputImageData, colors };
}
