import styles from "./ImageUploader.module.css";
import type { ImageData } from "../../../types";
import { useImageUploader } from "../../../hooks/useImageUploader";
import Button from "../Button";
interface ImageUploaderProps {
	onImages: (images: ImageData[]) => void;
}

export default function ImageUploader({ onImages }: ImageUploaderProps) {
	const {
		isDragging,
		fileInputRef,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleFileInputChange,
		openFolderSelect,
	} = useImageUploader(onImages);

	return (
		<div
			className={`${styles.dropContainer}${isDragging ? ` ${styles.dropContainerActive}` : ""}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className={styles.dropText}>
				Drop images here. Or select{" "}
				<Button
					label="image folder"
					onClick={openFolderSelect}
					className={styles.selectLink}
				/>
				containing the images.
			</div>
			<input
				ref={fileInputRef}
				type="file"
				{...({
					webkitdirectory: "",
					directory: "",
				} as React.InputHTMLAttributes<HTMLInputElement>)}
				multiple
				style={{ display: "none" }}
				onChange={handleFileInputChange}
			/>
		</div>
	);
}
