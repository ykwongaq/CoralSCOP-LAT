import { useCallback } from "react";
import layoutStyles from "../PanelLayout.module.css";
import styles from "./CreationWizard.module.css";

import { useProjectCreation } from "../../../store";
import { ImageUploader, usePopMessage, ImageGallery, Button } from "../../ui";
import type { ImageData } from "../../../types";
import { BottomBar } from "../../layout";

export const UploadImagePanelID = "upload-image-panel";

export const MAX_IMAGES = 50;

interface UploadImagePanelProps {
	onNext: () => void;
}

/** Wizard step 1: add images and pick which ones go into the project. */
export default function UploadImagePanel({ onNext }: UploadImagePanelProps) {
	const { projectCreationState, projectCreationDispatch } =
		useProjectCreation();
	const { showMessage, closeMessage } = usePopMessage();

	const imageCount = projectCreationState.imageDataList.length;
	const selectedCount = projectCreationState.selectedIndices.length;

	const handleImages = useCallback(
		(images: ImageData[]) => {
			const totalCount = imageCount + images.length;

			if (imageCount >= MAX_IMAGES) {
				showMessage({
					title: "Image Limit Reached",
					content: `You can only upload up to ${MAX_IMAGES} images per project.`,
					buttons: [{ label: "Close", onClick: closeMessage }],
				});
				return;
			}

			if (totalCount > MAX_IMAGES) {
				const allowedCount = MAX_IMAGES - imageCount;
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
		[projectCreationDispatch, imageCount, showMessage, closeMessage],
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

	return (
		<>
			<div className={layoutStyles.mainSectionContent}>
				<p className={styles.stepTitle}>
					Upload Images ({imageCount}/{MAX_IMAGES})
				</p>
				<p className={styles.stepDesc}>
					Add the images you want to annotate. Click an image to include or
					exclude it from the project.
				</p>
				<ImageUploader onImages={handleImages} />
				<ImageGallery
					imageDataList={projectCreationState.imageDataList}
					selectedIndices={projectCreationState.selectedIndices}
					onToggleSelection={handleToggleSelection}
				/>
			</div>

			<BottomBar className={layoutStyles.mainSectionBottom}>
				{imageCount > 0 && (
					<>
						<span className={styles.bottomBarInfo}>
							{selectedCount} of {imageCount} selected
						</span>
						<span className={styles.bottomBarSpacer} />
						<Button className={styles.wizardButton} onClick={handleDeselectAll} isBorder>
							Deselect All
						</Button>
						<Button className={styles.wizardButton} onClick={handleSelectAll} isBorder>
							Select All
						</Button>
					</>
				)}
				<Button className={styles.wizardButton} onClick={onNext} disabled={selectedCount === 0}>
					Next
				</Button>
			</BottomBar>
		</>
	);
}
