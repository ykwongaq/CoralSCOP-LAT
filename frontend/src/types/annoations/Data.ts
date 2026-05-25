import type CoralWatchCard from "../CoralWatch/CoralWatchCard";
import { type ImageData } from "../ImageData";
import type { Annotation } from "./Annotation";
import type { ScaledLine } from "./ScaledLine";

export interface Data {
	id: number;
	imageData: ImageData;

	// List of masks
	annotations: Annotation[];

	// List of line references
	scaledLineList: ScaledLine[];

	coralWatch: CoralWatchCard | null;
}
