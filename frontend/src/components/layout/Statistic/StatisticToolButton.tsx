import styles from "./StatisticToolButton.module.css";

interface StatisticToolButtonProps {
	icon?: string;
	label?: string;
	image?: string;
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
}

export default function StatisticToolButton({
	icon,
	label,
	image,
	onClick,
	active = false,
	disabled = false,
}: StatisticToolButtonProps) {
	return (
		<button
			type="button"
			className={`${styles.button} ${active ? styles.active : ""} ${image ? styles.imageButton : ""}`}
			onClick={onClick}
			disabled={disabled}
			title={label}
		>
			{image ? (
				<img src={image} alt={label || ""} className={styles.image} />
			) : (
				<>
					{icon && <span className={icon} />}
					{label && <span className={styles.label}>{label}</span>}
				</>
			)}
		</button>
	);
}
