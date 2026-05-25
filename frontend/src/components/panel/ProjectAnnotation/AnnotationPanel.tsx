import { useAnnotationSession } from "../../../store";
import { useAnnotationCommands, useAnnotationKeyboard } from "../../../hooks";
import {
	AnnotationSideBar,
	AnnotationCanvas,
	FlowBarSelectMode,
	FlowBarAddMode,
} from "../../layout";
import styles from "./AnnotationPanel.module.css";
interface AnnotationPanelProps {
	selectModeChildren?: React.ReactNode;
	addModeChildren?: React.ReactNode;
}

export const AnnotationPanelID = "annotation-panel";

/**
 * Sets up annotation keyboard shortcuts and renders the default annotation
 * layout in one place. Optional extra controls can still be appended to the
 * select/add mode action bars when needed.
 */
export default function AnnotationPanel({
	selectModeChildren,
	addModeChildren,
}: AnnotationPanelProps) {
	const { annotationSessionState } = useAnnotationSession();
	const mode = annotationSessionState.annotationMode;
	const { execute } = useAnnotationCommands();

	useAnnotationKeyboard(mode, (cmd) => execute[cmd]());

	return (
		<>
			<AnnotationSideBar />
			<div className={styles.canvasWrapper}>
				<AnnotationCanvas />
				<FlowBarSelectMode>{selectModeChildren}</FlowBarSelectMode>
				<FlowBarAddMode>{addModeChildren}</FlowBarAddMode>
			</div>
		</>
	);
}
