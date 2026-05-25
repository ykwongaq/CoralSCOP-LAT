import { useState, useEffect } from "react";
import styles from "./AnnotationSiderBlock.module.css";

interface AnnotationSiderBlockProps {
	name: string;
	id: string;
	defaultValue: number;
	minValue: number;
	maxValue: number;
	step: number;
	onChange?: (value: number) => void;
}

export default function AnnotationSiderBlock({
	name,
	id,
	defaultValue,
	minValue,
	maxValue,
	step,
	onChange,
}: AnnotationSiderBlockProps) {
	const initialValue = Number(defaultValue) || minValue;
	const [value, setValue] = useState<number>(initialValue);
	const [inputText, setInputText] = useState<string>(`${initialValue}%`);
	const [isValid, setIsValid] = useState<boolean>(true);

	// Sync with external defaultValue changes
	useEffect(() => {
		const newValue = Number(defaultValue) || minValue;
		setValue(newValue);
		setInputText(`${newValue}%`);
		setIsValid(true);
	}, [defaultValue, minValue]);

	const validateAndSetValue = (newValue: number) => {
		if (isNaN(newValue)) {
			setIsValid(false);
			return false;
		}
		if (newValue < minValue || newValue > maxValue) {
			setIsValid(false);
			return false;
		}
		setIsValid(true);
		setValue(newValue);
		setInputText(`${newValue}%`);
		onChange?.(newValue);
		return true;
	};

	const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const text = e.target.value;
		setInputText(text);

		// Strip % suffix for parsing if present
		const rawText = text.replace(/%$/, "");
		const numValue = Number(rawText);

		if (text === "" || isNaN(numValue)) {
			setIsValid(false);
			return;
		}

		if (numValue >= minValue && numValue <= maxValue) {
			setIsValid(true);
			setValue(numValue);
			onChange?.(numValue);
		} else {
			setIsValid(false);
		}
	};

	const handleTextBlur = () => {
		const rawText = inputText.replace(/%$/, "");
		const numValue = Number(rawText);

		if (isNaN(numValue) || rawText === "") {
			setInputText(`${value}%`);
			setIsValid(true);
		} else if (numValue < minValue) {
			validateAndSetValue(minValue);
		} else if (numValue > maxValue) {
			validateAndSetValue(maxValue);
		} else {
			validateAndSetValue(numValue);
		}
	};

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = Number(e.target.value);
		validateAndSetValue(newValue);
	};

	return (
		<>
			<p className={styles.sideBarTitle}>{name}</p>
			<div className={styles.sideBarBlock}>
				<div className={styles.sliderBlock} id={id}>
					<div className={styles.sliderBlockInner}>
						<input
							id={`${id}-slider`}
							min={minValue}
							max={maxValue}
							value={value}
							step={step}
							type="range"
							data-suffix="%"
							onChange={handleSliderChange}
						/>
					</div>
					<input
						id={`${id}-input`}
						type="text"
						value={inputText}
						onChange={handleTextChange}
						onBlur={handleTextBlur}
						className={!isValid ? styles.inputError : ""}
					/>
				</div>
			</div>
		</>
	);
}
