import { useState, useRef, useEffect } from "react";
import { useProject, useAnnotationSession } from "../../../store";
import {
	StatisticCanvas,
	ImageLevelStatisticView,
	InstanceLevelStatisticView,
	StatisticToolBar,
	StatisticToolButton,
	CoralWatchPicker,
	type StatisticCanvasRef,
} from "../../layout";
import CoralWatchLogo from "../../../assets/CoralWatchLogo.png";

import styles from "./StatisticPanel.module.css";

export const StatisticPanelID = "statistic-panel";

export function StatisticPanel() {
	const { projectState, projectDispatch } = useProject();
	const { annotationSessionState } = useAnnotationSession();
	const { currentDataIndex } = annotationSessionState;
	const data = projectState.dataList[currentDataIndex] ?? null;

	// Independent selection state for the statistic panel
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [isPickerOpen, setIsPickerOpen] = useState(false);

	// Clear selection when the current image changes
	const prevDataIndexRef = useRef(currentDataIndex);
	useEffect(() => {
		if (prevDataIndexRef.current !== currentDataIndex) {
			setSelectedIds([]);
			prevDataIndexRef.current = currentDataIndex;
		}
	}, [currentDataIndex]);

	const canvasRef = useRef<StatisticCanvasRef>(null);

	return (
		<>
			<div className={styles.statePanel}>
				<div className={styles.statLeft}>
					<StatisticToolBar>
						<StatisticToolButton
							image={CoralWatchLogo}
							label="CoralWatch"
							onClick={() => setIsPickerOpen(true)}
						/>
					</StatisticToolBar>
					<StatisticCanvas
						ref={canvasRef}
						data={data}
						selectedIds={selectedIds}
						onSelectIds={setSelectedIds}
					/>
				</div>

				<div className={styles.statRight}>
					<div className={styles.statRightTop}>
						<ImageLevelStatisticView data={data} labels={projectState.labels} />
					</div>
					<div className={styles.statRightBottom}>
						<InstanceLevelStatisticView
							data={data}
							labels={projectState.labels}
							selectedIds={selectedIds}
						/>
					</div>
				</div>
			</div>

			{isPickerOpen && data !== null && (
				<CoralWatchPicker
					data={data}
					initialCard={data.coralWatch ?? undefined}
					onClose={() => setIsPickerOpen(false)}
					onConfirm={(card) => {
						projectDispatch({
							type: "SET_CORAL_WATCH_CARD",
							payload: { dataId: data.id, card },
						});
						setIsPickerOpen(false);
					}}
				/>
			)}
		</>
	);
}

export default StatisticPanel;
