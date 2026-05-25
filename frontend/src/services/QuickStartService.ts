import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";
import { apiClient } from "./ApiClient";
import type { ProjectConfig } from "../types";

export interface QuickStartRequest {
	image: File;
	config: ProjectConfig;
	projectId?: string;
}

export function quickStart(
	request: QuickStartRequest,
	callbacks: ApiRequestCallbacks<Blob>,
): ApiRequestHandle {
	callbacks.onLoading?.();

	const formData = new FormData();
	formData.append("image", request.image);
	formData.append(
		"config",
		JSON.stringify({
			min_area: request.config.min_area,
			min_confidence: request.config.min_confidence,
			max_overlap: request.config.max_overlap,
		}),
	);
	if (request.projectId) {
		formData.append("projectId", request.projectId);
	}
	// model is intentionally omitted — backend defaults to None (no auto-segmentation)

	return apiClient.request<Blob>("/api/projects/quick-start", {
		method: "POST",
		body: formData,
		responseType: "blob",
		onError: callbacks.onError,
		onComplete: callbacks.onComplete,
	});
}
