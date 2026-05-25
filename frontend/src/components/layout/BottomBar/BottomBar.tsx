import styles from "./BottomBar.module.css";

interface BottomBarProps {
	children: React.ReactNode;
	className?: string;
}

export default function BottomBar({ children, className }: BottomBarProps) {
	return (
		<div className={`${styles.bottomBar}${className ? ` ${className}` : ""}`}>
			{children}
		</div>
	);
}
