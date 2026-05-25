export interface CompressedRLE {
	size: [number, number]; // [height, width]
	counts: string; // COCO compressed RLE counts string
}
