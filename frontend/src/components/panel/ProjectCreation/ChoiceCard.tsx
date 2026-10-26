import styles from "./CreationWizard.module.css";

interface ChoiceCardProps {
	selected: boolean;
	title: string;
	description: string;
	onSelect: () => void;
}

/** One option in a wizard yes/no choice (use inside a role="radiogroup"). */
export default function ChoiceCard({
	selected,
	title,
	description,
	onSelect,
}: ChoiceCardProps) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			className={`${styles.choiceCard}${selected ? ` ${styles.choiceCardSelected}` : ""}`}
			onClick={onSelect}
		>
			<span className={styles.choiceRadio} aria-hidden />
			<span>
				<span className={styles.choiceTitle}>{title}</span>
				<span className={styles.choiceDesc}>{description}</span>
			</span>
		</button>
	);
}
