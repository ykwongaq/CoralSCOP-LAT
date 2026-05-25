import styles from "./FloatBarButton.module.css";

interface ActionButtonProps {
	name: string;
	icon: string;
	onClick: () => void;
}

export default function ActionButton({
	name,
	icon,
	onClick,
}: ActionButtonProps) {
	return (
		<button
			id="remove-button"
			className={styles.floatBarButton}
			onClick={onClick}
		>
			<span className={icon}></span>
			{name}
		</button>
	);
}
