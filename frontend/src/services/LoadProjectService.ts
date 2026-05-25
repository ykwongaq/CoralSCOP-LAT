import JSZip from "jszip";
import type {
	ProjectState,
	Data,
	Annotation,
	Label,
	ScaledLine,
	AnnotationFile,
	CoralWatchCard,
} from "../types";

export interface LoadProjectCallbacks {
	onLoading?: () => void;
	onProgress?: (progress: number) => void;
	onError?: (error: { message: string }) => void;
	onComplete?: (state: ProjectState) => void;
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
		const annotationMap = new Map<string, JSZip.JSZipObject>(); // stem → entry
		let projectInfoEntry: JSZip.JSZipObject | null = null;

		zip.forEach((path, entry) => {
			if (entry.dir) return;
			if (path.startsWith("images/")) {
				imageEntries.push(entry);
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

		// Phase 1 (10–70 %): parse images and annotations
		for (let i = 0; i < n; i++) {
			const imageEntry = imageEntries[i];
			const imageName = imageEntry.name.replace("images/", "");
			const stem = imageName.replace(/\.[^.]+$/, "");

			callbacks.onProgress?.(10 + Math.round((i / n) * 60));

			const imageBlob = await imageEntry.async("blob");
			const imageUrl = URL.createObjectURL(imageBlob);

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

				for (const cat of annoFile.categories) {
					if (!labelsMap.has(cat.id)) {
						labelsMap.set(cat.id, {
							id: cat.id,
							name: cat.name,
							status: cat.status ?? [],
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
				imageData: { imageUrl, imageName, width, height },
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
		// For sample images, sessionId comes from sample_id (shared embeddings).
		// For regular projects, sessionId is the projectId (backward compatible).
		const sessionId = (info.sample_id as string) ?? projectId;

		callbacks.onProgress?.(100);
		callbacks.onComplete?.({
			dataList,
			labels: Array.from(labelsMap.values()),
			projectName,
			projectId,
			sessionId,
			sourceFile: fileBuffer,
		});
	} catch (err) {
		callbacks.onError?.({
			message: err instanceof Error ? err.message : String(err),
		});
	}
}
