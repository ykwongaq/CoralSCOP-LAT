import { useProject, useAnnotationSession } from "../../../store";
import { ImageBlock } from "../../ui/ImageGallery";
import layoutStyles from "../PanelLayout.module.css";
import galleryStyles from "../../ui/ImageGallery/ImageGallery.module.css";

export const ImageGalleryPanelID = "image-gallery-panel";

export default function ImageGalleryPanel({
	onImageClick,
}: {
	onImageClick?: () => void;
}) {
	const { projectState } = useProject();
	const { annotationSessionDispatch } = useAnnotationSession();

	// The image data list should be sorted by the data.id
	const imageDataList = projectState.dataList
		.sort((a, b) => a.id - b.id)
		.map((data) => data.imageData);

	return (
		<>
			<div className={layoutStyles.mainSectionInner}>
				<p className={layoutStyles.mainSectionTitle}>All Images</p>
				<div id="gallery-container" className={`${galleryStyles.galleryList} ${galleryStyles.galleryListFull}`}>
					{imageDataList.map((imageData, dataId) => (
						<ImageBlock
							key={dataId}
							displayId={dataId + 1}
							imageURl={imageData.imageUrl}
							imageName={imageData.imageName}
							onClick={() => {
								annotationSessionDispatch({
									type: "SET_CURRENT_DATA_INDEX",
									payload: dataId,
								});
								onImageClick?.();
							}}
						/>
					))}
				</div>
			</div>
			;
		</>
	);
}
