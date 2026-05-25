import JSZip from "jszip";
import { apiClient } from "./ApiClient";
import triggerDownload from "../utils/download";
import type { ProjectState, RLE, CompressedRLE } from "../types";

// ---------------------------------------------------------------------------
// Export-specific types (segmentation uses CompressedRLE, not the in-memory RLE)
// ---------------------------------------------------------------------------

interface CocoExportAnnotation {
	id: number;
	image_id: number;
	category_id: number;
	segmentation: CompressedRLE;
}

interface CocoExportCategory {
	id: number;
	name: string;
	color: string;
	status: string[];
}

interface CocoExportFile {
	image: {
		image_filename: string;
		image_width: number;
		image_height: number;
		id: number;
	};
	annotations: CocoExportAnnotation[];
	categories: CocoExportCategory[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function encodeBatch(rles: RLE[]): Promise<CompressedRLE[]> {
	return new Promise((resolve, reject) => {
		apiClient.request<{ segmentation: CompressedRLE[] }>("/api/masks/encode", {
			method: "POST",
			body: { inputs: rles } as unknown as Record<string, unknown>,
			onError: (err) => reject(new Error(err.message)),
			onComplete: (data) => resolve(data.segmentation),
		});
	});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Exports all COCO-format annotation JSON files from the project as a ZIP.
 *
 * Each image produces one JSON file whose structure mirrors AnnotationFile:
 *   { image: {...}, annotations: [...], categories: [...] }
 * Segmentation masks are converted from uncompressed RLE (in-memory
 * representation) to COCO compressed RLE strings via a single request to the
 * backend `/api/masks/encode` endpoint, which parallelises the work
 * server-side with ProcessPoolExecutor.
 *
 * @param state - The current project state
 */
export async function exportAllCocoAnnotations(
	state: ProjectState,
): Promise<void> {
	if (state.dataList.length === 0) {
		throw new Error("No images available. Load a project first.");
	}

	// --- Step 1: flatten all RLEs and record which (image, annotation) each belongs to ---
	const allRLEs: RLE[] = [];
	// Parallel index: flat position i → { dataIndex, annotationIndex }
	const rleOwner: { dataIndex: number; annotationIndex: number }[] = [];

	for (let di = 0; di < state.dataList.length; di++) {
		const { annotations } = state.dataList[di];
		for (let ai = 0; ai < annotations.length; ai++) {
			allRLEs.push(annotations[ai].segmentation);
			rleOwner.push({ dataIndex: di, annotationIndex: ai });
		}
	}

	// --- Step 2: encode all RLEs in one request; the backend parallelises server-side ---
	const compressedRLEs = allRLEs.length === 0 ? [] : await encodeBatch(allRLEs);

	// --- Step 3: group compressed RLEs back by image (preserving annotation order) ---
	// perImageCompressed[di][ai] === compressedRLE for dataList[di].annotations[ai]
	const perImageCompressed: CompressedRLE[][] = state.dataList.map(() => []);
	for (let i = 0; i < rleOwner.length; i++) {
		perImageCompressed[rleOwner[i].dataIndex].push(compressedRLEs[i]);
	}

	// --- Step 4: build one JSON per image and pack into a ZIP ---
	const labelMap = new Map(state.labels.map((l) => [l.id, l]));
	const exportZip = new JSZip();

	for (let di = 0; di < state.dataList.length; di++) {
		const data = state.dataList[di];
		const compressed = perImageCompressed[di];

		// Only include categories referenced by this image's annotations.
		const usedLabelIds = new Set(data.annotations.map((a) => a.labelId));
		const categories: CocoExportCategory[] = Array.from(usedLabelIds).map(
			(id) => {
				const label = labelMap.get(id) ?? {
					id,
					name: `label_${id}`,
					status: [],
				};
				return {
					id: label.id,
					name: label.name,
					// color is not retained in the in-memory Label type; use a neutral default
					color: "#000000",
					status: label.status,
				};
			},
		);

		const annotations: CocoExportAnnotation[] = data.annotations.map(
			(ann, ai) => ({
				id: ann.id,
				image_id: data.id,
				category_id: ann.labelId,
				segmentation: compressed[ai],
			}),
		);

		const annotationFile: CocoExportFile = {
			image: {
				image_filename: data.imageData.imageName,
				image_width: data.imageData.width,
				image_height: data.imageData.height,
				id: data.id,
			},
			annotations,
			categories,
		};

		const baseName = data.imageData.imageName.replace(/\.[^.]+$/, "");
		exportZip.file(`${baseName}.json`, JSON.stringify(annotationFile, null, 2));
	}

	// DEFLATE: JSON text compresses well, so this produces significantly smaller ZIPs.
	const zipBlob = await exportZip.generateAsync({
		type: "blob",
		compression: "DEFLATE",
		compressionOptions: { level: 6 },
	});

	triggerDownload(zipBlob, `${state.projectName}_coco_annotations.zip`);
}
