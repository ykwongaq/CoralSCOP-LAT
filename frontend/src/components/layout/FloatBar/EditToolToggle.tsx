import { useAnnotationSession } from "../../../store";
import styles from "./PromptModeToggle.module.css";

export default function EditToolToggle() {
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const tool = annotationSessionState.editTool;

	const setTool = (next: "vertex" | "brush") => {
		if (next !== tool) {
			annotationSessionDispatch({ type: "SET_EDIT_TOOL", payload: next });
		}
	};

	return (
		<div className={styles.toggle} role="group" aria-label="Edit tool">
			<button
				type="button"
				className={`${styles.option} ${tool === "vertex" ? styles.active : ""}`}
				onClick={() => setTool("vertex")}
			>
				Vertex
			</button>
			<button
				type="button"
				className={`${styles.option} ${tool === "brush" ? styles.active : ""}`}
				onClick={() => setTool("brush")}
			>
				Brush
			</button>
		</div>
	);
}
