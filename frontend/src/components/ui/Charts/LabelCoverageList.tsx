import styles from "./LabelCoverageList.module.css";

export interface LabelCoverageItem {
    name: string;
    color: string;
    pct: number;
    pixels: number;
    annotationCount: number;
    avgPixels: number;
}

interface Props {
    items: LabelCoverageItem[];
}

/**
 * Compact per-label statistics list.
 *
 * Each row shows a colour dot, label name, a mini progress bar with
 * coverage percentage, annotation count, and average annotation size
 * in pixels — more information than a simple bar chart.
 */
export default function LabelCoverageList({ items }: Props) {
    if (items.length === 0) {
        return (
            <div className={styles.empty}>
                No annotated regions found.
            </div>
        );
    }

    // Determine the widest percentage so progress bars share a common scale
    const maxPct = Math.max(...items.map((i) => i.pct), 1);

    return (
        <div className={styles.list}>
            {items.map((item) => (
                <div key={item.name} className={styles.row}>
                    {/* Label identity */}
                    <div className={styles.labelCell}>
                        <span
                            className={styles.colorDot}
                            style={{ backgroundColor: item.color }}
                        />
                        <span className={styles.labelName} title={item.name}>
                            {item.name}
                        </span>
                    </div>

                    {/* Coverage progress bar */}
                    <div className={styles.coverageCell}>
                        <div className={styles.progressTrack}>
                            <div
                                className={styles.progressFill}
                                style={{
                                    width: `${(item.pct / maxPct) * 100}%`,
                                    backgroundColor: item.color,
                                }}
                            />
                        </div>
                        <span className={styles.pctValue}>
                            {item.pct.toFixed(1)}%
                        </span>
                    </div>

                    {/* Annotation count & avg size */}
                    <div className={styles.statsCell}>
                        <span className={styles.count}>
                            {item.annotationCount}{" "}
                            {item.annotationCount === 1 ? "annotation" : "annotations"}
                        </span>
                        <span className={styles.avgSize}>
                            avg {item.avgPixels.toLocaleString()} px
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
