import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import layoutStyles from "./PageLayout.module.css";
import panelStyles from "../components/panel/PanelLayout.module.css";
import { SideBarButton, Header } from "../components/ui";
import { ProjectCreationProvider, useProjectCreation } from "../store";
import { SideBar } from "../components/layout/";
import {
	UploadImagePanel,
	EnhancementStep,
	CoralSCOPStep,
	CreateProjectStep,
	StepIndicator,
	useCreateProjectJob,
} from "../components/panel";

const STEPS = ["Upload Images", "Enhancement", "CoralSCOP", "Create & Download"];

const Step = {
	Upload: 0,
	Enhancement: 1,
	CoralSCOP: 2,
	Create: 3,
} as const;
type Step = (typeof Step)[keyof typeof Step];

interface ProjectCreationWizardProps {
	onHome: () => void;
	onStartOver: () => void;
}

/**
 * Step-by-step project creation:
 *   1. upload and select images
 *   2. choose whether to enhance the images with CLAHE
 *   3. choose whether CoralSCOP pre-generates masks (on the enhanced images if CLAHE is on)
 *   4. create the project on the server and download the .coral file
 */
function ProjectCreationWizard({ onHome, onStartOver }: ProjectCreationWizardProps) {
	const { projectCreationState } = useProjectCreation();
	const [step, setStep] = useState<Step>(Step.Upload);
	const job = useCreateProjectJob();
	const { start: startJob, reset: resetJob } = job;

	const selectedImages = projectCreationState.imageDataList.filter((_, i) =>
		projectCreationState.selectedIndices.includes(i),
	);
	const runCoralSCOP = projectCreationState.model_selection !== null;

	const startCreation = useCallback(() => {
		startJob({
			images: selectedImages,
			config: projectCreationState.config,
			model: projectCreationState.model_selection,
		});
		setStep(Step.Create);
	}, [startJob, selectedImages, projectCreationState.config, projectCreationState.model_selection]);

	const backToCoralSCOP = useCallback(() => {
		resetJob();
		setStep(Step.CoralSCOP);
	}, [resetJob]);

	return (
		<div className={panelStyles.mainSectionInner}>
			<StepIndicator steps={STEPS} current={step} />

			{step === Step.Upload && (
				<UploadImagePanel onNext={() => setStep(Step.Enhancement)} />
			)}
			{step === Step.Enhancement && (
				<EnhancementStep
					onBack={() => setStep(Step.Upload)}
					onNext={() => setStep(Step.CoralSCOP)}
				/>
			)}
			{step === Step.CoralSCOP && (
				<CoralSCOPStep
					onBack={() => setStep(Step.Enhancement)}
					onNext={startCreation}
				/>
			)}
			{step === Step.Create && (
				<CreateProjectStep
					job={job}
					imageCount={selectedImages.length}
					runCoralSCOP={runCoralSCOP}
					useClahe={projectCreationState.config.clahe === true}
					onBack={backToCoralSCOP}
					onRetry={startCreation}
					onHome={onHome}
					onStartOver={onStartOver}
				/>
			)}
		</div>
	);
}

function ProjectCreationPage() {
	const navigate = useNavigate();
	// Bumping this remounts the wizard with a fresh state for "Create Another".
	const [sessionKey, setSessionKey] = useState(0);

	const handleBackToHome = useCallback(() => {
		navigate("/");
	}, [navigate]);

	return (
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
				</SideBar>
				<div
					className={`${layoutStyles.mainSection} ${layoutStyles.page} ${layoutStyles.activePage}`}
					id="projectCreationPage"
				>
					<ProjectCreationProvider key={sessionKey}>
						<ProjectCreationWizard
							onHome={handleBackToHome}
							onStartOver={() => setSessionKey((k) => k + 1)}
						/>
					</ProjectCreationProvider>
				</div>
			</div>
		</div>
	);
}

export default ProjectCreationPage;
