import styles from "./DropDownMenu.module.css";

interface DropDownMenuProps {
	children: React.ReactNode;
	isOpen: boolean;
	position: { x: number; y: number };
}

interface DropDownMenuItemProps {
	name: string;
	onClick: () => void;
	// When provided, reserves space for a leading check and shows it when true.
	checked?: boolean;
}

export function DropDownMenuItem({
	name,
	onClick,
	checked,
}: DropDownMenuItemProps) {
	return (
		<button className={styles.normalDropdownLink} onClick={onClick}>
			{checked !== undefined && (
				<span className={styles.dropdownCheck}>{checked ? "✓" : ""}</span>
			)}
			{name}
		</button>
	);
}

export function DropDownMenuHeader({ name }: { name: string }) {
	return <div className={styles.dropdownHeader}>{name}</div>;
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
