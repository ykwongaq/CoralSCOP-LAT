export interface SaveFilePickerOptions {
	suggestedName?: string;
	types?: Array<{
		description: string;
		accept: Record<string, string[]>;
	}>;
}

interface FileSystemWritableFileStream {
	write(data: Blob): Promise<void>;
	close(): Promise<void>;
}

interface FileSystemFileHandle {
	createWritable(): Promise<FileSystemWritableFileStream>;
}

interface ShowSaveFilePickerOptions {
	suggestedName?: string;
	types?: Array<{
		description: string;
		accept: Record<string, string[]>;
	}>;
}

interface WindowWithFilePicker extends Window {
	showSaveFilePicker(options: ShowSaveFilePickerOptions): Promise<FileSystemFileHandle>;
}

const DEFAULT_CORAL_TYPES = [
	{
		description: "CORAL Project Files",
		accept: { "application/octet-stream": [".coral"] },
	},
];

/**
 * Saves a Blob to disk using the native File System Access API when available.
 * Falls back to a standard anchor download in unsupported browsers.
 * Silently aborts if the user cancels the picker.
 */
export async function saveBlobWithPicker(
	blob: Blob,
	options: SaveFilePickerOptions = {},
): Promise<void> {
	const { suggestedName = "project.coral", types = DEFAULT_CORAL_TYPES } = options;

	const w = window as unknown as WindowWithFilePicker;
	if (typeof w.showSaveFilePicker === "function") {
		try {
			const handle = await w.showSaveFilePicker({
				suggestedName,
				types,
			});
			const writable = await handle.createWritable();
			await writable.write(blob);
			await writable.close();
			return;
		} catch (err) {
			// User cancelled the picker — silently abort.
			if (err instanceof DOMException && err.name === "AbortError") {
				return;
			}
			// Fall back to anchor download for other errors.
		}
	}

	// Fallback for browsers without File System Access API support.
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = suggestedName;
	a.click();
	URL.revokeObjectURL(url);
}
