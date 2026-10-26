import type { Point } from "../Point";
import type { BrushStroke } from "./BrushStroke";

/** The editable geometry at one point in time, for undo. */
export interface EditSnapshot {
	points: Point[];
	brushStrokes: BrushStroke[];
}

/**
 * An annotation currently being edited. The saved mask is the base; the
 * polygon and brush strokes are applied on top of it when saving.
 */
export interface EditPolygon {
	/** ID of the annotation whose segmentation is being edited. */
	annotationId: number;

	/** Current editable vertices (image pixel coordinates). */
	points: Point[];

	/**
	 * Vertices extracted from the saved mask. Only the area between these
	 * and `points` changes the mask on save. Also used by "reset".
	 */
	originalPoints: Point[];

	/** Brush strokes painted since the last save, each with its own width. */
	brushStrokes: BrushStroke[];

	/** Earlier states since the last save, most recent last. */
	undoStack: EditSnapshot[];
}
