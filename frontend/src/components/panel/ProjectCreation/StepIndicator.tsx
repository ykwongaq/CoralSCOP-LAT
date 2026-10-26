import { Fragment } from "react";
import styles from "./CreationWizard.module.css";

interface StepIndicatorProps {
	steps: string[];
	current: number;
}

export default function StepIndicator({ steps, current }: StepIndicatorProps) {
	return (
		<ol className={styles.stepper} aria-label="Project creation steps">
			{steps.map((label, i) => {
				const isDone = i < current;
				const isActive = i === current;
				const itemClass = [
					styles.stepperItem,
					isActive ? styles.stepperItemActive : "",
					isDone ? styles.stepperItemDone : "",
				]
					.filter(Boolean)
					.join(" ");

				return (
					<Fragment key={label}>
						{i > 0 && (
							<li
								aria-hidden
								className={`${styles.stepperLine}${i <= current ? ` ${styles.stepperLineDone}` : ""}`}
							/>
						)}
						<li
							className={itemClass}
							aria-current={isActive ? "step" : undefined}
						>
							<span className={styles.stepperDot}>{isDone ? "✓" : i + 1}</span>
							{label}
						</li>
					</Fragment>
				);
			})}
		</ol>
	);
}
