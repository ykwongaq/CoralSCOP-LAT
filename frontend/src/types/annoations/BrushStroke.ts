import type { Point } from "../Point";

/** A brush stroke: a polyline plus the brush width it was painted with. */
export interface BrushStroke {
	points: Point[];
	width: number;
}
