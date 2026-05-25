import type { ReactNode } from "react";
import styles from "./Messager.module.css";

export interface MessagerShellProps {
  title: string;
  content: string;
  prepend?: ReactNode;
  append?: ReactNode;
  footer?: ReactNode;
}

export default function MessagerShell({
  title,
  content,
  prepend,
  append,
  footer,
}: MessagerShellProps) {
  return (
    <div className={styles.modalPop}>
      <div className={styles.modalPopInner}>
        {prepend}
        <p className={styles.modalPopLgText}>{title}</p>
        <p className={styles.modalPopText}>{content}</p>
        {append}
        {footer}
      </div>
    </div>
  );
}
