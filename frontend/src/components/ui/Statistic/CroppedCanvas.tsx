import { useRef } from "react";
import type { Annotation } from "../../../types";
import type { ColorClassificationResult } from "../../../services";
import { colorToHex } from "../../../utils/color";
import { useCanvasRenderer } from "./useCanvasRenderer";
import { useCanvasInteraction } from "./useCanvasInteraction";

import styles from "./CroppedCanvas.module.css";

interface Props {
	imageUrl: string;
	annotation: Annotation;
	imageWidth: number;
	imageHeight: number;
	colorClassification?: ColorClassificationResult[] | null;
	showMask?: boolean;
	maskAlpha?: number;
	showColorBoxes?: boolean;
}

interface GridCell {
	label: string;
	row: number;
	col: number;
}

function getGridPositions(): GridCell[] {
	const cells: GridCell[] = [];

	for (let i = 1; i <= 6; i++) {
		cells.push({ label: `B${i}`, row: 0, col: i - 1 });
	}

	for (let i = 1; i <= 6; i++) {
		cells.push({ label: `C${i}`, row: i - 1, col: 6 });
	}

	for (let i = 1; i <= 6; i++) {
		cells.push({ label: `D${i}`, row: 6, col: 7 - i });
	}

	for (let i = 1; i <= 6; i++) {
		cells.push({ label: `E${i}`, row: 7 - i, col: 0 });
	}

	return cells;
}

export default function CroppedCanvas({
	imageUrl,
	annotation,
	imageWidth,
	imageHeight,
	colorClassification,
	showMask = true,
	maskAlpha = 100,
	showColorBoxes = true,
}: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const { viewportRef, requestDraw } = useCanvasRenderer(
		canvasRef,
		imageUrl,
		annotation,
		imageWidth,
		imageHeight,
		showMask,
		maskAlpha,
		colorClassification,
	);

	const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } =
		useCanvasInteraction(canvasRef, viewportRef, requestDraw);

	if (!showColorBoxes) {
		return (
			<div className={styles.simpleCanvasContainer}>
				<canvas
					ref={canvasRef}
					className={styles.canvas}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseLeave}
					onContextMenu={(e) => e.preventDefault()}
				/>
			</div>
		);
	}

	const colorMap = colorClassification
		? new Map(colorClassification.map((c) => [c.label, c]))
		: new Map();
	const gridCells = getGridPositions();

	return (
		<div className={styles.gridContainer}>
			{gridCells.map((cell) => {
				const colorData = colorMap.get(cell.label);
				const colorHex = colorData ? colorToHex(colorData.color) : "#e5e7eb";

				return (
					<div
						key={cell.label}
						className={styles.colorBox}
						style={{
							gridRow: cell.row + 1,
							gridColumn: cell.col + 1,
							backgroundColor: colorHex,
						}}
					>
						<div className={styles.colorBoxLabel}>{cell.label}</div>
					</div>
				);
			})}

			<div className={styles.canvasContainer}>
				<canvas
					ref={canvasRef}
					className={styles.canvas}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseLeave}
					onContextMenu={(e) => e.preventDefault()}
				/>
			</div>
		</div>
	);
}
