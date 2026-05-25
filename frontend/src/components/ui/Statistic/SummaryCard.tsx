import styles from "./SummaryCard.module.css";

interface SummaryCardProps {
    statistic: string;
    name: string;
}

export default function SummaryCard({ statistic, name }: SummaryCardProps) {
    return (
        <div className={styles.statSummaryCard}>
            <span className={styles.statSummaryCardValue}>{statistic}</span>
            <span className={styles.statSummaryCardLabel}>{name}</span>
        </div>
    );
}
