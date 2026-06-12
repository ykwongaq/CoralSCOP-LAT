import { useState } from "react";
import DonutChart from "../../ui/Charts/DonutChart";
import LabelCoverageList from "../../ui/Charts/LabelCoverageList";
import { SettingsButton, DropdownMenu } from "../../ui/Setting";

import styles from "./ImageLevelStatisticView.module.css";

import type { Label, Data } from "../../../types";
import {
	calculateCoverageData,
	getImageStatistics,
	getPerLabelStats,
} from "../../../services";
import { SummaryCard } from "../../ui/Statistic";

interface Props {
	data: Data | null;
	labels: Label[];
}

export default function ImageLevelStatisticView({ data, labels }: Props) {
	const coverage = calculateCoverageData(data, labels);
	const stats = getImageStatistics(data, coverage);
	const perLabelStats = getPerLabelStats(data, labels);
	const [showDropdown, setShowDropdown] = useState(false);

	// Build donut segments: active labels + "Uncovered" remainder
	const donutSegments = coverage.byLabel
		.filter((l) => l.pixels > 0)
		.map((l) => ({ name: l.name, pct: l.pct, color: l.color }));
	donutSegments.push({
		name: "Uncovered",
		pct: Math.max(0, 100 - coverage.totalPct),
		color: "#9ca3af",
	});

	return (
		<div className={styles.statSection}>
			<div className={styles.statHeaderRow}>
				<h3 className={styles.statSectionTitle}>Image Statistics</h3>
				<div className={styles.statSettingsButtonWrapper}>
					<SettingsButton onClick={() => setShowDropdown(!showDropdown)} />
					{showDropdown && (
						<DropdownMenu onClose={() => setShowDropdown(false)}>
							<div className={styles.statMenuPanel}>
								<button
									className={styles.statMenuBtn}
									onClick={() => setShowDropdown(false)}
								>
									Exclude Labels
								</button>
							</div>
						</DropdownMenu>
					)}
				</div>
			</div>

			{/* Summary cards — unchanged */}
			<div className={styles.statSummaryRow}>
				<SummaryCard
					statistic={`${stats.totalCoveragePct.toFixed(1)}%`}
					name="Total Coverage"
				/>
				<SummaryCard
					statistic={`${stats.totalAnnotations}`}
					name="Annotations"
				/>
				<SummaryCard
					statistic={`${stats.activeLabelCount}`}
					name="Categories"
				/>
			</div>

			{/* Charts row: donut + per-label details */}
			{donutSegments.length > 0 && (
				<div className={styles.statChartsRow}>
					<div className={styles.statChartDonut}>
						<p className={styles.statChartLabel}>Coverage Breakdown</p>
						<DonutChart segments={donutSegments} totalPct={coverage.totalPct} />
					</div>

					<div className={styles.statChartList}>
						<p className={styles.statChartLabel}>Per-Label Details</p>
						<LabelCoverageList items={perLabelStats} />
					</div>
				</div>
			)}

			{!data && <p className={styles.statEmptyHint}>No image selected.</p>}
		</div>
	);
}
