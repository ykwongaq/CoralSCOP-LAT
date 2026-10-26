import { useAnnotationSession } from "../../../store";
import type { EditTool } from "../../../types";
import styles from "./PromptModeToggle.module.css";

const TOOLS: { value: EditTool; label: string; title: string }[] = [
	{ value: "vertex", label: "Vertex", title: "Drag or add polygon vertices" },
	{ value: "brush", label: "Brush", title: "Paint to add area to the mask" },
	{ value: "eraser", label: "Eraser", title: "Paint to erase area from the mask" },
];

export default function EditToolToggle() {
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const tool = annotationSessionState.editTool;

	const setTool = (next: EditTool) => {
		if (next !== tool) {
			annotationSessionDispatch({ type: "SET_EDIT_TOOL", payload: next });
		}
	};

	return (
		<div className={styles.toggle} role="group" aria-label="Edit tool">
			{TOOLS.map(({ value, label, title }) => (
				<button
					key={value}
					type="button"
					title={title}
					aria-pressed={tool === value}
					className={`${styles.option} ${tool === value ? styles.active : ""}`}
					onClick={() => setTool(value)}
				>
					{label}
				</button>
			))}
		</div>
	);
}
