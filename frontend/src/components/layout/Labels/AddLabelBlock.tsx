import { useEffect, useRef, useState } from "react";
import { useToggleInput } from "../../../hooks/useToggleInputOptions";
import InputBlock from "../../../components/ui/Labels/InputBlock";
import styles from "./AddLabelBlock.module.css";
import inputStyles from "../../../components/ui/Labels/InputBlock.module.css";
import { usePopMessage } from "../../ui/Messager";
import type { Label } from "../../../types";
import { parseImportedLabels, toImportedLabelPayload } from "../../../services";

interface AddLabelBlockProps {
	onAddLabel: (labelName: string) => void;
	onImportLabels?: (labels: Array<Omit<Label, "id">>) => void;
}

export default function AddLabelBlock({
	onAddLabel,
	onImportLabels,
}: AddLabelBlockProps) {
	const [inputValue, setInputValue] = useState("");
	const { isOpen, inputRef, toggle, hide } = useToggleInput();
	const containerRef = useRef<HTMLDivElement>(null);
	const { showFileUpload, closeMessage, showImportLabel, showError } =
		usePopMessage();

	const handleConfirm = () => {
		const trimmedValue = inputValue.trim();
		if (trimmedValue) {
			onAddLabel(trimmedValue);
			setInputValue("");
		}
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				hide();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [containerRef, hide]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleConfirm();
		}
	};

	const handleImportFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const result = e.target?.result as string;
				const validLabels = parseImportedLabels(result);

				showImportLabel({
					title: "Import Labels",
					content: `Found ${validLabels.length} label(s). Select which ones to import:`,
					labels: validLabels,
					onConfirm: (selected) => {
						if (onImportLabels) {
							onImportLabels(toImportedLabelPayload(selected));
						} else {
							selected.forEach((label) => onAddLabel(label.name));
						}
						closeMessage();
					},
					onCancel: closeMessage,
				});
			} catch (err) {
				showError({
					title: "Import Failed",
					content: "Please check your file and try again.",
					errorMessage:
						err instanceof Error
							? err.message
							: "Failed to parse the JSON file.",
				});
			}
		};
		reader.readAsText(file);
	};

	return (
		<div ref={containerRef}>
			<div style={{ display: "flex", gap: "16px" }}>
				<button className={styles.expandableInputBtn} onClick={toggle}>
					<span className={styles.expandableInputBtnIcon}>
						{isOpen ? "×" : "+"}
					</span>
					<span className={styles.expandableInputBtnText}>
						{isOpen ? "Cancel" : "Add Label"}
					</span>
				</button>
				{!isOpen && (
					<button
						className={styles.expandableInputBtn}
						onClick={() =>
							showFileUpload({
								title: "Import Labels",
								content: "Upload a JSON file containing labels",
								acceptedTypes: ["application/json"],
								onFile: handleImportFile,
								buttons: [
									{
										label: "Cancel",
										onClick: closeMessage,
									},
								],
							})
						}
					>
						<span className={styles.expandableInputBtnIcon}>↓</span>
						<span className={styles.expandableInputBtnText}>Import Label</span>
					</button>
				)}
			</div>
			{isOpen && (
				<InputBlock
					inputRef={inputRef}
					inputProps={{
						type: "text",
						id: "add-category-input",
						name: "add",
						value: inputValue,
						onChange: (e) => setInputValue(e.target.value),
						onKeyDown: handleKeyDown,
					}}
					suffix={
						<button
							className={inputStyles.inputBlkConfirm}
							id="add-category-button"
							type="button"
							onClick={handleConfirm}
						>
							Confirm
						</button>
					}
				/>
			)}
		</div>
	);
}
