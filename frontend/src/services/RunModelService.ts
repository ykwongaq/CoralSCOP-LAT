import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";
import type { RLE } from "../types/RLE";
import { apiClient } from "./ApiClient";

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

export interface RunModelConfig {
	model?: string | null; // "CoralSCOP" | "CoralTank"
	min_area?: number;
	min_confidence?: number;
	max_overlap?: number;
}

export interface RunModelRequest {
	image: Blob;
	imageName: string;
	config: RunModelConfig;
}

export interface RunModelImageInfo {
	image_filename: string;
	image_width: number;
	image_height: number;
	id: number;
}

export interface RunModelAnnotation {
	id: number;
	category_id: number;
	segmentation: RLE;
	area: number;
	bbox: [number, number, number, number]; // [x, y, width, height]
	score?: number;
}

export interface RunModelCategory {
	id: number;
	name: string;
	sub_categories: string[];
}

export interface RunModelResponse {
	image: RunModelImageInfo;
	annotations: RunModelAnnotation[];
	categories: RunModelCategory[];
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

/**
 * Runs model inference on a single image and returns the annotations.
 *
 * Returns an {@link ApiRequestHandle} immediately. Call `handle.cancel()` to
 * abort at any time.
 *
 * @example
 * const handle = runModel(
 *   { image: blob, imageName: "photo.jpg", config: { model: "CoralSCOP" } },
 *   {
 *     onLoading:  ()     => showLoading(),
 *     onError:    (err)  => showError(err.message),
 *     onComplete: (data) => handleAnnotations(data),
 *   }
 * );
 * // Later, if the user wants to cancel:
 * handle.cancel();
 */
export function runModel(
	request: RunModelRequest,
	callbacks: ApiRequestCallbacks<RunModelResponse>,
): ApiRequestHandle {
	callbacks.onLoading?.();

	const formData = new FormData();
	formData.append("image", request.image, request.imageName);
	formData.append("config", JSON.stringify(request.config));

	return apiClient.request<RunModelResponse>("/api/model/run", {
		method: "POST",
		body: formData,
		onError: callbacks.onError,
		onComplete: callbacks.onComplete,
	});
}
