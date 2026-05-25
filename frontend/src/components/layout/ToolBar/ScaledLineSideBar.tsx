import { useProject, useAnnotationSession } from "../../../store";
import LineBlock from "./LineBlock";
import styles from "./ScaledLineSideBar.module.css";
import sideBarStyles from "./ToolBar.module.css";

export default function ScaledLineSideBar() {
	const { projectState } = useProject();
	const { annotationSessionState } = useAnnotationSession();

	const currentData =
		projectState.dataList[annotationSessionState.currentDataIndex] ?? null;
	const scaledLines = currentData?.scaledLineList ?? [];

	return (
		<div className={sideBarStyles.sideBarSub}>
			<div className={styles.scaleSidebarIntro}>
				<h3 className="side-bar__sub-title">Scale Definition</h3>
				<p className={styles.scaleSidebarHint}>
					Drag on the image to create a reference line. Use the mouse wheel to
					zoom and right-drag to pan.
				</p>
			</div>

			<div className={styles.scaleSidebarList}>
				{scaledLines.length === 0 ? (
					<p className={styles.scaleSidebarEmpty}>
						No scale lines yet for this image. Draw one on the canvas to get
						started.
					</p>
				) : (
					scaledLines.map((line) => <LineBlock key={line.id} line={line} />)
				)}
			</div>
		</div>
	);
}
