import { useState } from "react";
import MessagerShell from "./MessagerShell";
import Button from "../Button";
import type { Label } from "../../../types";
import { getLabelColor, getTextColor } from "../../../utils";
import { deepestSpecifiedRank } from "../../../utils/taxonomy";
import styles from "./ImportLabelMessager.module.css";

export interface ImportLabelMessagerProps {
	title: string;
	content: string;
	labels: Label[];
	onConfirm: (selectedLabels: Label[]) => void;
	onCancel: () => void;
}

export default function ImportLabelMessager({
	title,
	content,
	labels,
	onConfirm,
	onCancel,
}: ImportLabelMessagerProps) {
	const [selectedIds, setSelectedIds] = useState<Set<number>>(
		new Set(labels.map((l) => l.id)),
	);

	const toggleLabel = (id: number) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const checkAll = () => setSelectedIds(new Set(labels.map((l) => l.id)));
	const deselectAll = () => setSelectedIds(new Set());

	const handleConfirm = () => {
		const selected = labels.filter((l) => selectedIds.has(l.id));
		onConfirm(selected);
	};

	const isConfirmDisabled = selectedIds.size === 0;

	return (
		<MessagerShell
			title={title}
			content={content}
			append={
				<div className={styles.container}>
					<div className={styles.header}>
						<span className={styles.selectionCount}>
							{selectedIds.size} of {labels.length} selected
						</span>
						<div className={styles.headerActions}>
							<button
								type="button"
								className={styles.textBtn}
								onClick={checkAll}
							>
								Check All
							</button>
							<span className={styles.divider} />
							<button
								type="button"
								className={styles.textBtn}
								onClick={deselectAll}
							>
								Deselect All
							</button>
						</div>
					</div>

					<div className={styles.list}>
						{labels.map((label, index) => {
							const isSelected = selectedIds.has(label.id);
							const color = getLabelColor(index);
							const textColor = getTextColor(index);
							const taxonomyRank =
								label.type === "taxonomic" && label.taxonomy
									? deepestSpecifiedRank(label.taxonomy)
									: null;
							const showMeta = label.status.length > 0 || taxonomyRank !== null;

							return (
								<div
									key={label.id}
									className={`${styles.row} ${
										isSelected ? styles.rowSelected : ""
									}`}
									onClick={() => toggleLabel(label.id)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											toggleLabel(label.id);
										}
									}}
								>
									<div
										className={`${styles.checkbox} ${
											isSelected ? styles.checkboxChecked : ""
										}`}
									>
										{isSelected && (
											<svg
												width="12"
												height="12"
												viewBox="0 0 12 12"
												fill="none"
											>
												<path
													d="M2 6L5 9L10 3"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										)}
									</div>

									<div
										className={styles.badge}
										style={{
											backgroundColor: color,
											color: textColor,
										}}
									>
										{index + 1}
									</div>

									<div className={styles.labelInfo}>
										<span className={styles.labelName}>{label.name}</span>
										{showMeta && (
											<div className={styles.statusList}>
												{taxonomyRank && (
													<span
														className={`${styles.statusChip} ${styles.taxonomyChip}`}
													>
														taxonomic: {taxonomyRank}
													</span>
												)}
												{label.status.map((s, i) => (
													<span key={i} className={styles.statusChip}>
														{s}
													</span>
												))}
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			}
			footer={
				<div className={styles.footer}>
					<Button label="Cancel" onClick={onCancel} isBorder />
					<Button
						label="Confirm"
						onClick={handleConfirm}
						disabled={isConfirmDisabled}
					/>
				</div>
			}
		/>
	);
}
