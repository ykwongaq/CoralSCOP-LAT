import { type CocoCategory } from "./CocoCategory";

import { type CocoAnnotation } from "./CocoAnnotation";
import type { ScaledLine } from "../annoations/ScaledLine";
import type CoralWatchCard from "../CoralWatch/CoralWatchCard";

export interface AnnotationFile {
	image: {
		image_filename: string;
		image_width: number;
		image_height: number;
		id: number;
	};
	annotations: CocoAnnotation[];
	categories: CocoCategory[];
	scaledLineList?: ScaledLine[];
	coralWatch?: CoralWatchCard;
}
