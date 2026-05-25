import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import layoutStyles from "./PageLayout.module.css";

import { HeaderWithNavigation } from "../components/ui/Header";
import {
	ProjectProvider,
	AnnotationSessionProvider,
	VisualizationSettingProvider,
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
	exportProjectStatisticsSpreadsheet,
	exportLabels,
} from "../services";

import {
	useProject,
	useAnnotationSession,
	useVisualizationSetting,
} from "../store";
import {
	SCALE_DEFINE_PANEL_ID,
	ScaleDefinePanel,
	ImageGalleryPanelID,
	StatisticPanelID,
	AnnotationPanelID,
	UploadProjectPanel,
	AnnotationPanel,
	ImageGalleryPanel,
	StatisticPanel,
} from "../components/panel";

import { SideBar } from "../components/layout";

function isProjectLoaded(state: ProjectState): boolean {
	return state.dataList.length > 0;
}

function ProjectAnnotationContent() {
	const { execute } = useAnnotationCommands();
	const navigate = useNavigate();
	const { projectState, projectDispatch } = useProject();
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const { visualizationSettingState } = useVisualizationSetting();

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
			annotationSessionDispatch({ type: "CLEAR_SELECTION" });
			annotationSessionDispatch({ type: "CLEAR_POINT_PROMPTS" });
			setActivePanel(panelId);
		},
		[annotationSessionDispatch],
	);

	const handleStatisticsExport = useCallback(async () => {
		closeMessage();
		showLoading({
			title: "Exporting CSV",
			content: "Please wait while we prepare your statistics file...",
			progress: null,
			buttons: [
				{
					label: "Cancel",
					onClick: closeMessage,
				},
			],
		});
		try {
			await exportProjectStatisticsSpreadsheet(projectState, "csv");
			closeMessage();
		} catch (error) {
			showError({
				title: "Export Failed",
				content: "Failed to export statistics. Please try again.",
				errorMessage: error instanceof Error ? error.message : String(error),
				buttons: [
					{
						label: "Close",
						onClick: closeMessage,
					},
				],
			});
		}
	}, [closeMessage, showError, showLoading, projectState]);

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

	// We show the navigation only after the project has been loaded and it is not in image gallery panel
	const showNavigation = projectLoaded && activePanel !== ImageGalleryPanelID;
	const headerTitle = `${annotationSessionState.currentDataIndex + 1}. ${projectState.dataList[annotationSessionState.currentDataIndex]?.imageData.imageName || ""}`;

	return (
		<div className={layoutStyles.wrapper}>
			<HeaderWithNavigation
				title={headerTitle}
				showNavigation={showNavigation}
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
						id="gallery-button"
						icon="ico-grid"
						label="All Images"
						onClick={() => handlePanelChange(ImageGalleryPanelID)}
						isActive={projectLoaded && activePanel === ImageGalleryPanelID}
						disabled={!projectLoaded}
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
									buttons: [
										{
											label: "Cancel",
											onClick: closeMessage,
										},
									],
								});
								try {
									await exportAllImages(projectState);
								} catch (error) {
									showError({
										title: "Export Failed",
										content: "Failed to export images. Please try again.",
										errorMessage:
											error instanceof Error ? error.message : String(error),
										buttons: [
											{
												label: "Close",
												onClick: closeMessage,
											},
										],
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
									buttons: [
										{
											label: "Cancel",
											onClick: closeMessage,
										},
									],
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
										buttons: [
											{
												label: "Close",
												onClick: closeMessage,
											},
										],
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
									buttons: [
										{
											label: "Cancel",
											onClick: closeMessage,
										},
									],
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
										buttons: [
											{
												label: "Close",
												onClick: closeMessage,
											},
										],
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
						<SideBarDropDownButton
							id="export-labels-button"
							label="Export Labels"
							onClick={async () => {
								showLoading({
									title: "Exporting Labels",
									content: "Please wait while we prepare your annotations...",
									progress: null,
									buttons: [
										{
											label: "Cancel",
											onClick: closeMessage,
										},
									],
								});
								try {
									await exportLabels(projectState);
								} catch (error) {
									showError({
										title: "Export Failed",
										content: "Failed to export labels. Please try again.",
										errorMessage:
											error instanceof Error ? error.message : String(error),
										buttons: [
											{
												label: "Close",
												onClick: closeMessage,
											},
										],
									});
									return;
								}
								closeMessage();
							}}
						/>
					</SideBarDropDownList>
				</SideBar>

				{!projectLoaded && (
					<div
						className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
						id="uploadProjectPage"
					>
						<UploadProjectPanel />
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
				{projectLoaded && activePanel === AnnotationPanelID && (
					<div
						className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
						id="annotationPage"
					>
						<AnnotationPanel />
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

function ProjectAnnotationPage() {
	return (
		<AnnotationSessionProvider>
			<VisualizationSettingProvider>
				<ProjectProvider>
					<AnnotationCommandsProvider>
						<ProjectAnnotationContent />
					</AnnotationCommandsProvider>
				</ProjectProvider>
			</VisualizationSettingProvider>
		</AnnotationSessionProvider>
	);
}

export default ProjectAnnotationPage;
