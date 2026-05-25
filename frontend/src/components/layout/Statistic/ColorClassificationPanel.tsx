import { useState, useMemo } from "react";
import type { ColorClassificationResult } from "../../../services";
import { colorToHex } from "../../../utils/color";
import {
	ColorClassificationPieChart,
	ColorClassificationStackedBar,
	ColorItemGrid,
} from "../../ui/Charts";
import styles from "./InstanceLevelStatisticView.module.css";

interface Props {
	colorClassification: ColorClassificationResult[] | null;
	showUnclassified?: boolean;
}

export default function ColorClassificationPanel({
	colorClassification,
	showUnclassified = false,
}: Props) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [hoveredClass, setHoveredClass] = useState<string | null>(null);

	const sortedColorData = useMemo(() => {
		if (!colorClassification) return [];
		let data = [...colorClassification];
		if (!showUnclassified) {
			data = data.filter((item) => item.label !== "Unclassified");
		}
		return data
			.sort((a, b) => b.pct - a.pct)
			.map((item) => ({
				...item,
				hex: colorToHex(item.color),
			}));
	}, [colorClassification, showUnclassified]);

	const topColors = useMemo(() => {
		return sortedColorData.slice(0, 4);
	}, [sortedColorData]);

	const remainingCount = sortedColorData.length - topColors.length;
	const hasColorData = sortedColorData.length > 0;

	if (!hasColorData) {
		return (
			<div className={styles.statClassificationWrap}>
				<div className={styles.statClassificationHeader}>
					<span className={styles.statSectionSubTitle}>
						Color Classification
					</span>
				</div>
				<div className={styles.statPlaceholder}>
					<svg
						width="28"
						height="28"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={styles.statPlaceholderIcon}
					>
						<path d="M12 2.69l5.74 5.88-5.74 5.88-5.74-5.88z" />
						<path d="M12 22a7 7 0 0 0 7-7c0-2.5-1.5-4.5-3-6.5L12 11 8 8.5C6.5 10.5 5 12.5 5 15a7 7 0 0 0 7 7z" />
					</svg>
					<span className={styles.statPlaceholderText}>
						Define Coral Watch colors to see classification.
					</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`${styles.statClassificationWrap} ${
				isExpanded ? styles.expanded : ""
			}`}
		>
			<div className={styles.statClassificationHeader}>
				<span className={styles.statSectionSubTitle}>
					Color Classification
				</span>
				<span className={styles.statClassCount}>
					{sortedColorData.length} classes
				</span>
			</div>

			{/* Collapsed: Pie Chart + Top 4 */}
			{!isExpanded && (
				<>
					<ColorClassificationPieChart
						data={sortedColorData}
						hoveredClass={hoveredClass}
						onHover={setHoveredClass}
						onLeave={() => setHoveredClass(null)}
					/>

					<ColorItemGrid
						items={topColors}
						hoveredClass={hoveredClass}
						onHover={setHoveredClass}
						onLeave={() => setHoveredClass(null)}
					/>

					{/* Expand Button */}
					{remainingCount > 0 && (
						<button
							className={styles.statToggleBtn}
							onClick={() => setIsExpanded(true)}
						>
							Show all {sortedColorData.length} classes ▼
						</button>
					)}
				</>
			)}

			{/* Expanded: Stacked Bar + Full List */}
			{isExpanded && (
				<>
					<ColorClassificationStackedBar
						data={sortedColorData}
						hoveredClass={hoveredClass}
						onHover={setHoveredClass}
						onLeave={() => setHoveredClass(null)}
					/>

					<ColorItemGrid
						items={sortedColorData}
						hoveredClass={hoveredClass}
						onHover={setHoveredClass}
						onLeave={() => setHoveredClass(null)}
						scrollable
					/>

					{/* Collapse Button */}
					<button
						className={styles.statToggleBtn}
						onClick={() => setIsExpanded(false)}
					>
						Show less ▲
					</button>
				</>
			)}
		</div>
	);
}
