import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import layoutStyles from "./PageLayout.module.css";

import { HeaderWithNavigation } from "../components/ui/Header";
import {
	ProjectProvider,
	AnnotationSessionProvider,
	VisualizationSettingProvider,
	ProjectCreationProvider,
	useProject,
	useAnnotationSession,
	useVisualizationSetting,
	useProjectCreation,
} from "../store";
import type { ProjectState } from "../types";
import { useAnnotationCommands, AnnotationCommandsProvider } from "../hooks";
import {
	SideBarButton,
	SideBarDropDownButton,
	SideBarDropDownList,
	usePopMessage,
} from "../components/ui";
import {
	releaseSession,
	releaseSessionOnUnload,
	saveProject,
	exportAllImages,
	exportAllAnnotatedImages,
	exportAllCocoAnnotations,
	runModel,
} from "../services";

import {
	SCALE_DEFINE_PANEL_ID,
	ScaleDefinePanel,
	ImageGalleryPanelID,
	StatisticPanelID,
	AnnotationPanelID,
	ProjectSettingPanel,
	ProjectSettingPanelID,
	QuickStartUploadImagePanel,
	ImageGalleryPanel,
	StatisticPanel,
	AnnotationPanel,
} from "../components/panel";

import ActionButton from "../components/ui/FloatBar/FloatBarButton";
import { SideBar } from "../components/layout";

function isProjectLoaded(state: ProjectState): boolean {
	return state.dataList.length > 0;
}

function ProjectQuickStartPageContent() {
	const navigate = useNavigate();
	const { projectState, projectDispatch } = useProject();
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const { visualizationSettingState } = useVisualizationSetting();
	const { projectCreationState } = useProjectCreation();
	const { execute } = useAnnotationCommands();

	const {
		showMessage,
		closeMessage,
		showLoading,
		showError,
		showProjectNameInput,
	} = usePopMessage();

	const [activePanel, setActivePanel] = useState<string>(AnnotationPanelID);
	const projectLoaded = isProjectLoaded(projectState);

	// Keep a ref so beforeunload always sees the latest sessionId without a stale closure.
	const sessionIdRef = useRef<string | undefined>(projectState.sessionId);
	useEffect(() => {
		sessionIdRef.current = projectState.sessionId;
	}, [projectState.sessionId]);

	// Warn the user before closing/refreshing the tab when a project is loaded.
	useEffect(() => {
		if (!projectLoaded) return;
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Required for Chrome/Safari to show the leave-page dialog.
			// @ts-ignore — returnValue is deprecated in typings but still needed cross-browser
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [projectLoaded]);

	// Release the SAM session when the page is actually unloaded (tab close /
	// refresh confirmed).  `pagehide` fires only after the user confirms leaving,
	// unlike `beforeunload` which fires before the dialog is shown.
	useEffect(() => {
		const handlePageHide = () => {
			const sid = sessionIdRef.current;
			if (sid) releaseSessionOnUnload(sid);
		};
		window.addEventListener("pagehide", handlePageHide);
		return () => {
			window.removeEventListener("pagehide", handlePageHide);
			const sid = sessionIdRef.current;
			if (sid) releaseSession(sid);
		};
	}, []);

	const handleBackToHome = useCallback(() => {
		if (projectLoaded) {
			showMessage({
				title: "Leave without saving?",
				content:
					"Your changes will be lost if you leave without saving. Are you sure you want to go back to the home page?",
				buttons: [
					{
						label: "Cancel",
						onClick: () => closeMessage(),
					},
					{
						label: "Leave",
						onClick: () => {
							closeMessage();
							navigate("/");
						},
					},
				],
			});
			return;
		} else {
			navigate("/");
		}
	}, [navigate, projectLoaded, showMessage, closeMessage]);

	const handlePanelChange = useCallback(
		(panelId: string) => {
			annotationSessionDispatch({ type: "CLEAR_PENDING_MASK" });
			annotationSessionDispatch({ type: "CLEAR_POINT_PROMPTS" });
			annotationSessionDispatch({ type: "CLEAR_SELECTION" });
			setActivePanel(panelId);
		},
		[annotationSessionDispatch],
	);

	const handleRunModel = useCallback(async () => {
		const currentData =
			projectState.dataList[annotationSessionState.currentDataIndex];
		if (!currentData) return;

		const { imageData } = currentData;

		let imageBlob: Blob;
		try {
			const fetchResponse = await fetch(imageData.imageUrl);
			imageBlob = await fetchResponse.blob();
		} catch (error) {
			console.error("Failed to fetch image blob:", error);
			return;
		}

		const config = {
			model: projectCreationState.model_selection,
			min_area: projectCreationState.config.min_area,
			min_confidence: projectCreationState.config.min_confidence,
			max_overlap: projectCreationState.config.max_overlap,
		};

		if (!config.model) {
			showMessage({
				title: "Model Not Selected",
				content:
					"Please select a model in the project settings before running inference.",
				buttons: [{ label: "Dismiss", onClick: closeMessage }],
			});
			return;
		}

		runModel(
			{ image: imageBlob, imageName: imageData.imageName, config },
			{
				onLoading: () =>
					showLoading({
						title: "Running Model",
						content: "Running model inference on the current image...",
						progress: null,
					}),
				onError: (error) => {
					showError({
						title: "Model Error",
						content: "Failed to run model inference.",
						errorMessage: error.message,
						buttons: [{ label: "Dismiss", onClick: closeMessage }],
					});
				},
				onComplete: (data) => {
					closeMessage();
					projectDispatch({
						type: "ADD_MODEL_OUTPUT",
						payload: {
							dataId: currentData.id,
							annotations: data.annotations,
							categories: data.categories,
						},
					});
				},
			},
		);
	}, [
		projectState,
		annotationSessionState.currentDataIndex,
		projectCreationState,
		showMessage,
		showLoading,
		showError,
		closeMessage,
		projectDispatch,
	]);

	function handleStatisticsExport() {
		throw new Error("Function not implemented.");
	}

	const handleSaveProject = useCallback(() => {
		showProjectNameInput({
			title: "Save Project",
			content: "Please enter a name for your project.",
			defaultValue: projectState.projectName,
			placeholder: "Enter project name",
			confirmLabel: "Save",
			onCancel: () => closeMessage(),
			onConfirm: async (projectName) => {
				closeMessage();
				projectDispatch({ type: "SET_PROJECT_NAME", payload: projectName });
				showLoading({
					title: "Saving Project",
					content: "Please wait while we prepare your project file...",
					progress: null,
					buttons: [
						{
							label: "Cancel",
							onClick: closeMessage,
						},
					],
				});
				try {
					await saveProject({ ...projectState, projectName });
					closeMessage();
				} catch (error) {
					showError({
						title: "Save Failed",
						content: "Failed to save project. Please try again.",
						errorMessage:
							error instanceof Error ? error.message : String(error),
						buttons: [
							{
								label: "Close",
								onClick: closeMessage,
							},
						],
					});
				}
			},
		});
	}, [
		closeMessage,
		projectDispatch,
		showError,
		showLoading,
		showProjectNameInput,
		projectState,
	]);

	const headerTitle = `${annotationSessionState.currentDataIndex + 1}. ${projectState.dataList[annotationSessionState.currentDataIndex]?.imageData.imageName || ""}`;

	return (
		<div className={layoutStyles.wrapper}>
			<HeaderWithNavigation
				showNavigation={projectLoaded}
				title={headerTitle}
				prevImage={() => execute["prev-image"]()}
				nextImage={() => execute["next-image"]()}
				onClick={() => handlePanelChange(ImageGalleryPanelID)}
			/>
			<div className={layoutStyles.main}>
				<SideBar>
					<SideBarButton
						id="back-to-main-page-button"
						icon="ico-home"
						label="Home"
						onClick={handleBackToHome}
					/>
					<SideBarButton
						id="annotation-button"
						icon="ico-stack"
						label="Annotations"
						onClick={() => handlePanelChange(AnnotationPanelID)}
						isActive={projectLoaded && activePanel === AnnotationPanelID}
						disabled={!projectLoaded}
					/>
					<SideBarButton
						id="statistic-button"
						icon="ico-wave"
						label="Statistics"
						onClick={() => handlePanelChange(StatisticPanelID)}
						isActive={projectLoaded && activePanel === StatisticPanelID}
						disabled={!projectLoaded}
					/>
					<SideBarButton
						id="setting-button"
						icon="ico-gear"
						label="Settings"
						onClick={() => handlePanelChange(ProjectSettingPanelID)}
						isActive={activePanel === ProjectSettingPanelID}
					/>
					<SideBarButton
						id="scale-define-button"
						icon="ico-wrench"
						label="Scale"
						onClick={() => handlePanelChange(SCALE_DEFINE_PANEL_ID)}
						isActive={projectLoaded && activePanel === SCALE_DEFINE_PANEL_ID}
						disabled={!projectLoaded}
					/>
					<SideBarButton
						id="save-button"
						icon="ico-save"
						label="Save"
						onClick={handleSaveProject}
						disabled={!projectLoaded}
					/>
					<SideBarDropDownList id="file-button" label="Export" icon="ico-exit">
						<SideBarDropDownButton
							id="export-image-button"
							label="Export All Images"
							onClick={async () => {
								showLoading({
									title: "Exporting Images",
									content: "Please wait while we prepare your images...",
									progress: null,
									buttons: [{ label: "Cancel", onClick: closeMessage }],
								});
								try {
									await exportAllImages(projectState);
								} catch (error) {
									showError({
										title: "Export Failed",
										content: "Failed to export images. Please try again.",
										errorMessage:
											error instanceof Error ? error.message : String(error),
										buttons: [{ label: "Close", onClick: closeMessage }],
									});
									return;
								}
								closeMessage();
							}}
						/>
						<SideBarDropDownButton
							id="export-annotated-images-button"
							label="Export Annotated Images"
							onClick={async () => {
								showLoading({
									title: "Exporting Annotated Images",
									content: "Please wait while we prepare your images...",
									progress: null,
									buttons: [{ label: "Cancel", onClick: closeMessage }],
								});
								try {
									await exportAllAnnotatedImages(
										projectState,
										visualizationSettingState,
									);
								} catch (error) {
									showError({
										title: "Export Failed",
										content:
											"Failed to export annotated images. Please try again.",
										errorMessage:
											error instanceof Error ? error.message : String(error),
										buttons: [{ label: "Close", onClick: closeMessage }],
									});
									return;
								}
								closeMessage();
							}}
						/>
						<SideBarDropDownButton
							id="export-coco-button"
							label="Export COCO"
							onClick={async () => {
								showLoading({
									title: "Exporting COCO Annotations",
									content: "Please wait while we prepare your annotations...",
									progress: null,
									buttons: [{ label: "Cancel", onClick: closeMessage }],
								});
								try {
									await exportAllCocoAnnotations(projectState);
								} catch (error) {
									showError({
										title: "Export Failed",
										content:
											"Failed to export COCO annotations. Please try again.",
										errorMessage:
											error instanceof Error ? error.message : String(error),
										buttons: [{ label: "Close", onClick: closeMessage }],
									});
									return;
								}
								closeMessage();
							}}
						/>
						<SideBarDropDownButton
							id="export-csv-button"
							label="Export CSV"
							onClick={() => {
								void handleStatisticsExport();
							}}
						/>
					</SideBarDropDownList>
				</SideBar>

				{!projectLoaded && activePanel !== ProjectSettingPanelID && (
					<div
						className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
						id="quickStartPage"
					>
						<QuickStartUploadImagePanel />
					</div>
				)}
				{activePanel === ProjectSettingPanelID && (
					<div
						className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
						id="settingPage"
					>
						<ProjectSettingPanel />
					</div>
				)}
				{projectLoaded && activePanel === ImageGalleryPanelID && (
					<div
						className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
						id="galleryPage"
					>
						<ImageGalleryPanel
							onImageClick={() => handlePanelChange(AnnotationPanelID)}
						/>
					</div>
				)}
				{projectLoaded && activePanel === SCALE_DEFINE_PANEL_ID && (
					<div
						className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
						id="scaleDefinePage"
					>
						<ScaleDefinePanel />
					</div>
				)}
				{projectLoaded && activePanel === AnnotationPanelID && (
					<div
						className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
						id="annotationPage"
					>
						<AnnotationPanel
							selectModeChildren={
								<ActionButton
									name="Run Model"
									icon=""
									onClick={handleRunModel}
								/>
							}
						/>
					</div>
				)}
				{projectLoaded && activePanel === StatisticPanelID && (
					<div
						className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
						id="statisticPage"
					>
						<StatisticPanel />
					</div>
				)}
			</div>
		</div>
	);
}

function ProjectQuickStartPage() {
	return (
		<ProjectCreationProvider>
			<ProjectProvider>
				<AnnotationSessionProvider>
					<VisualizationSettingProvider>
						<AnnotationCommandsProvider>
							<ProjectQuickStartPageContent />
						</AnnotationCommandsProvider>
					</VisualizationSettingProvider>
				</AnnotationSessionProvider>
			</ProjectProvider>
		</ProjectCreationProvider>
	);
}

export default ProjectQuickStartPage;
