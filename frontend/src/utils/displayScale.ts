export const MAX_DISPLAY_DIM = 1024;

export type DisplayScale = {
	originalWidth: number;
	originalHeight: number;
	displayWidth: number;
	displayHeight: number;
	scale: number;
};

export function computeDisplayScale(
	originalWidth: number,
	originalHeight: number,
): DisplayScale {
	const scale = Math.min(
		1,
		MAX_DISPLAY_DIM / Math.max(originalWidth, originalHeight),
	);
	return {
		originalWidth,
		originalHeight,
		displayWidth: Math.round(originalWidth * scale),
		displayHeight: Math.round(originalHeight * scale),
		scale,
	};
}
