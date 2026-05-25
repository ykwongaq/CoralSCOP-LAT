import { useNavigate } from "react-router-dom";
import backgroundImage from "../assets/images/CoralSCOP_Homepage.jpg";
import titleImage from "../assets/images/home-title.svg";
import styles from "./EntryPage.module.css";
import { Button } from "../components/ui";

function EntryPage() {
	const navigate = useNavigate();

	return (
		<div className={styles.home}>
			<img className={styles.bg} src={backgroundImage} alt="" />
			<div className={styles.homeContent}>
				<div>
					<img className={styles.title} src={titleImage} alt="" />
					<p>Segment any coral in the images.</p>
					<div className={styles.buttonRow}>
						<Button onClick={() => navigate("/project-creation")}>
							Create New Project
						</Button>
						<Button isBorder onClick={() => navigate("/project-annotation")}>
							Load Existing Project
						</Button>
						<Button isBorder onClick={() => navigate("/project-quick-start")}>
							Quick Start
						</Button>
						{/* <button
							id="create-project-button"
							className="button"
							onClick={() => navigate("/project-creation")}
						>
							Create New Project
						</button>
						<button
							className="button button--border"
							id="load-project-button"
							onClick={() => navigate("/project-annotation")}
						>
							Load Existing Project
						</button>
						<button
							className="button button--border"
							id="quick-start-button"
							onClick={() => navigate("/project-quick-start")}
						>
							Quick Start
						</button> */}
					</div>
				</div>
			</div>
		</div>
	);
}

export default EntryPage;
