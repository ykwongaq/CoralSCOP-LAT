import {
	PieChart,
	Pie,
	Cell,
	Tooltip,
	Legend,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";

import styles from "./ImageLevelStatisticView.module.css";

import type { Label, Data } from "../../../types";
import {
	calculateCoverageData,
	preparePieData,
	prepareBarData,
	getImageStatistics,
} from "../../../services";
import { SummaryCard } from "../../ui/Statistic";
interface Props {
	data: Data | null;
	labels: Label[];
}

export default function ImageLevelStatisticView({ data, labels }: Props) {
	const coverage = calculateCoverageData(data, labels);
	const stats = getImageStatistics(data, coverage);

	const pieData = preparePieData(coverage);
	const barData = prepareBarData(coverage);

	return (
		<div className={styles.statSection}>
			<h3 className={styles.statSectionTitle}>Image Statistics</h3>

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

			{pieData.length > 0 && (
				<div className={styles.statChartsRow}>
					<div className={styles.statChartWrap}>
						<p className={styles.statChartLabel}>Coverage Breakdown</p>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<defs>
									<pattern
										id="uncoveredPattern"
										patternUnits="userSpaceOnUse"
										width="8"
										height="8"
									>
										<rect width="8" height="8" fill="#9ca3af" />
										<path
											d="M0,8 L8,0 M-2,2 L2,-2 M6,10 L10,6"
											stroke="#6b7280"
											strokeWidth="1.5"
										/>
									</pattern>
								</defs>
								<Pie
									data={pieData}
									dataKey="pct"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={75}
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									label={(entry: any) =>
										(entry.pct as number) > 4
											? `${(entry.pct as number).toFixed(1)}%`
											: ""
									}
									labelLine={false}
								>
									{pieData.map((entry, i) => (
										<Cell
											key={i}
											fill={
												entry.name === "Uncovered"
													? "url(#uncoveredPattern)"
													: entry.color
											}
										/>
									))}
								</Pie>
								<Tooltip
									formatter={(value: unknown) =>
										typeof value === "number"
											? `${value.toFixed(2)}%`
											: String(value)
									}
								/>
								<Legend
									iconType="circle"
									iconSize={10}
									wrapperStyle={{
										fontSize: "11px",
										fontFamily: "Roboto",
									}}
								/>
							</PieChart>
						</ResponsiveContainer>
					</div>

					{barData.length > 0 && (
						<div className={styles.statChartWrap}>
							<p className={styles.statChartLabel}>Coverage by Category (%)</p>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={barData}
									margin={{
										top: 5,
										right: 10,
										left: 0,
										bottom: 45,
									}}
								>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="name"
										tick={{
											fontSize: 10,
											fontFamily: "Roboto",
										}}
										angle={-35}
										textAnchor="end"
										interval={0}
									/>
									<YAxis
										tick={{
											fontSize: 10,
											fontFamily: "Roboto",
										}}
										tickFormatter={(v: unknown) =>
											typeof v === "number" ? `${v}%` : String(v)
										}
										domain={[0, 100]}
									/>
									<Tooltip
										formatter={(v: unknown) =>
											typeof v === "number"
												? [`${v}%`, "Coverage"]
												: [String(v)]
										}
									/>
									<Bar dataKey="coverage" radius={[3, 3, 0, 0]}>
										{barData.map((entry, i) => (
											<Cell key={i} fill={entry.color} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					)}
				</div>
			)}

			{!data && <p className={styles.statEmptyHint}>No image selected.</p>}
		</div>
	);
}
