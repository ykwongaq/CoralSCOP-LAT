import type { RLE } from "../RLE";
export interface Annotation {
	// Coco encoded rle segmentation
	segmentation: RLE;

	// Label ID
	labelId: number;

	// Annotation ID
	id: number;
}
