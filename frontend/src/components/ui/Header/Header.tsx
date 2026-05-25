import LogoBlock from "../../ui/LogoBlock";
import styles from "./Header.module.css";

export default function Header() {
	return (
		<header className={styles.header}>
			<LogoBlock />
		</header>
	);
}
