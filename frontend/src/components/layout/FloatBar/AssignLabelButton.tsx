import { useAnnotationSession, useProject } from "../../../store";
import type { Label } from "../../../types";
import LabelPickerButton from "../../ui/FloatBar/LabelPickerButton";
import Tooltip from "../../ui/FloatBar/Tooltip";
import { TagIcon } from "../../ui/FloatBar/icons";

interface AssignLabelButtonProps {
	isOpen: boolean;
	onToggle: () => void;
	disabled?: boolean;
}

export default function AssignLabelButton({
	isOpen,
	onToggle,
	disabled = false,
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
		// Tooltip wraps the whole picker (not just the icon) so it isn't faded
		// along with the button when the button is disabled.
		<Tooltip
			text="Assign label"
			shortcut="C"
			hint={disabled ? "Select a mask first" : undefined}
			hidden={isOpen && !disabled}
		>
			<LabelPickerButton
				labels={labels}
				isOpen={isOpen}
				onToggle={onToggle}
				onSelectLabel={handleAssign}
				buttonChildren={<TagIcon />}
				buttonLabel="Assign label (C)"
				disabled={disabled}
			/>
		</Tooltip>
	);
}
