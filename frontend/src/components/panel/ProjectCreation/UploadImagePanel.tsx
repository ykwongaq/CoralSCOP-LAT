export const UploadImagePanelID = "upload-image-panel";
import { useCallback, useRef } from "react";
import layoutStyles from "../PanelLayout.module.css";

import { useProjectCreation } from "../../../store";
import { ImageUploader, usePopMessage, ImageGallery, Button } from "../../ui";
import type { ImageData } from "../../../types";
import { BottomBar } from "../../layout";
import type { ApiRequestHandle } from "../../../types/api";
import {
	createProject,
	deleteProject,
	downloadProject,
} from "../../../services";

import { useNavigate } from "react-router-dom";

const MAX_IMAGES = 50;

export default function UploadImagePanel() {
	const navigate = useNavigate();
	const { projectCreationState, projectCreationDispatch } =
		useProjectCreation();
	const {
		showMessage,
		showProjectNameInput,
		closeMessage,
		showError,
		showLoading,
		updateLoadingProgress,
	} = usePopMessage();

	const backToHome = useCallback(() => {
		navigate("/");
	}, [navigate]);

	// Holds the active request handle so we can cancel it from the modal button.
	const requestHandleRef = useRef<ApiRequestHandle | null>(null);

	const handleImages = useCallback(
		(images: ImageData[]) => {
			const currentCount = projectCreationState.imageDataList.length;
			const newCount = images.length;
			const totalCount = currentCount + newCount;

			if (currentCount >= MAX_IMAGES) {
				showMessage({
					title: "Image Limit Reached",
					content: `You can only upload up to ${MAX_IMAGES} images per project.`,
					buttons: [{ label: "Close", onClick: closeMessage }],
				});
				return;
			}

			if (totalCount > MAX_IMAGES) {
				const allowedCount = MAX_IMAGES - currentCount;
				showMessage({
					title: "Image Limit Exceeded",
					content: `You can only upload ${allowedCount} more image${allowedCount !== 1 ? "s" : ""}. The maximum limit is ${MAX_IMAGES} images per project.`,
					buttons: [{ label: "Close", onClick: closeMessage }],
				});

				projectCreationDispatch({
					type: "ADD_IMAGES",
					payload: images.slice(0, allowedCount),
				});
				return;
			}

			projectCreationDispatch({ type: "ADD_IMAGES", payload: images });
		},
		[
			projectCreationDispatch,
			projectCreationState.imageDataList.length,
			showMessage,
			closeMessage,
		],
	);

	const handleToggleSelection = useCallback(
		(index: number) => {
			projectCreationDispatch({
				type: "TOGGLE_IMAGE_SELECTION",
				payload: index,
			});
		},
		[projectCreationDispatch],
	);

	const handleSelectAll = useCallback(() => {
		projectCreationDispatch({ type: "SELECT_ALL_IMAGES", payload: null });
	}, [projectCreationDispatch]);

	const handleDeselectAll = useCallback(() => {
		projectCreationDispatch({ type: "DESELECT_ALL_IMAGES", payload: null });
	}, [projectCreationDispatch]);

	const handleCreateProject = useCallback(() => {
		const selectedImages = projectCreationState.imageDataList.filter(
			(_, i) => projectCreationState.selectedIndices.includes(i),
		);
		requestHandleRef.current = createProject(
			{
				images: selectedImages,
				config: projectCreationState.config,
				model: projectCreationState.model_selection,
			},
			{
				onLoading: () => {
					showLoading({
						title: "Creating Project",
						content: "Uploading images and processing…",
						progress: null,
						buttons: [
							{
								label: "Cancel",
								onClick: () => {
									requestHandleRef.current?.cancel();
									requestHandleRef.current = null;
									closeMessage();
								},
							},
						],
					});
				},
				onProgress: (pct) => {
					updateLoadingProgress(pct);
				},
				onError: (err) => {
					showError({
						title: "Failed to Create Project",
						content: "An error occurred while communicating with the server.",
						errorMessage: err.message,
						buttons: [{ label: "Close", onClick: closeMessage }],
					});
				},
				onComplete: (data) => {
					closeMessage();
					showProjectNameInput({
						title: "Project Created",
						content:
							"Your project has been created successfully. Please enter a name and click Download to get your project file.",
						defaultValue: data.downloadToken,
						placeholder: "Enter project name",
						confirmLabel: "Download",
						onCancel: () => {
							deleteProject(
								{ token: data.downloadToken },
								{
									onComplete: closeMessage,
									onError(error) {
										showError({
											title: "Failed to Delete Project",
											content:
												"An error occurred while communicating with the server.",
											errorMessage: error.message,
											buttons: [{ label: "Close", onClick: closeMessage }],
										});
									},
								},
							);
						},
						onConfirm: (projectName) => {
							downloadProject(
								{ token: data.downloadToken, filename: projectName },
								{
									onComplete: () => {
										closeMessage();
										backToHome();
									},
									onError: (error) => {
										showError({
											title: "Failed to Download Project",
											content:
												"An error occurred while communicating with the server.",
											errorMessage: error.message,
											buttons: [{ label: "Close", onClick: closeMessage }],
										});
									},
								},
							);
						},
					});
				},
			},
		);
	}, [
		projectCreationState.imageDataList,
		projectCreationState.selectedIndices,
		projectCreationState.config,
		projectCreationState.model_selection,
		showLoading,
		showError,
		showMessage,
		showProjectNameInput,
		closeMessage,
		updateLoadingProgress,
	]);

	return (
		<div className={layoutStyles.mainSectionInner}>
			<p className={layoutStyles.mainSectionTitle}>
				Upload Images ({projectCreationState.imageDataList.length}/{MAX_IMAGES})
			</p>
			<div className={layoutStyles.mainSectionContent}>
				<ImageUploader onImages={handleImages} />
				<ImageGallery
					imageDataList={projectCreationState.imageDataList}
					selectedIndices={projectCreationState.selectedIndices}
					onToggleSelection={handleToggleSelection}
				/>
			</div>

			{projectCreationState.imageDataList.length > 0 && (
				<BottomBar className={layoutStyles.mainSectionBottom}>
					<Button onClick={handleDeselectAll} isBorder>
						Deselect All
					</Button>
					<Button onClick={handleSelectAll} isBorder>
						Select All
					</Button>
					<Button
						onClick={handleCreateProject}
						disabled={projectCreationState.selectedIndices.length === 0}
					>
						Create Project
					</Button>
				</BottomBar>
			)}
		</div>
	);
}
