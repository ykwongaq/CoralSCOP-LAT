import styles from "./Button.module.css";

interface ButtonProps {
	onClick?: () => void;
	label?: string;
	isBorder?: boolean;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
	children?: React.ReactNode;
	className?: string;
}

export default function Button({
	onClick,
	label,
	isBorder = false,
	type = "button",
	disabled = false,
	children,
	className: extraClassName,
}: ButtonProps) {
	return (
		<button
			type={type}
			className={[styles.button, isBorder ? styles["button--border"] : "", extraClassName]
				.filter(Boolean)
				.join(" ")}
			onClick={onClick}
			disabled={disabled}
		>
			{children ?? label}
		</button>
	);
}
