import { useState, useMemo } from "react";
import styles from "./AnnotationSiderBlock.module.css";

interface AnnotationSiderBlockProps {
	name: string;
	id: string;
	/** Current value, in slider units. */
	value: number;
	minValue: number;
	maxValue: number;
	step: number;
	/** Suffix shown after the number, e.g. "%". */
	unit?: string;
	/** Value restored when the slider is double-clicked. */
	resetValue?: number;
	disabled?: boolean;
	onChange?: (value: number) => void;
}

export default function AnnotationSiderBlock({
	name,
	id,
	value,
	minValue,
	maxValue,
	step,
	unit = "%",
	resetValue,
	disabled = false,
	onChange,
}: AnnotationSiderBlockProps) {
	const format = (v: number) => `${v}${unit}`;
	const parse = (text: string) => {
		const trimmed = text.trim();
		const raw =
			unit && trimmed.endsWith(unit)
				? trimmed.slice(0, -unit.length)
				: trimmed;
		return raw.trim() === "" ? NaN : Number(raw);
	};
	const inRange = (v: number) => v >= minValue && v <= maxValue;

	// Text typed into the value box; null when the user is not editing it
	const [draft, setDraft] = useState<string | null>(null);
	const inputText = draft ?? format(value);
	const isValid = draft === null || inRange(parse(draft));

	// Track fill. Sliders whose range spans zero (e.g. white balance) fill
	// from the centre so it is clear which way they were moved.
	const sliderTrackStyle = useMemo(() => {
		const toPct = (v: number) =>
			Math.min(100, Math.max(0, ((v - minValue) / (maxValue - minValue)) * 100));
		const fill = "var(--slider-fill)";
		const track = "var(--slider-track)";
		const from = minValue < 0 && maxValue > 0 ? toPct(0) : 0;
		const to = toPct(value);
		const [lo, hi] = from <= to ? [from, to] : [to, from];
		return {
			background: `linear-gradient(to right, ${track} 0%, ${track} ${lo}%, ${fill} ${lo}%, ${fill} ${hi}%, ${track} ${hi}%, ${track} 100%)`,
		};
	}, [value, minValue, maxValue]);

	const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const text = e.target.value;
		setDraft(text);
		const numValue = parse(text);
		if (inRange(numValue)) onChange?.(numValue);
	};

	const handleTextBlur = () => {
		if (draft !== null) {
			const numValue = parse(draft);
			if (!isNaN(numValue)) {
				onChange?.(Math.min(maxValue, Math.max(minValue, numValue)));
			}
		}
		setDraft(null);
	};

	const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") e.currentTarget.blur();
		if (e.key === "Escape") {
			setDraft(null);
			e.currentTarget.blur();
		}
	};

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange?.(Number(e.target.value));
	};

	const handleSliderDoubleClick = () => {
		if (resetValue !== undefined && !disabled) onChange?.(resetValue);
	};

	return (
		<div
			className={`${styles.sideBarBlock} ${disabled ? styles.disabled : ""}`}
			id={id}
		>
			<div className={styles.sliderHeader}>
				<label className={styles.sideBarTitle} htmlFor={`${id}-slider`}>
					{name}
				</label>
				<input
					id={`${id}-input`}
					type="text"
					inputMode="decimal"
					aria-label={`${name} value`}
					value={inputText}
					disabled={disabled}
					onChange={handleTextChange}
					onBlur={handleTextBlur}
					onKeyDown={handleTextKeyDown}
					className={`${styles.valueInput} ${!isValid ? styles.inputError : ""}`}
				/>
			</div>
			<div className={styles.sliderBlockInner}>
				<input
					id={`${id}-slider`}
					min={minValue}
					max={maxValue}
					value={value}
					step={step}
					type="range"
					disabled={disabled}
					style={sliderTrackStyle}
					title={resetValue !== undefined ? "Double-click to reset" : undefined}
					onChange={handleSliderChange}
					onDoubleClick={handleSliderDoubleClick}
				/>
			</div>
		</div>
	);
}
