import { useState } from "react";
import { useProject } from "../../../store";
import { LabelSearcher } from "./LabelSearcher";
import LabelBlock from "./LabelBlock";
import AddLabelBlock from "./AddLabelBlock";
import styles from "./LabelBar.module.css";

export default function LabelBar() {
	const { projectState, projectDispatch } = useProject();
	const [searchQuery, setSearchQuery] = useState("");

	const labels = projectState.labels;

	const filteredLabels = searchQuery.trim()
		? labels.filter((label) =>
				label.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
			)
		: labels;

	return (
		<>
			<div className={styles.sideBarBlk}>
				<LabelSearcher value={searchQuery} onChange={setSearchQuery} />
			</div>
			<div className={styles.sideBarBottom}>
				<div
					id="label-container"
					className={`${styles.labelContainer} ${styles.colorPlateList}`}
				>
					{filteredLabels.map((label) => (
						<LabelBlock key={label.id} label={label} />
					))}
				</div>
			</div>
			<AddLabelBlock
				onAddLabel={(labelName) =>
					projectDispatch({ type: "ADD_LABEL", payload: { labelName } })
				}
			/>
		</>
	);
}
