import styles from "./LabelVisibilityToggle.module.css";

interface LabelVisibilityToggleProps {
	isHidden: boolean;
	onToggle: () => void;
}

export default function LabelVisibilityToggle({
	isHidden,
	onToggle,
}: LabelVisibilityToggleProps) {
	return (
		<button
			className={`${styles.labelBlkBtn}${isHidden ? ` ${styles.labelBlkBtnActive}` : ""}`}
			value="1"
			onClick={onToggle}
		>
			<span className="ico-eye"></span>
			<span className="ico-hide"></span>
		</button>
	);
}
