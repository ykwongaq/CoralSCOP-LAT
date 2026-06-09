import { useState } from "react";
import styles from "./CollapsibleGroup.module.css";

interface CollapsibleGroupProps {
	title: string;
	defaultExpanded?: boolean;
	fill?: boolean;
	children: React.ReactNode;
}

export default function CollapsibleGroup({
	title,
	defaultExpanded = true,
	fill = false,
	children,
}: CollapsibleGroupProps) {
	const [expanded, setExpanded] = useState(defaultExpanded);

	return (
		<div className={`${styles.group} ${fill ? styles.fill : ""}`}>
			<button
				className={styles.groupHeader}
				onClick={() => setExpanded(!expanded)}
				type="button"
			>
				<span className={styles.groupTitle}>{title}</span>
				<span
					className={`${styles.groupChevron} ${expanded ? styles.expanded : ""}`}
				>
					<svg
						width="12"
						height="8"
						viewBox="0 0 12 8"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M1 1.5L6 6.5L11 1.5"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</span>
			</button>
			<div className={`${styles.groupContent} ${expanded ? styles.expanded : ""}`}>
				{children}
			</div>
		</div>
	);
}
