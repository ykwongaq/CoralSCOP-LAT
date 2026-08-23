import { useAnnotationSession } from "../../../store";
import styles from "./PromptModeToggle.module.css";

export default function PromptModeToggle() {
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const mode = annotationSessionState.promptMode;

	const setMode = (next: "point" | "polygon" | "brush") => {
		if (next !== mode) {
			annotationSessionDispatch({ type: "SET_PROMPT_MODE", payload: next });
		}
	};

	return (
		<div className={styles.toggle} role="group" aria-label="Prompt mode">
			<button
				type="button"
				className={`${styles.option} ${mode === "point" ? styles.active : ""}`}
				onClick={() => setMode("point")}
			>
				Point
			</button>
			<button
				type="button"
				className={`${styles.option} ${mode === "polygon" ? styles.active : ""}`}
				onClick={() => setMode("polygon")}
			>
				Polygon
			</button>
			<button
				type="button"
				className={`${styles.option} ${mode === "brush" ? styles.active : ""}`}
				onClick={() => setMode("brush")}
			>
				Brush
			</button>
		</div>
	);
}
