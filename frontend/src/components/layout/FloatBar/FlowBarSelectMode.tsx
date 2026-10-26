import { useEffect } from "react";
import { useAnnotationSession } from "../../../store";
import { useAnnotationCommands } from "../../../hooks";
import FlowBar from "./FlowBar";
import AssignLabelButton from "./AssignLabelButton";
import ActionButton from "../../ui/FloatBar/FloatBarButton";

interface ModeBarProps {
	/** Extra controls (e.g. Run Model), placed right after Add Mask. */
	children?: React.ReactNode;
}

export default function SelectModeBar({ children }: ModeBarProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { execute, isLabelPanelOpen, setIsLabelPanelOpen } =
		useAnnotationCommands();

	const selectedCount = annotationSessionState.selectedAnnotations.length;
	const hasSelection = selectedCount > 0;
	const hasSingleSelection = selectedCount === 1;

	// Close the label picker if the selection is cleared while it's open.
	useEffect(() => {
		if (!hasSelection) setIsLabelPanelOpen(false);
	}, [hasSelection, setIsLabelPanelOpen]);

	return (
		<FlowBar hidden={mode !== "select"}>
			<ActionButton
				name="Add mask"
				shortcut="W"
				icon="ico-shape icon"
				onClick={() => execute["switch-to-add"]()}
				iconOnly
			/>
			{children}
			<AssignLabelButton
				isOpen={isLabelPanelOpen}
				onToggle={() => setIsLabelPanelOpen((prev) => !prev)}
				disabled={!hasSelection}
			/>
			<ActionButton
				name="Remove mask"
				shortcut="R"
				icon="ico-bin icon"
				onClick={() => execute["remove"]()}
				disabled={!hasSelection}
				disabledHint="Select a mask first"
				iconOnly
			/>
			<ActionButton
				name="Edit mask"
				shortcut="E"
				icon="ico-drag icon"
				onClick={() => execute["start-edit"]()}
				disabled={!hasSingleSelection}
				disabledHint={
					hasSelection ? "Select only one mask to edit" : "Select a mask first"
				}
				iconOnly
			/>
		</FlowBar>
	);
}
