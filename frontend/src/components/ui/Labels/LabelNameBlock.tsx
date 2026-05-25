import { useEffect, useRef } from "react";
import styles from "./LabelNameBlock.module.css";

interface LabelNameBlockProps {
	labelName: string;
	isEditing: boolean;
	onCommit: (newName: string) => void;
	onCancelEdit: () => void;
}

export default function LabelNameBlock({
	labelName,
	isEditing,
	onCommit,
	onCancelEdit,
}: LabelNameBlockProps) {
	const labelTextRef = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		if (isEditing && labelTextRef.current) {
			labelTextRef.current.focus();
			const range = document.createRange();
			range.selectNodeContents(labelTextRef.current);
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
	}, [isEditing]);

	const handleBlur = () => {
		if (labelTextRef.current) {
			onCommit(labelTextRef.current.innerText.trim());
		}
	};

	return (
		<p
			ref={labelTextRef}
			className={`${styles.labelName} labelText`}
			contentEditable={isEditing}
			suppressContentEditableWarning={true}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					labelTextRef.current?.blur();
				} else if (e.key === "Escape") {
					e.preventDefault();
					if (labelTextRef.current) {
						labelTextRef.current.innerText = labelName;
					}
					onCancelEdit();
				}
			}}
			onBlur={handleBlur}
		>
			{labelName}
		</p>
	);
}
