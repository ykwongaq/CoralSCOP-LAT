import { useState } from "react";
import layoutStyles from "../PanelLayout.module.css";
import styles from "./CreationWizard.module.css";
import LoadingSVG from "../../../assets/images/loading.svg";
import { Button } from "../../ui";
import { BottomBar } from "../../layout";
import type { CreateProjectJob } from "./useCreateProjectJob";

interface CreateProjectStepProps {
	job: CreateProjectJob;
	imageCount: number;
	runCoralSCOP: boolean;
	useClahe: boolean;
	/** Return to the previous step (discards any created project). */
	onBack: () => void;
	/** Run project creation again with the current settings. */
	onRetry: () => void;
	onHome: () => void;
	onStartOver: () => void;
}

function defaultProjectName() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `coral_project_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Wizard step 3: create the project on the server, then download it. */
export default function CreateProjectStep({
	job,
	imageCount,
	runCoralSCOP,
	useClahe,
	onBack,
	onRetry,
	onHome,
	onStartOver,
}: CreateProjectStepProps) {
	const [projectName, setProjectName] = useState(defaultProjectName);
	const trimmedName = projectName.trim().replace(/\.coral$/i, "");
	const imagesLabel = `${imageCount} image${imageCount !== 1 ? "s" : ""}`;

	const summary = (
		<div className={styles.summary}>
			<span className={styles.summaryChip}>{imagesLabel}</span>
			{useClahe && (
				<span className={styles.summaryChip}>CLAHE enhanced</span>
			)}
			<span className={styles.summaryChip}>
				{runCoralSCOP ? "CoralSCOP masks generated" : "No pre-generated masks"}
			</span>
		</div>
	);

	let content: React.ReactNode = null;
	let actions: React.ReactNode = null;

	switch (job.status) {
		case "idle":
		case "running": {
			const pct = job.progress;
			content = (
				<div className={styles.statusPanel}>
					<img className={styles.statusSpinner} src={LoadingSVG} alt="" />
					<p className={styles.statusTitle}>Creating your project…</p>
					<p className={styles.statusDesc}>
						{`Uploading ${imagesLabel}`}
						{useClahe ? ", enhancing them with CLAHE" : ""}
						{runCoralSCOP
							? " and running CoralSCOP to generate masks. This can take a few minutes."
							: " and packaging the project."}
						<br />
						Please keep this page open.
					</p>
					<div
						className={styles.progressTrack}
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={pct ?? undefined}
					>
						<div
							className={`${styles.progressFill}${pct === null ? ` ${styles.progressIndeterminate}` : ""}`}
							style={pct === null ? undefined : { width: `${pct}%` }}
						/>
					</div>
					<p className={styles.progressLabel}>
						{pct === null ? "Uploading images…" : `${pct}%`}
					</p>
				</div>
			);
			actions = (
				<Button className={styles.wizardButton} onClick={onBack} isBorder>
					Cancel
				</Button>
			);
			break;
		}

		case "error":
			content = (
				<div className={styles.statusPanel}>
					<div className={`${styles.statusIcon} ${styles.statusIconError}`}>!</div>
					<p className={styles.statusTitle}>Failed to create the project</p>
					<p className={styles.statusDesc}>
						An error occurred while communicating with the server.
					</p>
					{job.error && <p className={styles.errorText}>{job.error}</p>}
				</div>
			);
			actions = (
				<>
					<Button className={styles.wizardButton} onClick={onBack} isBorder>
						Back
					</Button>
					<Button className={styles.wizardButton} onClick={onRetry}>Try Again</Button>
				</>
			);
			break;

		case "ready":
		case "downloading":
			content = (
				<div className={styles.statusPanel}>
					<div className={`${styles.statusIcon} ${styles.statusIconSuccess}`}>✓</div>
					<p className={styles.statusTitle}>Your project is ready</p>
					{summary}
					<form
						className={styles.nameField}
						onSubmit={(e) => {
							e.preventDefault();
							if (trimmedName && job.status === "ready") job.download(trimmedName);
						}}
					>
						<label className={styles.nameLabel} htmlFor="project-name-input">
							Project name
						</label>
						<div className={styles.nameInputRow}>
							<input
								id="project-name-input"
								className={styles.nameInput}
								value={projectName}
								onChange={(e) => setProjectName(e.target.value)}
								placeholder="Enter project name"
								autoFocus
							/>
							<span className={styles.nameSuffix}>.coral</span>
						</div>
					</form>
					{job.error && (
						<p className={styles.errorText}>Download failed: {job.error}</p>
					)}
				</div>
			);
			actions = (
				<>
					<Button className={styles.wizardButton} onClick={onBack} isBorder disabled={job.status === "downloading"}>
						Back
					</Button>
					<Button
						className={styles.wizardButton}
						onClick={() => job.download(trimmedName)}
						disabled={!trimmedName || job.status === "downloading"}
					>
						{job.status === "downloading" ? "Downloading…" : "Download Project"}
					</Button>
				</>
			);
			break;

		case "downloaded":
			content = (
				<div className={styles.statusPanel}>
					<div className={`${styles.statusIcon} ${styles.statusIconSuccess}`}>✓</div>
					<p className={styles.statusTitle}>Project downloaded</p>
					<p className={styles.statusDesc}>
						<strong>{trimmedName}.coral</strong> has been saved. To start
						annotating, go to the home page and choose{" "}
						<strong>Load Existing Project</strong>.
					</p>
					{summary}
				</div>
			);
			actions = (
				<>
					<Button className={styles.wizardButton} onClick={onStartOver} isBorder>
						Create Another
					</Button>
					<Button className={styles.wizardButton} onClick={onHome}>Back to Home</Button>
				</>
			);
			break;
	}

	return (
		<>
			<div className={layoutStyles.mainSectionContent}>{content}</div>
			<BottomBar className={layoutStyles.mainSectionBottom}>{actions}</BottomBar>
		</>
	);
}
