import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import layoutStyles from "./PageLayout.module.css";
import { SideBarButton, Header } from "../components/ui";
import { ProjectCreationProvider } from "../store";
import { SideBar } from "../components/layout/";
import {
	UploadImagePanel,
	UploadImagePanelID,
	ProjectSettingPanel,
	ProjectSettingPanelID,
} from "../components/panel";

function ProjectCreationPage() {
	const navigate = useNavigate();
	const [activePanel, setActivePanel] = useState<string>(UploadImagePanelID);

	const handleBackToHome = useCallback(() => {
		navigate("/");
	}, [navigate]);

	const handlePanelChange = useCallback((panelId: string) => {
		setActivePanel(panelId);
	}, []);

	return (
		<ProjectCreationProvider>
			<div className={layoutStyles.wrapper}>
				<Header />
				<div className={layoutStyles.main}>
					<SideBar>
						<SideBarButton
							id="back-to-main-page-button"
							icon="ico-home"
							label="Home"
							onClick={handleBackToHome}
						/>
						<SideBarButton
							id={`${UploadImagePanelID}-button`}
							icon="ico-grid"
							label="Upload Images"
							onClick={() => handlePanelChange(UploadImagePanelID)}
							isActive={activePanel === UploadImagePanelID}
						/>
						<SideBarButton
							id={`${ProjectSettingPanelID}-button`}
							icon="ico-gear"
							label="Project Settings"
							onClick={() => handlePanelChange(ProjectSettingPanelID)}
							isActive={activePanel === ProjectSettingPanelID}
						/>
					</SideBar>
					{activePanel === UploadImagePanelID && (
						<div
							className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
							id="galleryPage"
						>
							<UploadImagePanel />
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
				</div>
			</div>
		</ProjectCreationProvider>
	);
}

export default ProjectCreationPage;
