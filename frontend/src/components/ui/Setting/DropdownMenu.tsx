import { useRef, useEffect, type ReactNode } from "react";
import styles from "./DropdownMenu.module.css";

interface Props {
	children: ReactNode;
	onClose: () => void;
}

export default function DropdownMenu({ children, onClose }: Props) {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [onClose]);

	return (
		<div className={styles.dropdownMenu} ref={menuRef}>
			{children}
		</div>
	);
}
