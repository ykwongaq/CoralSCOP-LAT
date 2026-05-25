import { useCallback, useRef, useState } from "react";
import styles from "./UploadProjectPlane.module.css";
import layoutStyles from "../PanelLayout.module.css";

import { useProject } from "../../../store";
import { usePopMessage } from "../../ui/Messager";
import { loadProject } from "../../../services/LoadProjectService";
import Button from "../../ui/Button";
import { BottomBar } from "../../layout";

export const UploadProjectPanelID = "project-upload-panel";

export default function UploadProjectPanel() {
	const { projectDispatch } = useProject();
	const { showLoading, showError, updateLoadingProgress, closeMessage } =
		usePopMessage();
	const [isDragging, setIsDragging] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const isCoralFile = (file: File) => file.name.endsWith(".coral");

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files[0];
		if (file && isCoralFile(file)) {
			setSelectedFile(file);
		}
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file && isCoralFile(file)) {
				setSelectedFile(file);
			}
		},
		[],
	);

	const openFileSelect = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleOpenProject = useCallback(() => {
		if (!selectedFile) return;
		void loadProject(selectedFile, {
			onLoading: () => {
				showLoading({
					title: "Opening Project",
					content: "Unpacking project file…",
					progress: null,
				});
			},
			onProgress: (pct) => {
				updateLoadingProgress(pct);
			},
			onError: (err) => {
				showError({
					title: "Failed to Open Project",
					content: "An error occurred while reading the project file.",
					errorMessage: err.message,
					buttons: [{ label: "Close", onClick: closeMessage }],
				});
			},
			onComplete: (state) => {
				closeMessage();
				projectDispatch({ type: "LOAD_PROJECT", payload: state });
			},
		});
	}, [
		selectedFile,
		showLoading,
		updateLoadingProgress,
		showError,
		closeMessage,
		projectDispatch,
	]);

	return (
		<div className={layoutStyles.mainSectionInner}>
			<p className={layoutStyles.mainSectionTitle}>Open Project</p>
			<div className={layoutStyles.mainSectionContent}>
				<div
					className={`${styles.dropContainer} ${styles.dropContainerLarge}${isDragging ? ` ${styles.dropContainerActive}` : ""}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<div className={styles.dropText}>
						{selectedFile ? (
							<span>{selectedFile.name}</span>
						) : (
							<>
								Drop .coral project file here. Or{" "}
								<Button
									label="browse"
									onClick={openFileSelect}
									className={styles.selectLink}
								/>
								to select a file.
							</>
						)}
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept=".coral"
						style={{ display: "none" }}
						onChange={handleFileInputChange}
					/>
				</div>
			</div>

			<BottomBar className={layoutStyles.mainSectionBottom}>
				<Button onClick={handleOpenProject} disabled={!selectedFile}>
					Open Project
				</Button>
			</BottomBar>
		</div>
	);
}
