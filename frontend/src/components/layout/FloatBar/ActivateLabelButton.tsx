import { useAnnotationSession, useProject } from "../../../store";
import type { Label } from "../../../types";
import { getLabelColor, getTextColor } from "../../../utils";
import LabelPickerButton from "../../ui/FloatBar/LabelPickerButton";
import Tooltip from "../../ui/FloatBar/Tooltip";
import styles from "./ActivateLabelButton.module.css";

interface ActivateLabelButtonProps {
	isOpen: boolean;
	onToggle: () => void;
}

export default function ActivateLabelButton({
	isOpen,
	onToggle,
}: ActivateLabelButtonProps) {
	const { annotationSessionDispatch, annotationSessionState } =
		useAnnotationSession();
	const { projectState } = useProject();

	const activeLabel = annotationSessionState.activateLabel;

	const handleActivate = (label: Label) => {
		annotationSessionDispatch({ type: "SET_ACTIVE_LABEL", payload: label });
		onToggle();
	};

	const labels = projectState.labels;

	return (
		<Tooltip
			text="Label for new masks"
			shortcut="C"
			hint={activeLabel ? `Current: ${activeLabel.name}` : "No label chosen yet"}
			hidden={isOpen}
		>
			<LabelPickerButton
				labels={labels}
				isOpen={isOpen}
				onToggle={onToggle}
				onSelectLabel={handleActivate}
				buttonLabel="Label for new masks (C)"
				buttonChildren={
					<span
						className={styles.colorBlk}
						style={{
							backgroundColor: activeLabel
								? getLabelColor(activeLabel.id)
								: "#dedede",
							color: activeLabel ? getTextColor(activeLabel.id) : "#000",
						}}
					>
						{activeLabel && (
							<span className={styles.labelSmBlkText}>{activeLabel.id}</span>
						)}
					</span>
				}
			/>
		</Tooltip>
	);
}
