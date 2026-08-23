import { type Label } from "./Label";
import type { BrushStroke } from "./BrushStroke";
import type { EditPolygon } from "./EditPolygon";
import type { PendingAnnotation } from "./PendingAnnotation";
import type { Point } from "../Point";
import type { PointPrompt } from "./PointPrompt";

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

	// Vertices of the polygon being drawn (add mode, polygon prompt)
	polygonPoints: Point[];

	// Brush strokes drawn in add mode (brush prompt), each a polyline
	brushStrokes: BrushStroke[];

	// Brush diameter in image pixels
	brushSize: number;

	// Tool used while editing a polygon ("vertex" = drag/add vertices,
	// "brush" = paint additional regions)
	editTool: "vertex" | "brush";

	// Polygon currently being edited (edit mode)
	editPolygon: EditPolygon | null;

	selectedScaledLineId: number | null;
}
