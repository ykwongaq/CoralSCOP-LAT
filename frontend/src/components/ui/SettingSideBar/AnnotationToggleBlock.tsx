import styles from "./AnnotationToggleBlock.module.css";

interface ToggleSwitchProps {
	id: string;
	checked: boolean;
	onChange: (value: boolean) => void;
	/** Accessible name when there is no visible label next to the switch. */
	ariaLabel?: string;
	disabled?: boolean;
}

/** Small on/off switch. */
export function ToggleSwitch({
	id,
	checked,
	onChange,
	ariaLabel,
	disabled = false,
}: ToggleSwitchProps) {
	return (
		<label className={`${styles.switch} ${disabled ? styles.disabled : ""}`}>
			<input
				type="checkbox"
				role="switch"
				id={id}
				checked={checked}
				disabled={disabled}
				aria-label={ariaLabel}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span className={styles.switchSlider}></span>
		</label>
	);
}

interface AnnotationToggleBlockProps {
	name: string;
	id: string;
	value: boolean;
	/** Keyboard shortcut shown as a key badge, e.g. "Tab". */
	shortcut?: string;
	/** Short explanation under the name. */
	description?: string;
	onChange: (value: boolean) => void;
}

/** A labelled row with a switch on the right. */
export default function AnnotationToggleBlock({
	name,
	id,
	value,
	shortcut,
	description,
	onChange,
}: AnnotationToggleBlockProps) {
	return (
		<div className={styles.toggleBlk}>
			<label className={styles.toggleText} htmlFor={id}>
				<span className={styles.toggleBlkTitle}>
					{name}
					{shortcut && <kbd className={styles.shortcut}>{shortcut}</kbd>}
				</span>
				{description && (
					<span className={styles.toggleDescription}>{description}</span>
				)}
			</label>
			<ToggleSwitch id={id} checked={value} onChange={onChange} />
		</div>
	);
}
