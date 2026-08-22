import type { Point } from "../Point";

/**
 * An annotation currently being edited as a polygon.
 */
export interface EditPolygon {
	/** ID of the annotation whose segmentation is being edited. */
	annotationId: number;

	/** Current editable vertices (image pixel coordinates). */
	points: Point[];

	/** Vertices as extracted at the start of editing, for "reset". */
	originalPoints: Point[];
}
