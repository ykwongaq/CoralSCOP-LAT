import type { ColorClassificationResult } from "../../../services";
import styles from "./ColorItemGrid.module.css";

interface Props {
	items: Array<ColorClassificationResult & { hex: string }>;
	hoveredClass: string | null;
	onHover: (label: string) => void;
	onLeave: () => void;
	scrollable?: boolean;
}

export default function ColorItemGrid({
	items,
	hoveredClass,
	onHover,
	onLeave,
	scrollable = false,
}: Props) {
	const containerClass = scrollable
		? `${styles.topClassesGrid} ${styles.gridScrollable}`
		: styles.topClassesGrid;

	return (
		<div className={containerClass}>
			{items.map((item) => (
				<div
					key={item.label}
					className={`${styles.topClassItem} ${
						hoveredClass && hoveredClass !== item.label
							? styles.dimmed
							: ""
					}`}
					onMouseEnter={() => onHover(item.label)}
					onMouseLeave={onLeave}
				>
					<span
						className={styles.topClassDot}
						style={{
							backgroundColor: item.hex,
						}}
					/>
					<span className={styles.topClassName}>
						{item.label}
					</span>
					<span className={styles.topClassPct}>
						{item.pct.toFixed(1)}%
					</span>
				</div>
			))}
		</div>
	);
}
