import type { ColorClassificationResult } from "../../../services";
import styles from "./ColorClassificationStackedBar.module.css";

interface Props {
	data: Array<ColorClassificationResult & { hex: string }>;
	hoveredClass: string | null;
	onHover: (label: string) => void;
	onLeave: () => void;
}

export default function ColorClassificationStackedBar({
	data,
	hoveredClass,
	onHover,
	onLeave,
}: Props) {
	return (
		<div className={styles.stackedBar}>
			{data.map((item) => (
				<div
					key={item.label}
					className={styles.stackedSegment}
					style={{
						width: `${item.pct}%`,
						backgroundColor: item.hex,
						opacity:
							hoveredClass === null || hoveredClass === item.label
								? 1
								: 0.4,
					}}
					onMouseEnter={() => onHover(item.label)}
					onMouseLeave={onLeave}
					title={`${item.label}: ${item.pct.toFixed(1)}%`}
				/>
			))}
		</div>
	);
}
