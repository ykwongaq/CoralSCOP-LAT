import type { PopMessagerProps } from "./PopMessager";
import MessagerShell from "./MessagerShell";
import ButtonRow from "./ButtonRow";
import styles from "./Messager.module.css";

export interface ErrorMessagerProps extends PopMessagerProps {
  errorMessage: string;
}

export default function ErrorMessager({
  title,
  content,
  errorMessage,
  buttons = [],
}: ErrorMessagerProps) {
  return (
    <MessagerShell
      title={title}
      content={content}
      append={
        <textarea
          className={styles.modalPopTextarea}
          readOnly
          value={errorMessage}
        />
      }
      footer={<ButtonRow buttons={buttons} />}
    />
  );
}
