import triggerDownload from "../utils/download";
import type { ProjectState } from "../types";

/**
 * Exports the project's label list as a JSON file.
 * Each label is serialized as a dictionary with id, name, and status.
 *
 * @param state - The current project state
 * @returns Promise that resolves when the download is triggered
 */
export async function exportLabels(state: ProjectState): Promise<void> {
	if (state.labels.length === 0) {
		throw new Error("No labels available. Load a project first.");
	}

	const outputJson = state.labels.map((label) => ({
		id: label.id,
		name: label.name,
		status: label.status,
	}));

	const blob = new Blob([JSON.stringify(outputJson, null, 2)], {
		type: "application/json",
	});

	triggerDownload(blob, `${state.projectName}_labels.json`);
}
