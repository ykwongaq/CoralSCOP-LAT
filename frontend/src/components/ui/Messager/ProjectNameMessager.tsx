import type { PopMessagerProps } from "./PopMessager";
import TextInputMessager from "./TextInputMessager";
import styles from "./Messager.module.css";

export interface ProjectNameMessagerProps extends PopMessagerProps {
	defaultValue?: string;
	placeholder?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm?: (value: string) => void;
	onCancel?: () => void;
}

export default function ProjectNameMessager(props: ProjectNameMessagerProps) {
	return (
		<TextInputMessager
			{...props}
			placeholder={props.placeholder ?? "Enter project name"}
			suffix={<span className={styles.modalPopInputSuffix}>.coral</span>}
			inputClassName={styles.modalPopInputWithSuffix}
			formatInitialValue={(v) => v.replace(/\.coral$/i, "")}
			trimOnSubmit
		/>
	);
}
