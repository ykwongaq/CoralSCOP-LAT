import { useState } from "react";
import MessagerShell from "./MessagerShell";
import Button from "../Button";
import type { Label } from "../../../types";
import { getLabelColor, getTextColor } from "../../../utils";
import styles from "./ExcludeLabelsMessager.module.css";

export interface ExcludeLabelsMessagerProps {
	title: string;
	content: string;
	labels: Label[];
	excludedLabelIds: number[];
	onConfirm: (excludedLabelIds: number[]) => void;
	onCancel: () => void;
}

export default function ExcludeLabelsMessager({
	title,
	content,
	labels,
	excludedLabelIds,
	onConfirm,
	onCancel,
}: ExcludeLabelsMessagerProps) {
	const [excludedIds, setExcludedIds] = useState<Set<number>>(
		new Set(excludedLabelIds),
	);

	const toggleLabel = (id: number) => {
		setExcludedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const excludeAll = () => setExcludedIds(new Set(labels.map((l) => l.id)));
	const includeAll = () => setExcludedIds(new Set());

	const handleConfirm = () => {
		onConfirm(Array.from(excludedIds));
	};

	return (
		<MessagerShell
			title={title}
			content={content}
			append={
				<div className={styles.container}>
					<div className={styles.header}>
						<span className={styles.selectionCount}>
							{excludedIds.size} of {labels.length} excluded
						</span>
						<div className={styles.headerActions}>
							<button
								type="button"
								className={styles.textBtn}
								onClick={includeAll}
							>
								Include All
							</button>
							<span className={styles.divider} />
							<button
								type="button"
								className={styles.textBtn}
								onClick={excludeAll}
							>
								Exclude All
							</button>
						</div>
					</div>

					<div className={styles.list}>
						{labels.map((label, index) => {
							const isExcluded = excludedIds.has(label.id);
							const color = getLabelColor(index);
							const textColor = getTextColor(index);

							return (
								<div
									key={label.id}
									className={`${styles.row} ${
										isExcluded ? styles.rowExcluded : ""
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
											isExcluded ? styles.checkboxExcluded : ""
										}`}
									>
										{isExcluded && (
											<svg
												width="12"
												height="12"
												viewBox="0 0 12 12"
												fill="none"
											>
												<path
													d="M2 2L10 10M10 2L2 10"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
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
										{label.status.length > 0 && (
											<div className={styles.statusList}>
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
					<Button label="Confirm" onClick={handleConfirm} />
				</div>
			}
		/>
	);
}
