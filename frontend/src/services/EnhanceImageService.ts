import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";
import { apiClient } from "./ApiClient";

export interface EnhanceImageRequest {
	/** Original image to enhance. */
	image: Blob;
	imageName: string;
}

/**
 * Asks the server for a CLAHE-enhanced copy of an image. The result has the
 * same width and height as the input, so existing masks still line up.
 *
 * Returns an {@link ApiRequestHandle}; call `handle.cancel()` to abort.
 */
export function enhanceImage(
	request: EnhanceImageRequest,
	callbacks: ApiRequestCallbacks<Blob>,
): ApiRequestHandle {
	callbacks.onLoading?.();

	const form = new FormData();
	form.append("image", request.image, request.imageName);

	return apiClient.request<Blob>("/api/images/enhance", {
		method: "POST",
		body: form,
		responseType: "blob",
		onError: callbacks.onError,
		onComplete: callbacks.onComplete,
	});
}

/** Promise wrapper around {@link enhanceImage}, fetching the image from a URL. */
export async function enhanceImageFromUrl(
	imageUrl: string,
	imageName: string,
	signal?: AbortSignal,
): Promise<Blob> {
	const response = await fetch(imageUrl);
	if (!response.ok) {
		throw new Error(`Failed to load image (status ${response.status})`);
	}
	const image = await response.blob();

	return new Promise<Blob>((resolve, reject) => {
		const handle = enhanceImage(
			{ image, imageName },
			{
				onComplete: resolve,
				onError: (error) => reject(new Error(error.message)),
			},
		);
		signal?.addEventListener("abort", () => {
			handle.cancel();
			reject(new DOMException("Aborted", "AbortError"));
		});
	});
}
