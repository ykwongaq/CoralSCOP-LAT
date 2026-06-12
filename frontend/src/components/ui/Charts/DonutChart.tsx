import { useState } from "react";
import styles from "./DonutChart.module.css";

export interface DonutSegment {
    name: string;
    pct: number;
    color: string;
}

interface Props {
    segments: DonutSegment[];
    totalPct: number;
    size?: number;
    outerRadius?: number;
    innerRadius?: number;
}

/**
 * Pure SVG donut chart — no recharts dependency.
 *
 * Renders each segment as a stroked <circle> with stroke-dasharray
 * rotated into position.  Hovering a segment dims the others and
 * updates the centre text to show that segmentʼs detail.
 */
export default function DonutChart({
    segments,
    totalPct,
    size = 180,
    outerRadius = 72,
    innerRadius = 42,
}: Props) {
    const [hoveredName, setHoveredName] = useState<string | null>(null);

    // Remove zero-pct segments (they render as invisible slivers)
    const visible = segments.filter((s) => s.pct > 0);
    if (visible.length === 0) {
        visible.push({ name: "Uncovered", pct: 100, color: "#9ca3af" });
    }

    const cx = size / 2;
    const cy = size / 2;
    const midRadius = (outerRadius + innerRadius) / 2;
    const strokeWidth = outerRadius - innerRadius;
    const circumference = 2 * Math.PI * midRadius;

    // Build segment render data with cumulative angles
    let cumulativeAngle = 0; // degrees, 0 = 12-oʼclock after -90° rotation
    const renderSegments = visible.map((seg) => {
        const sweepAngle = (seg.pct / 100) * 360;
        const arcLength = circumference * (seg.pct / 100);
        // tiny overlap prevents anti-aliasing hairline gaps
        const renderedLength = arcLength + 0.5;
        const startAngle = cumulativeAngle;
        cumulativeAngle += sweepAngle;
        return { ...seg, startAngle, renderedLength };
    });

    const hoveredSegment = hoveredName
        ? renderSegments.find((s) => s.name === hoveredName)
        : null;

    return (
        <div className={styles.container}>
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className={styles.svg}
                role="img"
                aria-label={`Donut chart: ${totalPct.toFixed(1)}% coverage`}
            >
                {/* Pattern for uncovered segment */}
                <defs>
                    <pattern
                        id="donutUncoveredPattern"
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

                {/* Segments — rotate group so 0° = 12-oʼclock */}
                <g transform={`rotate(-90, ${cx}, ${cy})`}>
                    {renderSegments.map((seg) => {
                        const isDimmed =
                            hoveredName !== null && hoveredName !== seg.name;
                        const fill =
                            seg.name === "Uncovered"
                                ? "url(#donutUncoveredPattern)"
                                : seg.color;

                        return (
                            <g
                                key={seg.name}
                                transform={`rotate(${seg.startAngle}, ${cx}, ${cy})`}
                                onMouseEnter={() => setHoveredName(seg.name)}
                                onMouseLeave={() => setHoveredName(null)}
                                className={styles.segmentGroup}
                            >
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={midRadius}
                                    fill="none"
                                    stroke={fill}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={`${seg.renderedLength} ${circumference}`}
                                    strokeLinecap="butt"
                                    className={
                                        isDimmed ? styles.segmentDimmed : styles.segment
                                    }
                                />
                                <title>{`${seg.name}: ${seg.pct.toFixed(1)}%`}</title>
                            </g>
                        );
                    })}
                </g>

                {/* Centre text — grouped so the two lines stay vertically balanced */}
                <g textAnchor="middle" transform={`translate(${cx}, ${cy})`}>
                    <text
                        y={-4}
                        className={styles.centerValue}
                    >
                        {hoveredSegment
                            ? `${hoveredSegment.pct.toFixed(1)}%`
                            : `${totalPct.toFixed(1)}%`}
                    </text>
                    <text
                        y={13}
                        className={styles.centerLabel}
                    >
                        {hoveredSegment ? hoveredSegment.name : "Coverage"}
                    </text>
                </g>
            </svg>
        </div>
    );
}
