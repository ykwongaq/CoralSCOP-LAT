import { useEffect, useRef } from "react";
import styles from "./LabelPickerButton.module.css";

import type { Label } from "../../../types";
import LabelButton from "../Labels/LabelButton";
import { getTextColor, getLabelColor } from "../../../utils";

interface LabelPickerButtonProps {
	labels: Label[];
	isOpen: boolean;
	onToggle: () => void;
	onSelectLabel: (label: Label) => void;
	buttonChildren: React.ReactNode;
}

export default function LabelPickerButton({
	labels,
	isOpen,
	onToggle,
	onSelectLabel,
	buttonChildren,
}: LabelPickerButtonProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				onToggle();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen, onToggle]);

	return (
		<div
			ref={containerRef}
			className={`${styles.colorPickerPopup}${isOpen ? ` ${styles.colorPickerPopupOpen}` : ""}`}
			id="category-selector"
		>
			{isOpen && (
				<div className={styles.colorPickerPop}>
					<p className={styles.colorPickerLabel}>Label</p>
					<div className={`${styles.colorPlateList} ${styles.colorPickerList}`}>
						{labels.map((label) => {
							const text = String(label.id + 1);
							const textColor = getTextColor(label.id);
							const backgroundColor = getLabelColor(label.id);
							return (
								<LabelButton
									key={label.id}
									label={text}
									backgroundColor={backgroundColor}
									textColor={textColor}
									enabledClick={true}
									onClick={() => onSelectLabel(label)}
								/>
							);
						})}
					</div>
				</div>
			)}
			<button
				id="assign-category-toggle-button"
				className={`${styles.colorPickerBtn} float-bar__button`}
				onClick={onToggle}
			>
				{buttonChildren}
			</button>
		</div>
	);
}
