import styles from "./StatisticToolBar.module.css";

interface StatisticToolBarProps {
	children: React.ReactNode;
}

export default function StatisticToolBar({ children }: StatisticToolBarProps) {
	return <div className={styles.toolBar}>{children}</div>;
}
