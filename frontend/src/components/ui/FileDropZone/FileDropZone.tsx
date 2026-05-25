import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import Button from "../Button";
import styles from "./FileDropZone.module.css";

export interface FileDropZoneProps {
  acceptedTypes: string[];
  onFile: (file: File) => void;
  label?: string;
  className?: string;
}

export interface FileDropZoneRef {
  reset: () => void;
}

const FileDropZone = forwardRef<FileDropZoneRef, FileDropZoneProps>(function FileDropZone(
  { acceptedTypes, onFile, label, className },
  ref,
) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedSet = useMemo(() => new Set(acceptedTypes), [acceptedTypes.join(",")]);

  const isAccepted = useCallback(
    (file: File) => acceptedSet.has(file.type),
    [acceptedSet],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && isAccepted(file)) {
        onFile(file);
      }
    },
    [isAccepted, onFile],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isAccepted(file)) {
        onFile(file);
      }
    },
    [isAccepted, onFile],
  );

  const openFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useImperativeHandle(ref, () => ({
    reset() {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  }));

  const classNames = [styles.dropContainer, isDragging ? styles.dropContainerActive : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.dropText}>
        {label ?? "Drop a file here."} Or{" "}
        <Button label="browse" onClick={openFileSelect} className={styles.selectLink} />
        to select a file.
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />
    </div>
  );
});

export default FileDropZone;
