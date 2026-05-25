import MessagerShell from "./MessagerShell";
import ButtonRow from "./ButtonRow";

export interface ModalButton {
  label: string;
  onClick: () => void;
}

export interface PopMessagerProps {
  title: string;
  content: string;
  buttons?: ModalButton[];
}

export default function PopMessager({
  title,
  content,
  buttons = [],
}: PopMessagerProps) {
  return (
    <MessagerShell
      title={title}
      content={content}
      footer={<ButtonRow buttons={buttons} />}
    />
  );
}
