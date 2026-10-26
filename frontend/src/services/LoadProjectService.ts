import JSZip from "jszip";
import { fromCocoTaxonomy } from "../utils/taxonomy";
import type {
	ProjectState,
	Data,
	Annotation,
	Label,
	ScaledLine,
	AnnotationFile,
	CoralWatchCard,
} from "../types";

/** Folder inside a .coral file holding CLAHE-enhanced copies of the images. */
export const ENHANCED_IMAGES_FOLDER = "images_enhanced/";

export interface LoadProjectCallbacks {
	onLoading?: () => void;
	onProgress?: (progress: number) => void;
	onError?: (error: { message: string }) => void;
	onComplete?: (state: ProjectState) => void;
}

/**
 * Returns a random UUID v4. `crypto.randomUUID` only exists on HTTPS or
 * localhost, so fall back to `crypto.getRandomValues` on plain HTTP.
 */
function newSessionId(): string {
	if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
	const b = crypto.getRandomValues(new Uint8Array(16));
	b[6] = (b[6] & 0x0f) | 0x40;
	b[8] = (b[8] & 0x3f) | 0x80;
	const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Unzips a .coral project file (ZIP archive) in the browser and:
 *  - Creates object URLs for images (in-memory, current session only)
 *  - Parses annotation JSON files into the ProjectState shape
 *  - Requires `project_info.json` with a `project_id` field
 *
 * Progress is reported from 0–100 via onProgress.
 */
export async function loadProject(
	file: File,
	callbacks: LoadProjectCallbacks,
): Promise<void> {
	callbacks.onLoading?.();

	try {
		callbacks.onProgress?.(5);

		const fileBuffer = await file.arrayBuffer();
		const zip = await JSZip.loadAsync(fileBuffer);

		// Bucket ZIP entries by folder
		const imageEntries: JSZip.JSZipObject[] = [];
		// CLAHE-enhanced copies, matched to the original image by filename stem.
		const enhancedMap = new Map<string, JSZip.JSZipObject>(); // stem → entry
		const annotationMap = new Map<string, JSZip.JSZipObject>(); // stem → entry
		let projectInfoEntry: JSZip.JSZipObject | null = null;

		zip.forEach((path, entry) => {
			if (entry.dir) return;
			if (path.startsWith("images/")) {
				imageEntries.push(entry);
			} else if (path.startsWith(ENHANCED_IMAGES_FOLDER)) {
				const stem = path
					.slice(ENHANCED_IMAGES_FOLDER.length)
					.replace(/\.[^.]+$/, "");
				enhancedMap.set(stem, entry);
			} else if (path.startsWith("annotations/")) {
				const stem = path.replace("annotations/", "").replace(/\.json$/, "");
				annotationMap.set(stem, entry);
			} else if (path === "project_info.json") {
				projectInfoEntry = entry;
			}
		});

		// Sort alphabetically to match the order the backend used when building the zip
		imageEntries.sort((a, b) => a.name.localeCompare(b.name));

		const projectName = file.name.replace(/\.coral$/, "");
		const n = imageEntries.length;
		const labelsMap = new Map<number, Label>();
		const dataList: Data[] = [];
		let excludedLabelIds: number[] = [];

		// Phase 1 (10–70 %): parse images and annotations
		for (let i = 0; i < n; i++) {
			const imageEntry = imageEntries[i];
			const imageName = imageEntry.name.replace("images/", "");
			const stem = imageName.replace(/\.[^.]+$/, "");

			callbacks.onProgress?.(10 + Math.round((i / n) * 60));

			const imageBlob = await imageEntry.async("blob");
			const imageUrl = URL.createObjectURL(imageBlob);

			const enhancedEntry = enhancedMap.get(stem);
			const enhancedImageUrl = enhancedEntry
				? URL.createObjectURL(await enhancedEntry.async("blob"))
				: undefined;

			let annotations: Annotation[] = [];
			let scaledLineList: ScaledLine[] = [];
			let coralWatch: CoralWatchCard | null = null;
			const annoEntry = annotationMap.get(stem);

			if (annoEntry) {
				const annoFile = JSON.parse(
					await annoEntry.async("text"),
				) as AnnotationFile;
				scaledLineList = annoFile.scaledLineList ?? [];
				coralWatch = annoFile.coralWatch ?? null;

				if (
					excludedLabelIds.length === 0 &&
					annoFile.excluded_label_ids &&
					annoFile.excluded_label_ids.length > 0
				) {
					excludedLabelIds = annoFile.excluded_label_ids;
				}

				for (const cat of annoFile.categories) {
					if (!labelsMap.has(cat.id)) {
						labelsMap.set(cat.id, {
							id: cat.id,
							name: cat.name,
							status: cat.status ?? [],
							type: cat.type ?? "simple",
							...(cat.taxonomy
								? { taxonomy: fromCocoTaxonomy(cat.taxonomy) }
								: {}),
						});
					}
				}

				annotations = annoFile.annotations.map((a) => ({
					segmentation: a.segmentation,
					labelId: a.category_id,
					id: a.id,
				}));
			}

			// Get the image height and width
			const { image_width: width, image_height: height } = annoEntry
				? JSON.parse(await annoEntry.async("text")).image
				: { image_width: 0, image_height: 0 };

			dataList.push({
				id: i,
				imageData: { imageUrl, imageName, width, height, enhancedImageUrl },
				annotations,
				scaledLineList,
				coralWatch,
			});
		}

		callbacks.onProgress?.(70);

		// Phase 2 (70–95 %): resolve SAM session from the current project format
		if (projectInfoEntry === null) {
			throw new Error("Unsupported project file: missing project_info.json.");
		}

		const info = JSON.parse(
			await (projectInfoEntry as JSZip.JSZipObject).async("text"),
		) as Record<string, unknown>;
		if (typeof info.project_id !== "string" || info.project_id.trim() === "") {
			throw new Error(
				"Unsupported project file: missing project_id in project_info.json.",
			);
		}

		const projectId = info.project_id;
		// Every opened project gets its own SAM session, so two tabs or users
		// with the same file never share (or delete) each other's embeddings.
		// Embeddings are generated on the server on the first click.
		const sessionId = newSessionId();

		callbacks.onProgress?.(100);
		callbacks.onComplete?.({
			dataList,
			labels: Array.from(labelsMap.values()),
			projectName,
			projectId,
			sessionId,
			sourceFile: fileBuffer,
			excludedLabelIds,
			useEnhancedImage: info.use_enhanced_image === true,
		});
	} catch (err) {
		callbacks.onError?.({
			message: err instanceof Error ? err.message : String(err),
		});
	}
}
