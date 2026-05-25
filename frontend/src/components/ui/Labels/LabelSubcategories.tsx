import { useState } from "react";
import styles from "./LabelSubcategories.module.css";

interface LabelSubcategoriesProps {
	subCategories: string[];
	onAddStatus: (status: string) => void;
	onDeleteStatus: (index: number) => void;
}

export default function LabelSubcategories({
	subCategories,
	onAddStatus,
	onDeleteStatus,
}: LabelSubcategoriesProps) {
	const [isAddingStatus, setIsAddingStatus] = useState(false);
	const [newStatus, setNewStatus] = useState("");

	const handleAddStatus = () => {
		const trimmed = newStatus.trim();
		if (trimmed) {
			onAddStatus(trimmed);
		}
		setNewStatus("");
		setIsAddingStatus(false);
	};

	return (
		<div className={styles.labelSubcategory}>
			{subCategories.map((status, index) => (
				<span key={index} className={styles.labelSubcategoryTag}>
					{status}
					<button
						className={styles.labelSubcategoryTagRemove}
						onClick={() => onDeleteStatus(index)}
					>
						&#215;
					</button>
				</span>
			))}
			{isAddingStatus ? (
				<input
					autoFocus
					type="text"
					className={styles.labelSubcategoryInput}
					placeholder="Sub-category..."
					value={newStatus}
					onChange={(e) => setNewStatus(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							handleAddStatus();
						} else if (e.key === "Escape") {
							setNewStatus("");
							setIsAddingStatus(false);
						}
					}}
					onBlur={() => {
						setNewStatus("");
						setIsAddingStatus(false);
					}}
				/>
			) : (
				<button
					className={styles.labelSubcategoryAddBtn}
					onClick={() => setIsAddingStatus(true)}
					title="Add sub-category"
				>
					+
				</button>
			)}
		</div>
	);
}
