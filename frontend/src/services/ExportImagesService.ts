import JSZip from "jszip";
import triggerDownload from "../utils/download";
import type { ProjectState } from "../types";

/**
 * Exports all original images from the project as a ZIP file.
 * Uses the already-loaded image blob URLs for maximum speed - no re-unzipping needed.
 *
 * @param state - The current project state
 * @returns Promise that resolves when the download is triggered
 */
export async function exportAllImages(state: ProjectState): Promise<void> {
	if (state.dataList.length === 0) {
		throw new Error("No images available. Load a project first.");
	}

	// Create a new ZIP for the images
	const exportZip = new JSZip();

	// Fetch all images in parallel from their blob URLs (already in memory)
	await Promise.all(
		state.dataList.map(async (data) => {
			const imageName = data.imageData.imageName;
			const response = await fetch(data.imageData.imageUrl);
			const imageBlob = await response.blob();
			exportZip.file(imageName, imageBlob);
		}),
	);

	// Generate the ZIP blob with STORE compression for faster generation
	// (images are already compressed, so DEFLATE doesn't help much)
	const blob = await exportZip.generateAsync({
		type: "blob",
		compression: "STORE",
	});

	// Trigger download
	triggerDownload(blob, `${state.projectName}_images.zip`);
}
