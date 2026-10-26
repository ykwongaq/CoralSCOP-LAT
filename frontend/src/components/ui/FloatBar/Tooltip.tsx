import styles from "./Tooltip.module.css";

interface TooltipProps {
	/** Main tooltip text, e.g. "Remove mask". */
	text: string;
	/** Keyboard shortcut shown as a key badge, e.g. "R". */
	shortcut?: string;
	/** Extra note under the title, e.g. why the tool is disabled. */
	hint?: string;
	children: React.ReactNode;
	/** Hide the tooltip, e.g. while a popup from the same button is open. */
	hidden?: boolean;
}

/** Shows a small bubble above `children` on hover. */
export default function Tooltip({
	text,
	shortcut,
	hint,
	children,
	hidden = false,
}: TooltipProps) {
	return (
		<span className={styles.tooltipWrapper}>
			{children}
			{!hidden && (
				<span className={styles.tooltip} role="tooltip">
					<span className={styles.tooltipRow}>
						<span className={styles.tooltipTitle}>{text}</span>
						{shortcut && <kbd className={styles.tooltipKey}>{shortcut}</kbd>}
					</span>
					{hint && (
						<span className={styles.tooltipHint}>
							<span className="ico-info" aria-hidden="true"></span>
							{hint}
						</span>
					)}
				</span>
			)}
		</span>
	);
}
