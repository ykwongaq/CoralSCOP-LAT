import { type Label } from "./Label";
import type { PendingAnnotation } from "./PendingAnnotation";
import type { PointPrompt } from "./PointPrompt";

// State for the annotation process
export default interface AnnotationSessionState {
	// Pending masks to be added to the annotation session
	pendingMask: PendingAnnotation | null;

	// Currently activate label ID
	activateLabel: Label | null;

	// Currently selected annotations in the images
	selectedAnnotations: number[];

	annotationMode: "select" | "add";

	currentDataIndex: number;

	// Point prompts for SAM inference (add mode)
	pointPrompts: PointPrompt[];

	selectedScaledLineId: number | null;
}
