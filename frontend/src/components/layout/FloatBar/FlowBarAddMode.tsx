import { useAnnotationSession } from "../../../store";
import { useAnnotationCommands } from "../../../hooks";

import FlowBar from "./FlowBar";
import ActivateLabelButton from "./ActivateLabelButton";
import PromptModeToggle from "./PromptModeToggle";
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
			<PromptModeToggle />
			<ActionButton
				name="Undo"
				shortcut="Ctrl+Z"
				icon="ico-undo icon"
				onClick={() => execute.undo()}
				iconOnly
			/>
			<ActionButton
				name="Clear prompts"
				shortcut="R"
				icon="ico-rotate icon"
				onClick={() => execute["clear-prompts"]()}
				iconOnly
			/>
			<ActionButton
				name="Confirm mask"
				shortcut="Space"
				icon="ico-tick icon"
				onClick={() => execute["confirm-mask"]()}
				iconOnly
			/>
			<ActionButton
				name="Back to select"
				shortcut="W"
				icon="ico-line-arrow-left icon"
				onClick={() => execute["switch-to-select"]()}
				iconOnly
			/>
			{children}
		</FlowBar>
	);
}
