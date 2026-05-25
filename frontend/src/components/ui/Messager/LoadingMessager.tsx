import type { PopMessagerProps } from "./PopMessager";
import LoadingSVG from "../../../assets/images/loading.svg";
import MessagerShell from "./MessagerShell";
import ButtonRow from "./ButtonRow";
import styles from "./Messager.module.css";

export interface LoadingMessagerProps extends PopMessagerProps {
  progress: number | null;
}

export default function LoadingMessager({
  title,
  content,
  progress,
  buttons = [],
}: LoadingMessagerProps) {
  return (
    <MessagerShell
      title={title}
      content={content}
      prepend={
        <>
          <img
            className={styles.modalPopLoading}
            src={LoadingSVG}
            alt=""
          />
          {progress !== null ? (
            <p id="loading-percentage" className={styles.modalPopNumber}>
              {progress}%
            </p>
          ) : null}
        </>
      }
      footer={<ButtonRow buttons={buttons} />}
    />
  );
}
