import type React from "react";
import styles from "./SideBar.module.css";
import navStyles from "../../ui/SideBar/SideBar.module.css";

interface SideBarProps {
	children: React.ReactNode;
}

export default function SideBar({ children }: SideBarProps) {
	return (
		<nav id="navigation-bar" className={styles.sideBar}>
			<div className={styles.sideBarMain}>
				<ul className={navStyles.navList}>{children}</ul>
			</div>
		</nav>
	);
}
