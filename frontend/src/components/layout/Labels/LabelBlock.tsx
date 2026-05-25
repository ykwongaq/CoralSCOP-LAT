import { useState, useRef, useEffect } from "react";
import styles from "./LabelBlock.module.css";

import {
	useProject,
	useAnnotationSession,
	useVisualizationSetting,
} from "../../../store";
import type { Label } from "../../../types";
import { usePopMessage } from "../../ui/Messager";
import { getLabelColor, getTextColor } from "../../../utils";
import LabelButton from "../../ui/Labels/LabelButton";
import LabelNameBlock from "../../ui/Labels/LabelNameBlock";
import LabelVisibilityToggle from "../../ui/Labels/LabelVisibilityToggle";
import LabelSubcategories from "../../ui/Labels/LabelSubcategories";
import DropDownMenu, { DropDownMenuItem } from "../../ui/Labels/DropDownMenu";

interface LabelBlockProps {
	label: Label;
}

export default function LabelBlock({ label }: LabelBlockProps) {
	const labelID = label.id;
	const labelName = label.name;
	const subCategories = label.status;

	const labelColor = getLabelColor(labelID);
	const textColor = getTextColor(labelID);

	const { projectState, projectDispatch } = useProject();
	const { annotationSessionDispatch } = useAnnotationSession();
	const { visualizationSettingState, visualizationSettingDispatch } =
		useVisualizationSetting();
	const { showMessage, closeMessage } = usePopMessage();

	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
	const [isEditing, setIsEditing] = useState(false);
	const [isExpanded, setIsExpanded] = useState(() => subCategories.length > 0);
	const menuRef = useRef<HTMLDivElement>(null);
	const menuButtonRef = useRef<HTMLButtonElement>(null);

	const isHidden = visualizationSettingState.hiddingLabels.some(
		(hiddingLabel: Label) => hiddingLabel.id === label.id,
	);

	const handleMenuClick = (event: React.MouseEvent) => {
		event.preventDefault();
		if (menuButtonRef.current) {
			const rect = menuButtonRef.current.getBoundingClientRect();
			setMenuPosition({ x: rect.left, y: rect.bottom });
		}
		setIsMenuOpen(true);
	};

	const handleCloseMenu = () => {
		setIsMenuOpen(false);
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node) &&
				menuButtonRef.current &&
				!menuButtonRef.current.contains(event.target as Node)
			) {
				setIsMenuOpen(false);
			}
		};

		if (isMenuOpen) {
			document.addEventListener("click", handleClickOutside);
		}

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, [isMenuOpen]);

	const handleCommitRename = (newName: string) => {
		if (newName && newName !== labelName) {
			projectDispatch({
				type: "UPDATE_LABEL_NAME",
				payload: { labelId: label.id, newName },
			});
		}
		setIsEditing(false);
	};

	const handleToggleVisibility = () => {
		if (isHidden) {
			visualizationSettingDispatch({
				type: "SET_HIDING_LABELS",
				payload: visualizationSettingState.hiddingLabels.filter(
					(l: Label) => l.id !== label.id,
				),
			});
		} else {
			visualizationSettingDispatch({
				type: "SET_HIDING_LABELS",
				payload: [...visualizationSettingState.hiddingLabels, label],
			});
		}
	};

	const handleAddStatus = (status: string) => {
		projectDispatch({
			type: "ADD_LABEL_STATUS",
			payload: { labelId: label.id, status },
		});
	};

	const handleDeleteStatus = (index: number) => {
		projectDispatch({
			type: "DELETE_LABEL_STATUS",
			payload: { labelId: label.id, statusIndex: index },
		});
	};

	const menuItems = [
		{
			name: "Rename",
			onClick: () => {
				setIsEditing(true);
				handleCloseMenu();
			},
		},
		{
			name: "Delete",
			onClick: () => {
				handleCloseMenu();
				const isLabelInUse = projectState.dataList.some((data) =>
					data.annotations.some(
						(annotation) => annotation.labelId === label.id,
					),
				);
				if (isLabelInUse) {
					showMessage({
						title: "Confirm Deletion",
						content:
							"This label is used in some annotations. Deleting it will remove all those annotations. Are you sure?",
						buttons: [
							{ label: "Cancel", onClick: closeMessage },
							{
								label: "Delete",
								onClick: () => {
									projectDispatch({
										type: "DELETE_LABEL",
										payload: { labelId: label.id },
									});
									annotationSessionDispatch({
										type: "CLEAR_ACTIVE_LABEL",
									});
									closeMessage();
								},
							},
						],
					});
				} else {
					projectDispatch({
						type: "DELETE_LABEL",
						payload: { labelId: label.id },
					});
					annotationSessionDispatch({ type: "CLEAR_ACTIVE_LABEL" });
				}
			},
		},
	];

	return (
		<div className={styles.colorPlateListItem}>
			<div className={`${styles.labelBlk} labelButton`}>
				<LabelButton
					label={String(labelID + 1)}
					backgroundColor={labelColor}
					textColor={textColor}
				/>
				<LabelNameBlock
					labelName={labelName}
					isEditing={isEditing}
					onCommit={handleCommitRename}
					onCancelEdit={() => setIsEditing(false)}
				/>
				<div className={styles.labelBlkSide}>
					<button
						className={`${styles.labelBlkBtn} ${styles.labelBlkBtnChevron}${isExpanded ? ` ${styles.labelBlkBtnChevronActive}` : ""}`}
						onClick={() => setIsExpanded(!isExpanded)}
						title="Toggle sub-categories"
					>
						<span className={styles.labelBlkChevron}>&#9662;</span>
					</button>
					<LabelVisibilityToggle
						isHidden={isHidden}
						onToggle={handleToggleVisibility}
					/>
					<button
						ref={menuButtonRef}
						className={styles.labelBlkBtn}
						onClick={handleMenuClick}
					>
						<span className="ico-dots-horizontal-triple"></span>
					</button>
				</div>
			</div>
			{isExpanded && (
				<LabelSubcategories
					subCategories={subCategories}
					onAddStatus={handleAddStatus}
					onDeleteStatus={handleDeleteStatus}
				/>
			)}
			<div ref={menuRef}>
				<DropDownMenu isOpen={isMenuOpen} position={menuPosition}>
					{menuItems.map((item) => (
						<DropDownMenuItem
							key={item.name}
							name={item.name}
							onClick={item.onClick}
						/>
					))}
				</DropDownMenu>
			</div>
		</div>
	);
}
