import styles from "./FloatBarButton.module.css";

interface ActionButtonProps {
	name: string;
	icon: string;
	onClick: () => void;
	disabled?: boolean;
}

export default function ActionButton({
	name,
	icon,
	onClick,
	disabled = false,
}: ActionButtonProps) {
	return (
		<button
			id="remove-button"
			className={styles.floatBarButton}
			onClick={onClick}
			disabled={disabled}
		>
			<span className={icon}></span>
			{name}
		</button>
	);
}
