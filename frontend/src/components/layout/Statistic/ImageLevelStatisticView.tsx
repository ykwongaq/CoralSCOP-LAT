import DonutChart from "../../ui/Charts/DonutChart";
import LabelCoverageList from "../../ui/Charts/LabelCoverageList";
import { SettingsButton } from "../../ui/Setting";
import { usePopMessage } from "../../ui/Messager";

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
	excludedLabelIds: number[];
	onExcludedLabelsChange: (labelIds: number[]) => void;
}

export default function ImageLevelStatisticView({
	data,
	labels,
	excludedLabelIds,
	onExcludedLabelsChange,
}: Props) {
	const { showExcludeLabels, closeMessage } = usePopMessage();

	const coverage = calculateCoverageData(data, labels, excludedLabelIds);
	const stats = getImageStatistics(data, coverage);
	const perLabelStats = getPerLabelStats(data, labels, excludedLabelIds);

	const handleOpenExcludeLabels = () => {
		showExcludeLabels({
			title: "Exclude Labels",
			content:
				"Check labels to exclude them from image-level statistics. Their pixels will be subtracted from the total image area.",
			labels,
			excludedLabelIds,
			onConfirm: (newExcludedLabelIds) => {
				onExcludedLabelsChange(newExcludedLabelIds);
				closeMessage();
			},
			onCancel: closeMessage,
		});
	};

	// Build donut segments: active labels + "Uncovered" remainder
	const donutSegments = coverage.byLabel
		.filter((l) => l.pixels > 0)
		.map((l) => ({ name: l.name, pct: l.pct, color: l.color }));
	donutSegments.push({
		name: "Uncovered",
		pct: Math.max(0, 100 - coverage.totalPct),
		color: "#9ca3af",
	});

	const excludedCount = excludedLabelIds.length;

	return (
		<div className={styles.statSection}>
			<div className={styles.statHeaderRow}>
				<h3 className={styles.statSectionTitle}>Image Statistics</h3>
				<div className={styles.statSettingsButtonWrapper}>
					<SettingsButton
						onClick={handleOpenExcludeLabels}
						title={
							excludedCount > 0
								? `${excludedCount} label${excludedCount === 1 ? "" : "s"} excluded`
								: "Exclude labels from statistics"
						}
					/>
				</div>
			</div>

			{/* Summary cards */}
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
