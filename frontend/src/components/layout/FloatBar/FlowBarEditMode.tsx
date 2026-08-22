import { useAnnotationSession } from "../../../store";
import { useAnnotationCommands } from "../../../hooks";
import FlowBar from "./FlowBar";
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
			<ActionButton
				name="Reset (R)"
				icon="ico-rotate icon"
				onClick={() => execute["reset-edit"]()}
			/>
			<ActionButton
				name=""
				icon="ico-tick icon"
				onClick={() => execute["confirm-edit"]()}
			/>
			<ActionButton
				name="Cancel"
				icon="float-bar_button"
				onClick={() => execute["cancel-edit"]()}
			/>
			{children}
		</FlowBar>
	);
}
