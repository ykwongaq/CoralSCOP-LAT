import styles from "./LabelButton.module.css";

interface LabelButtonInterface {
	label: string;
	backgroundColor: string;
	textColor: string;

	enabledClick?: boolean;
	onClick?: () => void;
}

export default function LabelButton({
	label,
	backgroundColor,
	textColor,
	enabledClick = false,
	onClick = () => {},
}: LabelButtonInterface) {
	return (
		<div
			className={`${styles.colorPlate} colorBox`}
			style={{
				backgroundColor: backgroundColor,
				color: textColor,
				borderColor: backgroundColor,
				cursor: enabledClick ? "pointer" : undefined,
			}}
			onClick={enabledClick ? onClick : undefined}
		>
			{label}
		</div>
	);
}
