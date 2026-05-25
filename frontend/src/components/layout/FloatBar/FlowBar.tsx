import { Children } from "react";
import styles from "./FlowBar.module.css";

interface FlowBarProps {
	children: React.ReactNode;
	hidden?: boolean;
	className?: string;
}

export default function FlowBar({ children, hidden, className }: FlowBarProps) {
	return (
		<div
			className={`${styles.floatBar}${hidden ? ` ${styles.floatBarHidden}` : ""}${className ? ` ${className}` : ""}`}
		>
			<div className={styles.floatBarInner}>
				{Children.toArray(children)
					.filter(Boolean)
					.map((child, index) => (
						<div key={index} className={styles.floatBarItem}>
							{child}
						</div>
					))}
			</div>
		</div>
	);
}
