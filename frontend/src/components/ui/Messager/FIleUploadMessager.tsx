import MessagerShell from "./MessagerShell";
import ButtonRow from "./ButtonRow";
import { FileDropZone } from "../FileDropZone";
import styles from "./Messager.module.css";
import type { PopMessagerProps } from "./PopMessager";

export interface FileUploadMessagerProps extends PopMessagerProps {
  acceptedTypes: string[];
  onFile: (file: File) => void;
}

export default function FileUploadMessager({
  title,
  content,
  buttons = [],
  acceptedTypes,
  onFile,
}: FileUploadMessagerProps) {
  return (
    <MessagerShell
      title={title}
      content={content}
      append={
        <div className={styles.modalPopDropZone}>
          <FileDropZone acceptedTypes={acceptedTypes} onFile={onFile} />
        </div>
      }
      footer={<ButtonRow buttons={buttons} />}
    />
  );
}
