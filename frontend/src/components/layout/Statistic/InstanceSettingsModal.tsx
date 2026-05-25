import { useRef, useEffect } from "react";
import styles from "./InstanceLevelStatisticView.module.css";

interface Props {
	showMask: boolean;
	maskAlpha: number;
	onShowMaskChange: (value: boolean) => void;
	onMaskAlphaChange: (value: number) => void;
	workingDistanceThreshold: number;
	onThresholdChange: (value: number) => void;
	onWorkingThresholdChange: (value: number) => void;
	hasCoralWatch: boolean;
	showUnclassified: boolean;
	onShowUnclassifiedChange: (value: boolean) => void;
	onClose: () => void;
}

export default function InstanceSettingsModal({
	showMask,
	maskAlpha,
	onShowMaskChange,
	onMaskAlphaChange,
	workingDistanceThreshold,
	onThresholdChange,
	onWorkingThresholdChange,
	hasCoralWatch,
	showUnclassified,
	onShowUnclassifiedChange,
	onClose,
}: Props) {
	const settingsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				settingsRef.current &&
				!settingsRef.current.contains(event.target as Node)
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
		<div className={styles.statSettingsModal} ref={settingsRef}>
			<div className={styles.statSettingsHeader}>
				<span className={styles.statSettingsTitle}>
					Canvas Settings
				</span>
			</div>

			{/* Show Mask Toggle */}
			<div className={styles.statSettingControl}>
				<label className={styles.statSettingLabel}>Show Mask</label>
				<input
					type="checkbox"
					checked={showMask}
					onChange={(e) => onShowMaskChange(e.target.checked)}
					className={styles.statSettingCheckbox}
				/>
			</div>

			{/* Mask Alpha Control */}
			<div className={styles.statSettingControl}>
				<label className={styles.statSettingLabel}>Mask Opacity</label>
				<div className={styles.statSettingInputGroup}>
					<input
						type="range"
						min="0"
						max="100"
						value={maskAlpha}
						onChange={(e) =>
							onMaskAlphaChange(Number(e.target.value))
						}
						className={styles.statSettingSlider}
					/>
					<input
						type="number"
						min="0"
						max="100"
						value={maskAlpha}
						onChange={(e) =>
							onMaskAlphaChange(
								Math.max(0, Math.min(100, Number(e.target.value))),
							)
						}
						className={styles.statSettingValueInput}
					/>
				</div>
			</div>

			{/* Color Distance Threshold */}
			<div className={styles.statSettingControl}>
				<label className={styles.statSettingLabel}>
					{hasCoralWatch ? "Color Distance Threshold" : "Bleach Distance Threshold"}
				</label>
				<div className={styles.statSettingInputGroup}>
					<input
						type="range"
						min="0"
						max="255"
						value={workingDistanceThreshold}
						onChange={(e) =>
							onWorkingThresholdChange(Number(e.target.value))
						}
						onMouseUp={() =>
							onThresholdChange(workingDistanceThreshold)
						}
						onTouchEnd={() =>
							onThresholdChange(workingDistanceThreshold)
						}
						className={styles.statSettingSlider}
					/>
					<input
						type="number"
						min="0"
						max="255"
						value={workingDistanceThreshold}
						onChange={(e) => {
							const val = Math.max(
								0,
								Math.min(255, Number(e.target.value)),
							);
							onWorkingThresholdChange(val);
							onThresholdChange(val);
						}}
						className={styles.statSettingValueInput}
					/>
				</div>
			</div>

			{/* Show Unclassified Toggle */}
			{hasCoralWatch && (
				<div className={styles.statSettingControl}>
					<label className={styles.statSettingLabel}>
						Show Unclassified
					</label>
					<input
						type="checkbox"
						checked={showUnclassified}
						onChange={(e) => onShowUnclassifiedChange(e.target.checked)}
						className={styles.statSettingCheckbox}
					/>
				</div>
			)}
		</div>
	);
}
