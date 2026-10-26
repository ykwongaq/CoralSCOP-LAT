import { type Label } from "./Label";
import type { BrushStroke } from "./BrushStroke";
import type { EditPolygon } from "./EditPolygon";
import type { PendingAnnotation } from "./PendingAnnotation";
import type { Point } from "../Point";
import type { PointPrompt } from "./PointPrompt";

// Tool used while editing a mask:
//   "vertex" = drag/add polygon vertices
//   "brush"  = paint regions onto the mask
//   "eraser" = erase regions from the mask
export type EditTool = "vertex" | "brush" | "eraser";

// State for the annotation process
export default interface AnnotationSessionState {
	// Pending masks to be added to the annotation session
	pendingMask: PendingAnnotation | null;

	// Currently activate label ID
	activateLabel: Label | null;

	// Currently selected annotations in the images
	selectedAnnotations: number[];

	annotationMode: "select" | "add" | "edit";

	// Prompt mode for mask creation in add mode
	promptMode: "point" | "polygon" | "brush";

	currentDataIndex: number;

	// Point prompts for SAM inference (add mode)
	pointPrompts: PointPrompt[];

	// SAM mask after each point prompt (index i = after prompts 0..i), so
	// undoing a prompt can restore the previous mask without re-running SAM.
	// An entry is null until its prediction arrives.
	pendingMaskHistory: (PendingAnnotation | null)[];

	// Vertices of the polygon being drawn (add mode, polygon prompt)
	polygonPoints: Point[];

	// Brush strokes drawn in add mode (brush prompt), each a polyline
	brushStrokes: BrushStroke[];

	// Brush diameter as a percentage of the image's longer side
	brushSizePercent: number;

	// Tool used while editing a mask
	editTool: EditTool;

	// Polygon currently being edited (edit mode)
	editPolygon: EditPolygon | null;

	selectedScaledLineId: number | null;
}
