import { useAnnotationSession, useProject } from "../../../store";
import type { Label } from "../../../types";
import { getLabelColor, getTextColor } from "../../../utils";
import LabelPickerButton from "../../ui/FloatBar/LabelPickerButton";
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
		<LabelPickerButton
			labels={labels}
			isOpen={isOpen}
			onToggle={onToggle}
			onSelectLabel={handleActivate}
			buttonChildren={
				<>
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
							<span className={styles.labelSmBlkText}>
								{activeLabel.id + 1}
							</span>
						)}
					</span>
					<span>Assign Label (C)</span>
				</>
			}
		/>
	);
}
