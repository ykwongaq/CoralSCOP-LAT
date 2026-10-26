export interface ImageData {
	/** Original image. Statistics and exports always use this one. */
	imageUrl: string;
	imageName: string;
	width: number;
	height: number;
	/**
	 * CLAHE-enhanced version of the image, same width and height. Missing
	 * until the project provides one or it is generated on demand.
	 */
	enhancedImageUrl?: string;
}
