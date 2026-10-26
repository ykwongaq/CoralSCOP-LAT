import { useAnnotationSession, useProject } from "../../../store";
import {
	BRUSH_SIZE_MAX_PERCENT,
	BRUSH_SIZE_MIN_PERCENT,
	brushPercentToPixels,
} from "../../../utils";
import Tooltip from "../../ui/FloatBar/Tooltip";
import styles from "./BrushSizeSlider.module.css";

/**
 * Brush size slider. The size is a percentage of the image's longer side,
 * so it stays visually consistent across images of different resolutions.
 */
export default function BrushSizeSlider() {
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const { projectState } = useProject();

	const percent = annotationSessionState.brushSizePercent;
	const imageData =
		projectState.dataList[annotationSessionState.currentDataIndex]?.imageData;
	const pixels = imageData
		? Math.round(
				brushPercentToPixels(percent, imageData.width, imageData.height),
			)
		: null;

	return (
		<Tooltip
			text="Brush size"
			shortcut="Ctrl+Scroll"
			hint="Size is a % of the image's longer side"
		>
			<label className={styles.slider}>
				<span className={styles.label}>Size</span>
				<input
					type="range"
					className={styles.range}
					min={BRUSH_SIZE_MIN_PERCENT}
					max={BRUSH_SIZE_MAX_PERCENT}
					step={0.1}
					value={percent}
					onChange={(e) =>
						annotationSessionDispatch({
							type: "SET_BRUSH_SIZE",
							payload: Number(e.target.value),
						})
					}
					aria-label="Brush size (% of image size)"
				/>
				<span className={styles.value}>
					{percent.toFixed(1)}%
					{pixels !== null && <span className={styles.pixels}>{pixels}px</span>}
				</span>
			</label>
		</Tooltip>
	);
}
