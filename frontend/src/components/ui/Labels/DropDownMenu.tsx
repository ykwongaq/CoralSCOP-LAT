import styles from "./DropDownMenu.module.css";

interface DropDownMenuProps {
	children: React.ReactNode;
	isOpen: boolean;
	position: { x: number; y: number };
}

interface DropDownMenuItemProps {
	name: string;
	onClick: () => void;
}

export function DropDownMenuItem({ name, onClick }: DropDownMenuItemProps) {
	return (
		<button className={styles.normalDropdownLink} onClick={onClick}>
			{name}
		</button>
	);
}

export default function DropDownMenu({ children, isOpen, position }: DropDownMenuProps) {
	if (!isOpen) return null;

	return (
		<div
			className={`${styles.normalDropdown} ${styles.labelDropdownMenu}`}
			style={{
				position: "fixed",
				left: `${position.x}px`,
				top: `${position.y}px`,
				display: "block",
			}}
		>
			{children}
		</div>
	);
}
