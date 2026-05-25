import { useAnnotationSession } from "../../../store";
import { useAnnotationCommands } from "../../../hooks";

import FlowBar from "./FlowBar";
import ActivateLabelButton from "./ActivateLabelButton";
import ActionButton from "../../ui/FloatBar/FloatBarButton";

interface ModeBarProps {
	children?: React.ReactNode;
}

export default function AddModeBar({ children }: ModeBarProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { execute, isActivateLabelOpen, setIsActivateLabelOpen } =
		useAnnotationCommands();

	return (
		<FlowBar hidden={mode !== "add"}>
			<ActivateLabelButton
				isOpen={isActivateLabelOpen}
				onToggle={() => setIsActivateLabelOpen((prev) => !prev)}
			/>
			<ActionButton
				name=""
				icon="ico-rotate icon"
				onClick={() => execute["clear-prompts"]()}
			/>
			<ActionButton
				name=""
				icon="ico-tick icon"
				onClick={() => execute["confirm-mask"]()}
			/>
			<ActionButton
				name="Back"
				icon="float-bar_button"
				onClick={() => execute["switch-to-select"]()}
			/>
			{children}
		</FlowBar>
	);
}
