import {
	useRef,
	useState,
	useCallback,
	type RefObject,
	type DragEvent,
	type ChangeEvent,
} from "react";
import type { ImageSelectionData } from "../types";

const IMAGE_MIME_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/bmp",
	"image/tiff",
	"image/svg+xml",
]);

function isImageFile(file: File): boolean {
	return (
		IMAGE_MIME_TYPES.has(file.type) ||
		/\.(jpe?g|png|gif|webp|bmp|tiff?|svg)$/i.test(file.name)
	);
}

function fileToImageData(file: File): ImageSelectionData {
	return {
		imageUrl: URL.createObjectURL(file),
		imageName: file.name,
		selected: true,
		width: 0, // Placeholder, can be set later when image is loaded
		height: 0, // Placeholder, can be set later when image is loaded
	};
}

async function readDirectoryEntry(
	entry: FileSystemDirectoryEntry,
): Promise<File[]> {
	const files: File[] = [];
	const reader = entry.createReader();

	const readBatch = (): Promise<FileSystemEntry[]> =>
		new Promise((resolve, reject) => reader.readEntries(resolve, reject));

	let batch = await readBatch();
	while (batch.length > 0) {
		for (const child of batch) {
			if (child.isFile) {
				const file = await new Promise<File>((resolve, reject) =>
					(child as FileSystemFileEntry).file(resolve, reject),
				);
				if (isImageFile(file)) files.push(file);
			} else if (child.isDirectory) {
				const nested = await readDirectoryEntry(
					child as FileSystemDirectoryEntry,
				);
				files.push(...nested);
			}
		}
		batch = await readBatch();
	}

	return files;
}

async function extractFilesFromDataTransfer(
	transfer: DataTransfer,
): Promise<File[]> {
	const files: File[] = [];

	if (transfer.items) {
		const promises: Promise<File[]>[] = [];

		for (const item of Array.from(transfer.items)) {
			const entry = item.webkitGetAsEntry?.();
			if (entry?.isDirectory) {
				promises.push(readDirectoryEntry(entry as FileSystemDirectoryEntry));
			} else if (entry?.isFile) {
				promises.push(
					new Promise((resolve, reject) =>
						(entry as FileSystemFileEntry).file(
							(file) => resolve(isImageFile(file) ? [file] : []),
							reject,
						),
					),
				);
			} else {
				const file = item.getAsFile();
				if (file && isImageFile(file)) files.push(file);
			}
		}

		const results = await Promise.all(promises);
		files.push(...results.flat());
	} else {
		for (const file of Array.from(transfer.files)) {
			if (isImageFile(file)) files.push(file);
		}
	}

	return files;
}

export interface UseImageUploaderResult {
	isDragging: boolean;
	fileInputRef: RefObject<HTMLInputElement | null>;
	handleDragOver: (e: DragEvent) => void;
	handleDragLeave: (e: DragEvent) => void;
	handleDrop: (e: DragEvent) => Promise<void>;
	handleFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
	openFolderSelect: () => void;
}

export function useImageUploader(
	onImages: (images: ImageSelectionData[]) => void,
	fileInputRefHTML?: HTMLInputElement,
): UseImageUploaderResult {
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(fileInputRefHTML ?? null);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			const files = await extractFilesFromDataTransfer(e.dataTransfer);
			if (files.length > 0) {
				onImages(files.map(fileToImageData));
			}
		},
		[onImages],
	);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files ?? []).filter(isImageFile);
			if (files.length > 0) {
				onImages(files.map(fileToImageData));
			}
			// Reset so the same folder can be re-selected
			e.target.value = "";
		},
		[onImages],
	);

	const openFolderSelect = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	return {
		isDragging,
		fileInputRef,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleFileInputChange,
		openFolderSelect,
	};
}
