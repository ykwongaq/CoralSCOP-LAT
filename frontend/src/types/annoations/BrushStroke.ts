import type { Point } from "../Point";

/** A brush stroke: a polyline plus the brush width it was painted with. */
export interface BrushStroke {
	points: Point[];
	/** Stroke width in image pixels. */
	width: number;
	/** When true the stroke removes area from the mask instead of adding it. */
	erase?: boolean;
}
