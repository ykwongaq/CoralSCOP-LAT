import { type Label } from "./Label";
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
	promptMode: "point" | "polygon";

	currentDataIndex: number;

	// Point prompts for SAM inference (add mode)
	pointPrompts: PointPrompt[];

	// Vertices of the polygon being drawn (add mode, polygon prompt)
	polygonPoints: Point[];

	// Polygon currently being edited (edit mode)
	editPolygon: EditPolygon | null;

	selectedScaledLineId: number | null;
}
