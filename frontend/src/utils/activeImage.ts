import type { ImageData } from "../types";

export type ImageVariant = "original" | "enhanced";

/** The version of an image that the annotation canvas and the models use. */
export interface ActiveImage {
	url: string;
	variant: ImageVariant;
	/**
	 * Key for the server-side SAM embedding. Each version gets its own key,
	 * so SAM never predicts on an embedding of the other version.
	 */
	embeddingStem: string;
}

export function imageStem(imageName: string): string {
	return imageName.replace(/\.[^.]+$/, "");
}

/**
 * Returns the enhanced image when it is turned on and available, otherwise
 * the original. Statistics and exports should keep using `imageData.imageUrl`
 * (the original), since enhancement changes colours.
 */
export function getActiveImage(
	imageData: ImageData,
	useEnhancedImage: boolean | undefined,
): ActiveImage {
	const stem = imageStem(imageData.imageName);
	if (useEnhancedImage && imageData.enhancedImageUrl) {
		return {
			url: imageData.enhancedImageUrl,
			variant: "enhanced",
			embeddingStem: `${stem}@clahe`,
		};
	}
	return { url: imageData.imageUrl, variant: "original", embeddingStem: stem };
}
