import { useState, useEffect } from "react";
import styles from "./AnnotationToggleBlock.module.css";

interface AnnotationToggleBlockProps {
	name: string;
	id: string;
	defaultValue?: boolean;
	onChange?: (value: boolean) => void;
}

export default function AnnotationToggleBlock({
	name,
	id,
	defaultValue = false,
	onChange,
}: AnnotationToggleBlockProps) {
	const [isChecked, setIsChecked] = useState<boolean>(defaultValue);

	useEffect(() => {
		setIsChecked(defaultValue);
	}, [defaultValue]);

	const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
		const checked = e.target.checked;
		setIsChecked(checked);
		onChange?.(checked);
	};

	return (
		<div className="side-bar__blk">
			<div className={styles.toggleBlk}>
				<p className={styles.toggleBlkTitle}>{name}</p>
				<label className={styles.switch}>
					<input
						type="checkbox"
						id={id}
						checked={isChecked}
						onChange={handleToggle}
					/>
					<span className={styles.switchSlider}></span>
				</label>
			</div>
		</div>
	);
}
