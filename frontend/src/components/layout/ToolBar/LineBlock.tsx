import styles from "./LineBlock.module.css";

import { useAnnotationSession, useProject } from "../../../store";
import type { ScaledLine } from "../../../types";

interface LineBlockProps {
	line: ScaledLine;
}

export default function LineBlock({ line }: LineBlockProps) {
	const { projectDispatch, projectState } = useProject();
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const currentData =
		projectState.dataList[annotationSessionState.currentDataIndex];

	const isSelected = annotationSessionState.selectedScaledLineId === line.id;
	const pixelLength = Math.hypot(
		line.end.x - line.start.x,
		line.end.y - line.start.y,
	).toFixed(1);

	const handleSelect = () => {
		annotationSessionDispatch({
			type: "SELECT_SCALED_LINE_ID",
			payload: line.id,
		});
	};

	const handleScaleChange = (value: string) => {
		if (!currentData) return;
		const parsedValue = Number(value);
		projectDispatch({
			type: "UPDATE_SCALED_LINE",
			payload: {
				dataId: currentData.id,
				lineId: line.id,
				updates: {
					scale: Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0,
				},
			},
		});
	};

	const handleUnitChange = (unit: ScaledLine["unit"]) => {
		if (!currentData) return;
		projectDispatch({
			type: "UPDATE_SCALED_LINE",
			payload: {
				dataId: currentData.id,
				lineId: line.id,
				updates: { unit },
			},
		});
	};

	const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		if (!currentData) return;
		projectDispatch({
			type: "DELETE_SCALED_LINE",
			payload: { dataId: currentData.id, lineId: line.id },
		});
		if (isSelected) {
			annotationSessionDispatch({
				type: "SELECT_SCALED_LINE_ID",
				payload: null,
			});
		}
	};

	return (
		<div
			className={`${styles.scaleLineBlock}${isSelected ? ` ${styles.scaleLineBlockSelected}` : ""}`}
			onClick={handleSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleSelect();
				}
			}}
			role="button"
			tabIndex={0}
		>
			<div className={styles.scaleLineBlockHeader}>
				<div>
					<p className={styles.scaleLineBlockTitle}>Line {line.id + 1}</p>
					<p className={styles.scaleLineBlockMeta}>Length: {pixelLength}px</p>
				</div>
				<span className={styles.scaleLineBlockTag}>
					{isSelected ? "Selected" : "Click to select"}
				</span>
			</div>

			<div className={styles.scaleLineBlockControls}>
				<label className={styles.scaleLineBlockField}>
					<span>Scale</span>
					<input
						className={styles.scaleLineBlockInput}
						type="number"
						min="0"
						step="0.01"
						value={line.scale}
						onChange={(e) => handleScaleChange(e.target.value)}
					/>
				</label>

				<label className={styles.scaleLineBlockField}>
					<span>Unit</span>
					<select
						className={styles.scaleLineBlockSelect}
						value={line.unit}
						onChange={(e) =>
							handleUnitChange(e.target.value as ScaledLine["unit"])
						}
					>
						<option value="cm">cm</option>
						<option value="mm">mm</option>
						<option value="m">m</option>
					</select>
				</label>

				<button
					type="button"
					className={styles.scaleLineBlockDelete}
					onClick={handleDelete}
				>
					Delete line
				</button>
			</div>
		</div>
	);
}
