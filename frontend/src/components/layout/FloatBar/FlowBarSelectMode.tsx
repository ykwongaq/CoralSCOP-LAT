import { useAnnotationSession } from "../../../store";
import { useAnnotationCommands } from "../../../hooks";
import FlowBar from "./FlowBar";
import AssignLabelButton from "./AssignLabelButton";
import ActionButton from "../../ui/FloatBar/FloatBarButton";

interface ModeBarProps {
	children?: React.ReactNode;
}

export default function SelectModeBar({ children }: ModeBarProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { execute, isLabelPanelOpen, setIsLabelPanelOpen } =
		useAnnotationCommands();

	return (
		<FlowBar hidden={mode !== "select"}>
			<AssignLabelButton
				isOpen={isLabelPanelOpen}
				onToggle={() => setIsLabelPanelOpen((prev) => !prev)}
			/>
			<ActionButton
				name="Remove (R)"
				icon="ico-bin icon"
				onClick={() => execute["remove"]()}
			/>
			<ActionButton
				name="Add Mask (W)"
				icon="ico-shape icon"
				onClick={() => execute["switch-to-add"]()}
			/>
			{children}
		</FlowBar>
	);
}
