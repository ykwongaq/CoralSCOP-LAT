import type { Annotation } from "../../../types";
import CroppedCanvas from "./CroppedCanvas";
import styles from "./StatisticTableRow.module.css";

export interface InstanceRowData {
	id: number;
	labelName: string;
	statuses: string[];
	bleachingPct: number | null;
	areaPct: number;
}
interface StatisticTableRowProps {
	row: InstanceRowData;
	annotation: Annotation;
	imageUrl: string;
	imageWidth: number;
	imageHeight: number;
	showCroppedCanvas?: boolean;
	showColorBoxes?: boolean;
}

/**
 * A single row in the statistic table.
 * The cropped canvas is displayed in the first column when showCroppedCanvas is true.
 */
export default function StatisticTableRow({
	row,
	annotation,
	imageUrl,
	imageWidth,
	imageHeight,
	showCroppedCanvas = true,
	showColorBoxes = true,
}: StatisticTableRowProps) {
	return (
		<tr>
			{showCroppedCanvas && (
				<td className={styles.statCellCrop}>
					<div className={styles.statCropWrapRow}>
						<CroppedCanvas
							imageUrl={imageUrl}
							annotation={annotation}
							imageWidth={imageWidth}
							imageHeight={imageHeight}
							showColorBoxes={showColorBoxes}
						/>
					</div>
				</td>
			)}
			<td>{row.labelName}</td>
			<td>
				{row.statuses.length > 0 ? (
					<div className={styles.statTagList}>
						{row.statuses.map((s) => (
							<span key={s} className={styles.statTag}>
								{s}
							</span>
						))}
					</div>
				) : (
					<span className={styles.statNoStatus}>—</span>
				)}
			</td>
			<td>
				{row.bleachingPct === null ? (
					<span className={styles.statLoading}>…</span>
				) : (
					`${row.bleachingPct.toFixed(1)}%`
				)}
			</td>
			<td>{row.areaPct.toFixed(2)}%</td>
		</tr>
	);
}
