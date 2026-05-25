import { type RLE } from "../RLE";

export interface CocoAnnotation {
	id: number;
	image_id: number;
	category_id: number;
	segmentation: RLE;
}
