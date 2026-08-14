import { apiClient, API_BASE } from "./ApiClient";
import type {
	ApiError,
	ApiRequestCallbacks,
	ApiRequestHandle,
} from "../types/api";
import type { RLE } from "../types/RLE";
import type { PointPrompt } from "../types";

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

export interface CreateSamSessionResponse {
	session_id: string;
}

export interface UploadEmbeddingRequest {
	sessionId: string;
	stem: string;
	data: ArrayBuffer;
}

export interface GenerateEmbeddingRequest {
	sessionId: string;
	stem: string;
	image: Blob;
}

export interface PredictInstanceRequest {
	sessionId: string;
	stem: string;
	inputPrompts: PointPrompt[];
	maskInput?: string; // base64-encoded .npy bytes, shape [1, 256, 256] float32; optional mask input from a previous prediction
}

export interface PredictInstanceResponse {
	mask: RLE;
	bestMaskLogit: string; // base64-encoded .npy bytes, shape [1, 256, 256] float32
}

/**
 * Marker included in the server's 404 detail when an embedding is missing,
 * so the client can distinguish it from other prediction errors.
 */
export const EMBEDDING_MISSING_MARKER = "EMBEDDING_MISSING";

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Creates a new SAM embedding session on the server.
 *
 * The returned `session_id` must be passed to every subsequent
 * {@link uploadEmbedding} call and to the predict endpoint.
 * Call {@link releaseSession} when you want to release the in-memory
 * cache for a temporary session while leaving persisted files intact.
 */
export function createSamSession(
	callbacks: ApiRequestCallbacks<CreateSamSessionResponse>,
): ApiRequestHandle {
	return apiClient.request<CreateSamSessionResponse>("/api/sam/sessions", {
		method: "POST",
		onError: callbacks.onError,
		onComplete: callbacks.onComplete,
	});
}

/**
 * Uploads a single .pt embedding file into an existing session.
 *
 * @param request.sessionId  UUID returned by {@link createSamSession}
 * @param request.stem       Image filename without extension (e.g. "DSC_0001")
 * @param request.data       Raw bytes of the `torch.save(state)` .pt file
 */
export function uploadEmbedding(
	request: UploadEmbeddingRequest,
	callbacks: ApiRequestCallbacks<void>,
): ApiRequestHandle {
	const { sessionId, stem, data } = request;
	const form = new FormData();
	form.append("file", new Blob([data]), `${stem}.pt`);

	return apiClient.request<void>(
		`/api/sam/sessions/${encodeURIComponent(sessionId)}/embeddings/${encodeURIComponent(stem)}`,
		{
			method: "POST",
			body: form,
			onError: callbacks.onError,
			onComplete: callbacks.onComplete,
		},
	);
}

/**
 * Generates and persists a SAM embedding for an image on the server.
 *
 * The frontend calls this when {@link predictInstance} reports a missing
 * embedding, re-sending the current image so the server can rebuild it.
 *
 * @param request.sessionId  UUID identifying the embedding session
 * @param request.stem       Image filename without extension (e.g. "DSC_0001")
 * @param request.image      The source image blob to embed
 */
export function generateEmbedding(
	request: GenerateEmbeddingRequest,
	callbacks: ApiRequestCallbacks<void>,
): ApiRequestHandle {
	const { sessionId, stem, image } = request;
	const form = new FormData();
	form.append("image", image, `${stem}.png`);

	return apiClient.request<void>(
		`/api/sam/sessions/${encodeURIComponent(sessionId)}/embeddings/${encodeURIComponent(stem)}/generate`,
		{
			method: "POST",
			body: form,
			onError: callbacks.onError,
			onComplete: callbacks.onComplete,
		},
	);
}

/**
 * Returns true when an error indicates the server has no embedding for the
 * requested image and the client should re-send the image to rebuild it.
 */
export function isMissingEmbeddingError(error: ApiError): boolean {
	return (
		error.status === 404 && error.message.includes(EMBEDDING_MISSING_MARKER)
	);
}

export function predictInstance(
	request: PredictInstanceRequest,
	callbacks: ApiRequestCallbacks<PredictInstanceResponse>,
): ApiRequestHandle {
	const body: Record<string, unknown> = {
		session_id: request.sessionId,
		stem: request.stem,
		input_points: request.inputPrompts.map((p) => [p.x, p.y]),
		input_labels: request.inputPrompts.map((p) =>
			p.type === "positive" ? 1 : 0,
		),
	};
	if (request.maskInput !== undefined) {
		body.mask_input = request.maskInput;
	}

	return apiClient.request<{ mask: RLE; best_mask_logit: string }>(
		"/api/sam/predict/",
		{
			method: "POST",
			body,
			onError: callbacks.onError,
			onComplete: (data) => {
				callbacks.onComplete?.({
					mask: data.mask,
					bestMaskLogit: data.best_mask_logit,
				});
			},
		},
	);
}

/**
 * Runs a prediction, and if the server reports a missing embedding, fetches
 * the source image from {@link imageUrl}, asks the server to rebuild the
 * embedding, and transparently retries the prediction.
 */
export function predictInstanceWithRegeneration(
	request: PredictInstanceRequest,
	imageUrl: string,
	callbacks: ApiRequestCallbacks<PredictInstanceResponse>,
): ApiRequestHandle {
	const run = (): ApiRequestHandle =>
		predictInstance(request, {
			onComplete: callbacks.onComplete,
			onError: (error) => {
				if (!isMissingEmbeddingError(error)) {
					callbacks.onError?.(error);
					return;
				}

				void (async () => {
					try {
						const response = await fetch(imageUrl);
						if (!response.ok) {
							throw new Error(
								`Failed to load image (status ${response.status})`,
							);
						}
						const blob = await response.blob();
						generateEmbedding(
							{
								sessionId: request.sessionId,
								stem: request.stem,
								image: blob,
							},
							{
								onComplete: () => run(),
								onError: callbacks.onError,
							},
						);
					} catch (err) {
						callbacks.onError?.({
							message: err instanceof Error ? err.message : String(err),
						});
					}
				})();
			},
		});

	return run();
}

/**
 * Deletes a SAM session and all its stored embeddings immediately.
 * Fire-and-forget — errors are silently ignored.
 * Should be called when the user closes a project or loads a new one.
 */
export function releaseSession(sessionId: string): void {
	apiClient.request(`/api/sam/sessions/${encodeURIComponent(sessionId)}`, {
		method: "DELETE",
	});
}

/**
 * Releases a SAM session's cache during a page unload event (tab close / refresh).
 * Uses `fetch` with `keepalive: true` so the request survives page teardown.
 * `apiClient` wraps an AbortController and is not safe to use in `beforeunload`.
 */
export function releaseSessionOnUnload(sessionId: string): void {
	void fetch(`${API_BASE}/api/sam/sessions/${encodeURIComponent(sessionId)}`, {
		method: "DELETE",
		keepalive: true,
	});
}
