import { useEffect, useRef } from "react";
import { useAnnotationSession, useProject } from "../store";
import { enhanceImageFromUrl } from "../services";
import { getActiveImage, type ActiveImage } from "../utils";

/**
 * The image version (original or enhanced) used by the annotation canvas and
 * the models for the current image, or null when no image is loaded.
 */
export function useActiveImage(): ActiveImage | null {
	const { projectState } = useProject();
	const { annotationSessionState } = useAnnotationSession();
	const data = projectState.dataList[annotationSessionState.currentDataIndex];
	return data
		? getActiveImage(data.imageData, projectState.useEnhancedImage)
		: null;
}

/**
 * Keeps the enhanced image in sync with the "Enhanced image" switch. Mount it
 * once, in the annotation panel.
 *
 * - When the switch is on and the current image has no enhanced copy, asks
 *   the server to make one (the result is kept and saved with the project).
 * - When the image in use changes between original and enhanced, clears any
 *   in-progress SAM point prompt, since it was made on the other version.
 */
export function useEnhancedImageSync(): void {
	const { projectState, projectDispatch } = useProject();
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();

	const dataIndex = annotationSessionState.currentDataIndex;
	const data = projectState.dataList[dataIndex];
	const useEnhanced = projectState.useEnhancedImage === true;

	const dataId = data?.id;
	const imageUrl = data?.imageData.imageUrl;
	const imageName = data?.imageData.imageName;
	const enhancedImageUrl = data?.imageData.enhancedImageUrl;

	const status = annotationSessionState.enhancedImageStatus;
	const statusRef = useRef(status);
	const currentDataIdRef = useRef(dataId);
	useEffect(() => {
		statusRef.current = status;
		currentDataIdRef.current = dataId;
	}, [status, dataId]);

	// One request per image at a time.
	const inFlightRef = useRef(new Map<number, AbortController>());

	// --- Generate the enhanced image on demand ---
	useEffect(() => {
		const setStatus = (
			status: "idle" | "loading" | "error",
			error: string | null = null,
		) => {
			if (status === statusRef.current && status !== "error") return;
			statusRef.current = status;
			annotationSessionDispatch({
				type: "SET_ENHANCED_IMAGE_STATUS",
				payload: { status, error },
			});
		};

		if (
			!useEnhanced ||
			dataId === undefined ||
			!imageUrl ||
			!imageName ||
			enhancedImageUrl
		) {
			setStatus("idle");
			return;
		}

		setStatus("loading");
		const inFlight = inFlightRef.current;
		if (inFlight.has(dataId)) return;

		const controller = new AbortController();
		inFlight.set(dataId, controller);

		enhanceImageFromUrl(imageUrl, imageName, controller.signal)
			.then((blob) => {
				projectDispatch({
					type: "SET_ENHANCED_IMAGE_URL",
					payload: { dataId, enhancedImageUrl: URL.createObjectURL(blob) },
				});
			})
			.catch((err: unknown) => {
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.error("Image enhancement failed:", err);
				if (currentDataIdRef.current === dataId) {
					setStatus(
						"error",
						err instanceof Error ? err.message : String(err),
					);
				}
			})
			.finally(() => {
				inFlight.delete(dataId);
			});
	}, [
		useEnhanced,
		dataId,
		imageUrl,
		imageName,
		enhancedImageUrl,
		projectDispatch,
		annotationSessionDispatch,
	]);

	// Cancel outstanding requests when the panel unmounts.
	useEffect(() => {
		const inFlight = inFlightRef.current;
		return () => {
			inFlight.forEach((controller) => controller.abort());
			inFlight.clear();
		};
	}, []);

	// --- Clear the SAM prompt when the image version changes ---
	const activeStem = data
		? getActiveImage(data.imageData, useEnhanced).embeddingStem
		: null;
	const previousRef = useRef({ dataIndex, activeStem });
	useEffect(() => {
		const previous = previousRef.current;
		previousRef.current = { dataIndex, activeStem };
		// Changing images already clears prompts (SET_CURRENT_DATA_INDEX).
		if (previous.dataIndex !== dataIndex) return;
		if (previous.activeStem === activeStem) return;
		annotationSessionDispatch({ type: "CLEAR_POINT_PROMPTS" });
		annotationSessionDispatch({ type: "CLEAR_PENDING_MASK" });
	}, [dataIndex, activeStem, annotationSessionDispatch]);
}
