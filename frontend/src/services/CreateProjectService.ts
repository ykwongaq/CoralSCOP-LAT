import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";
import type { ImageData, ProjectConfig } from "../types";
import { apiClient } from "./ApiClient";

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

export interface CreateProjectRequest {
	images: ImageData[];
	config: ProjectConfig;
	model: string | null;
}

export interface CreateProjectResponse {
	downloadToken: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Creates a new project by uploading the selected images together with the
 * analysis configuration.
 *
 * Returns an {@link ApiRequestHandle} immediately. Call `handle.cancel()` at
 * any time to abort — this works even during the blob-conversion phase that
 * happens before the network request starts.
 *
 * Progress updates are delivered via SSE: the server should stream JSON lines
 *   {"type":"progress","value":N}   (N = 0–100)
 * followed by a final
 *   {"type":"complete","data":{projectId,name,createdAt}}
 *
 * @example
 * const handle = createProject(
 *   { images: state.imageDataList, config: state.config, model: state.model_selection },
 *   {
 *     onLoading:  ()          => showLoading({ title: "Creating…", progress: null }),
 *     onProgress: (pct)       => updateLoadingProgress(pct),
 *     onError:    (err)       => showError({ errorMessage: err.message, … }),
 *     onComplete: (data)      => { closeMessage(); navigate("/main"); },
 *   }
 * );
 * // Later, if the user wants to cancel:
 * handle.cancel();
 */
export function createProject(
	request: CreateProjectRequest,
	callbacks: ApiRequestCallbacks<CreateProjectResponse>,
): ApiRequestHandle {
	// `cancelled` guards the async preparation phase (blob URL → FormData).
	// Once the inner ApiClient handle exists, aborting is delegated to it.
	let cancelled = false;
	let innerHandle: ApiRequestHandle | null = null;

	// Signal "operation has started" before any async work so the UI can show
	// a loading indicator immediately.
	callbacks.onLoading?.();

	void (async () => {
		try {
			const formData = new FormData();
			const selected = request.images;

			for (const img of selected) {
				if (cancelled) return;

				// Blob URLs are created by URL.createObjectURL() in the uploader.
				// Fetching them gives back the original file data without re-reading disk.
				const res = await fetch(img.imageUrl);
				if (cancelled) return;

				const blob = await res.blob();
				formData.append("images", blob, img.imageName);
			}

			if (cancelled) return;

			formData.append("config", JSON.stringify(request.config));
			if (request.model !== null) {
				formData.append("model", request.model);
			}

			innerHandle = apiClient.request<CreateProjectResponse>("/api/projects", {
				method: "POST",
				body: formData,
				streaming: true,
				onProgress: callbacks.onProgress,
				onError: callbacks.onError,
				onComplete: callbacks.onComplete,
			});
		} catch (err) {
			if (cancelled) return;
			callbacks.onError?.({
				message: err instanceof Error ? err.message : String(err),
			});
		}
	})();

	return {
		cancel: () => {
			cancelled = true;
			innerHandle?.cancel();
		},
	};
}
