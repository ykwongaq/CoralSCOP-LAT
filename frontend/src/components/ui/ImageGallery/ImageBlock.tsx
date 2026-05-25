import styles from "./ImageBlock.module.css";

interface ImageBlockProps {
	imageURl: string;
	imageName: string;
	displayId: number;
	onClick: () => void;
}

export default function ImageBlock({
	imageURl,
	imageName,
	displayId,
	onClick,
}: ImageBlockProps) {
	return (
		<button className={`${styles.galleryListItem} ${styles.galleryItem}`} onClick={onClick}>
			<div className={styles.galleryItemImgW}>
				<img className={styles.galleryItemImg} src={imageURl} alt={imageName} />
			</div>
			<p className={`name ${styles.galleryItemName}`}>
				<span className={styles.galleryItemText}>
					{displayId}. {imageName}
				</span>
			</p>
		</button>
	);
}
