import { type ReactNode } from "react";
import styles from "./InputBlock.module.css";

interface InputBlockProps {
	label?: string;
	prefix?: ReactNode;
	suffix?: ReactNode;
	inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
	inputRef?: React.Ref<HTMLInputElement>;
}

export default function InputBlock({
	label,
	prefix,
	suffix,
	inputProps,
	inputRef,
}: InputBlockProps) {
	return (
		<div className={styles.inputBlk}>
			{label && <p className={styles.inputBlkLabel}>{label}</p>}
			<div className={styles.inputBlkWrap}>
				{prefix && <span className={styles.inputBlkIcon}>{prefix}</span>}
				<input ref={inputRef} {...inputProps} />
				{suffix}
			</div>
		</div>
	);
}
