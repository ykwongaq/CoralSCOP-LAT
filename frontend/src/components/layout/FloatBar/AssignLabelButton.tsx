import { useAnnotationSession, useProject } from "../../../store";
import type { Label } from "../../../types";
import LabelPickerButton from "../../ui/FloatBar/LabelPickerButton";

interface AssignLabelButtonProps {
	isOpen: boolean;
	onToggle: () => void;
}

export default function AssignLabelButton({
	isOpen,
	onToggle,
}: AssignLabelButtonProps) {
	const { projectState, projectDispatch } = useProject();
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();

	const handleAssign = (label: Label) => {
		annotationSessionState.selectedAnnotations.forEach((annotationId) => {
			projectDispatch({
				type: "ASSIGN_LABEL_TO_ANNOTATION",
				payload: {
					dataId: annotationSessionState.currentDataIndex,
					annotationId: annotationId,
					labelId: label.id,
				},
			});
		});
		annotationSessionDispatch({ type: "CLEAR_SELECTION" });
		onToggle();
	};

	const labels = projectState.labels;

	return (
		<LabelPickerButton
			labels={labels}
			isOpen={isOpen}
			onToggle={onToggle}
			onSelectLabel={handleAssign}
			buttonChildren={<span>Assign Label (C)</span>}
		/>
	);
}
