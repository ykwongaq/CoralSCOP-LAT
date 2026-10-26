import styles from "./FloatBarButton.module.css";
import Tooltip from "./Tooltip";

interface ActionButtonProps {
	name: string;
	/** An icon-font class name (e.g. "ico-bin icon") or a custom icon element. */
	icon: string | React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
	/** Show only the icon, with `name` as a hover tooltip. */
	iconOnly?: boolean;
	/** Keyboard shortcut, shown as a key badge in the tooltip. */
	shortcut?: string;
	/** Tooltip note shown while the button is disabled. */
	disabledHint?: string;
}

export default function ActionButton({
	name,
	icon,
	onClick,
	disabled = false,
	iconOnly = false,
	shortcut,
	disabledHint,
}: ActionButtonProps) {
	const iconElement =
		typeof icon === "string" ? icon && <span className={icon}></span> : icon;
	const fullName = shortcut ? `${name} (${shortcut})` : name;

	if (iconOnly) {
		return (
			<Tooltip
				text={name}
				shortcut={shortcut}
				hint={disabled ? disabledHint : undefined}
			>
				<button
					className={`${styles.floatBarButton} ${styles.iconOnly}`}
					onClick={onClick}
					disabled={disabled}
					aria-label={fullName}
				>
					{iconElement}
				</button>
			</Tooltip>
		);
	}

	return (
		<button
			className={styles.floatBarButton}
			onClick={onClick}
			disabled={disabled}
		>
			{iconElement}
			{fullName}
		</button>
	);
}
