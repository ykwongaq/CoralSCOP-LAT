import LogoImage from "../../assets/images/logo.png";
import styles from "./LogoBlock.module.css";

export default function LogoBlock() {
	return (
		<div className={styles["logo-blk"]}>
			<img className={styles["logo-blk__img"]} src={LogoImage} alt="Logo" />
			<span className={styles["logo-blk__text"]}>CoralSCOP-LAT</span>
		</div>
	);
}
