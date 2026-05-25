import type { ImageData } from "../../../types";
import styles from "./ImageBlockWithSelection.module.css";

interface ImageBlockProps extends Pick<ImageData, "imageUrl" | "imageName"> {
	id: number;
	selected: boolean;
	onToggle?: () => void;
}

export default function ImageBlockWithSelection({
	id,
	imageUrl,
	imageName,
	selected,
	onToggle,
}: ImageBlockProps) {
	return (
		<label className={`${styles.galleryListItem} ${styles.galleryItem}`}>
			<input type="checkbox" checked={selected} onChange={onToggle} />
			<div className={styles.galleryItemImgW}>
				<img className={styles.galleryItemImg} src={imageUrl} alt={imageName} />
			</div>
			<p className={`name ${styles.galleryItemName}`}>
				<span className={styles.galleryItemText}>
					{id}. {imageName}
				</span>
			</p>
		</label>
	);
}
