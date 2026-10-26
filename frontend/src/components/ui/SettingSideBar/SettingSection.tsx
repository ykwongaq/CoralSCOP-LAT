import { ToggleSwitch } from "./AnnotationToggleBlock";
import styles from "./SettingSection.module.css";

interface SettingSectionProps {
	id: string;
	title: string;
	/** Optional on/off switch in the header (e.g. show boundaries). */
	enabled?: boolean;
	onEnabledChange?: (value: boolean) => void;
	/** Shows a reset button in the header while `modified` is true. */
	modified?: boolean;
	onReset?: () => void;
	/** Dims the whole section, e.g. while all annotations are hidden. */
	disabled?: boolean;
	children?: React.ReactNode;
}

/** A titled group of related settings. */
export default function SettingSection({
	id,
	title,
	enabled,
	onEnabledChange,
	modified = false,
	onReset,
	disabled = false,
	children,
}: SettingSectionProps) {
	const hasSwitch = enabled !== undefined && onEnabledChange !== undefined;
	const bodyDisabled = disabled || (hasSwitch && !enabled);

	return (
		<section
			className={`${styles.section} ${disabled ? styles.disabled : ""}`}
			aria-labelledby={`${id}-title`}
		>
			<header className={styles.header}>
				<h4 className={styles.title} id={`${id}-title`}>
					{title}
				</h4>
				<div className={styles.actions}>
					{onReset && modified && (
						<button
							type="button"
							className={styles.resetButton}
							onClick={onReset}
							disabled={disabled}
							title={`Reset ${title.toLowerCase()} to defaults`}
							aria-label={`Reset ${title.toLowerCase()} to defaults`}
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 16 16"
								fill="none"
								aria-hidden="true"
							>
								<path
									d="M2.5 8a5.5 5.5 0 1 0 1.7-3.97"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
								/>
								<path
									d="M2.5 2.5v3h3"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</button>
					)}
					{hasSwitch && (
						<ToggleSwitch
							id={`${id}-enabled`}
							checked={enabled}
							onChange={onEnabledChange}
							ariaLabel={`Show ${title.toLowerCase()}`}
							disabled={disabled}
						/>
					)}
				</div>
			</header>
			{children && (
				<div
					className={`${styles.body} ${bodyDisabled ? styles.bodyDisabled : ""}`}
					aria-disabled={bodyDisabled || undefined}
				>
					{children}
				</div>
			)}
		</section>
	);
}
