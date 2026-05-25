import { type Annotation } from "./Annotation";

export interface PendingAnnotation extends Annotation {
	encodedLogit: string; // Base64 encoded logit data
}
