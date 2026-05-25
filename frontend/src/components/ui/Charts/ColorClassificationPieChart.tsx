import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { ColorClassificationResult } from "../../../services";
import styles from "./ColorClassificationPieChart.module.css";

interface Props {
	data: Array<ColorClassificationResult & { hex: string }>;
	hoveredClass: string | null;
	onHover: (label: string) => void;
	onLeave: () => void;
}

export default function ColorClassificationPieChart({
	data,
	hoveredClass,
	onHover,
	onLeave,
}: Props) {
	return (
		<div className={styles.chartWrap}>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						data={data}
						dataKey="pct"
						nameKey="label"
						cx="50%"
						cy="50%"
						outerRadius={60}
						innerRadius={30}
						paddingAngle={1}
						label={false}
						onMouseEnter={(_, index) => onHover(data[index].label)}
						onMouseLeave={onLeave}
					>
						{data.map((entry) => (
							<Cell
								key={entry.label}
								fill={entry.hex}
								stroke="#ffffff"
								strokeWidth={1.5}
								opacity={
									hoveredClass === null || hoveredClass === entry.label
										? 1
										: 0.4
								}
							/>
						))}
					</Pie>
					<Tooltip
						formatter={(value: any, name: any) => [
							typeof value === "number"
								? `${value.toFixed(1)}%`
								: String(value),
							name,
						]}
						contentStyle={{
							fontSize: 12,
							fontFamily: "Roboto",
							borderRadius: 6,
							border: "1px solid var(--line-line-primary1)",
							boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
						}}
					/>
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
}
