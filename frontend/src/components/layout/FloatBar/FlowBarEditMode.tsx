import { useAnnotationSession } from "../../../store";
import { useAnnotationCommands } from "../../../hooks";
import FlowBar from "./FlowBar";
import EditToolToggle from "./EditToolToggle";
import BrushSizeSlider from "./BrushSizeSlider";
import ActionButton from "../../ui/FloatBar/FloatBarButton";

interface ModeBarProps {
	children?: React.ReactNode;
}

export default function EditModeBar({ children }: ModeBarProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { execute } = useAnnotationCommands();

	return (
		<FlowBar hidden={mode !== "edit"}>
			<EditToolToggle />
			{annotationSessionState.editTool !== "vertex" && <BrushSizeSlider />}
			<ActionButton
				name="Undo"
				shortcut="Ctrl+Z"
				icon="ico-undo icon"
				onClick={() => execute.undo()}
				iconOnly
			/>
			<ActionButton
				name="Reset changes"
				shortcut="R"
				icon="ico-rotate icon"
				onClick={() => execute["reset-edit"]()}
				iconOnly
			/>
			<ActionButton
				name="Save changes"
				shortcut="Enter"
				icon="ico-tick icon"
				onClick={() => execute["confirm-edit"]()}
				iconOnly
			/>
			<ActionButton
				name="Cancel editing"
				shortcut="Esc"
				icon="ico-cross icon"
				onClick={() => execute["cancel-edit"]()}
				iconOnly
			/>
			{children}
		</FlowBar>
	);
}
