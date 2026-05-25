import styles from "./ImageDisplayBlock.module.css";

interface ImageDisplayBlockProps {
	imagePreview: string;
}

export default function ImageDisplayBlock({
	imagePreview,
}: ImageDisplayBlockProps) {
	return (
		<div className={styles.imageDisplayBlock}>
			<img
				src={imagePreview}
				alt="Preview"
				className={styles.imageDisplayBlockImg}
			/>
		</div>
	);
}
