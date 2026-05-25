import { useState } from "react";
import type { ReactNode } from "react";
import type { PopMessagerProps } from "./PopMessager";
import MessagerShell from "./MessagerShell";
import ButtonRow from "./ButtonRow";
import styles from "./Messager.module.css";

export interface TextInputMessagerProps extends PopMessagerProps {
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
  suffix?: ReactNode;
  inputClassName?: string;
  formatInitialValue?: (value: string) => string;
  trimOnSubmit?: boolean;
}

export default function TextInputMessager({
  title,
  content,
  defaultValue = "",
  placeholder = "",
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  buttons = [],
  suffix,
  inputClassName,
  formatInitialValue = (v) => v,
  trimOnSubmit = false,
}: TextInputMessagerProps) {
  const [value, setValue] = useState(formatInitialValue(defaultValue));

  const effectiveButtons =
    buttons.length > 0
      ? buttons
      : [
          ...(onCancel
            ? [{ label: cancelLabel ?? "Cancel", onClick: onCancel }]
            : []),
          ...(onConfirm
            ? [
                {
                  label: confirmLabel ?? "Confirm",
                  onClick: () => {
                    const submitted = trimOnSubmit ? value.trim() : value;
                    onConfirm(submitted);
                  },
                },
              ]
            : []),
        ];

  const inputElement = (
    <input
      type="text"
      className={`${styles.modalPopInput} ${inputClassName || ""}`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
    />
  );

  return (
    <MessagerShell
      title={title}
      content={content}
      append={
        suffix ? (
          <div className={styles.modalPopInputGroup}>
            {inputElement}
            {suffix}
          </div>
        ) : (
          inputElement
        )
      }
      footer={<ButtonRow buttons={effectiveButtons} />}
    />
  );
}
