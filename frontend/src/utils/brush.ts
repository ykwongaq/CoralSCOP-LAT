// Brush size is stored as a percentage of the image's longer side so the
// same setting feels consistent across images of different resolutions.

export const BRUSH_SIZE_MIN_PERCENT = 0.1;
export const BRUSH_SIZE_MAX_PERCENT = 10;
export const BRUSH_SIZE_DEFAULT_PERCENT = 1;

export function clampBrushPercent(percent: number): number {
	const clamped = Math.max(
		BRUSH_SIZE_MIN_PERCENT,
		Math.min(BRUSH_SIZE_MAX_PERCENT, percent),
	);
	return Math.round(clamped * 10) / 10;
}

/** Convert a brush size percentage into a diameter in image pixels. */
export function brushPercentToPixels(
	percent: number,
	width: number,
	height: number,
): number {
	const longSide = Math.max(width, height);
	if (!longSide) return 1;
	return Math.max(1, (percent / 100) * longSide);
}
