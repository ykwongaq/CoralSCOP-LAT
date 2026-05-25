import ImageBlockWithSelection from "./ImageBlockWithSelection";
import type { ImageData } from "../../../types";
import styles from "./ImageGallery.module.css";

interface ImageGalleryProps {
	imageDataList: ImageData[];
	selectedIndices: number[];
	onToggleSelection: (index: number) => void;
}

export default function ImageGallery({
	imageDataList,
	selectedIndices,
	onToggleSelection,
}: ImageGalleryProps) {
	return (
		<div
			id="gallery-item-container"
			className={`${styles.galleryList} ${styles.galleryListFull}`}
		>
			{imageDataList.map((imageData, index) => (
				<ImageBlockWithSelection
					key={index}
					id={index}
					imageUrl={imageData.imageUrl}
					imageName={imageData.imageName}
					selected={selectedIndices.includes(index)}
					onToggle={() => onToggleSelection(index)}
				/>
			))}
		</div>
	);
}
