import { useState } from "react";
import layoutStyles from "../PanelLayout.module.css";
import styles from "./CreationWizard.module.css";
import { useProjectCreation } from "../../../store";
import { Button, SettingGroups, SettingSliderBlock } from "../../ui";
import { BottomBar } from "../../layout";
import ChoiceCard from "./ChoiceCard";

const CORALSCOP_MODEL = "CoralSCOP";

interface CoralSCOPStepProps {
	onBack: () => void;
	onNext: () => void;
}

/** Wizard step 3: decide whether CoralSCOP pre-generates masks for every image. */
export default function CoralSCOPStep({ onBack, onNext }: CoralSCOPStepProps) {
	const { projectCreationState, projectCreationDispatch } =
		useProjectCreation();
	const [showAdvanced, setShowAdvanced] = useState(false);

	const runCoralSCOP = projectCreationState.model_selection === CORALSCOP_MODEL;
	const imageCount = projectCreationState.selectedIndices.length;
	const { config } = projectCreationState;

	function setRunCoralSCOP(run: boolean) {
		projectCreationDispatch({
			type: "UPDATE_MODEL_SELECTION",
			payload: run ? CORALSCOP_MODEL : null,
		});
	}

	return (
		<>
			<div className={layoutStyles.mainSectionContent}>
				<p className={styles.stepTitle}>Run CoralSCOP in advance?</p>
				<p className={styles.stepDesc}>
					CoralSCOP can automatically segment the corals in all{" "}
					{imageCount} selected image{imageCount !== 1 ? "s" : ""} before you
					start annotating, so every image opens with masks already in place.
					This makes project creation take longer.
				</p>

				<div className={styles.choiceGroup} role="radiogroup">
					<ChoiceCard
						selected={runCoralSCOP}
						title="Yes, run CoralSCOP"
						description="Generate masks for every image now. Recommended for most projects."
						onSelect={() => setRunCoralSCOP(true)}
					/>
					<ChoiceCard
						selected={!runCoralSCOP}
						title="No, skip"
						description="Create the project without masks. You will annotate the images yourself."
						onSelect={() => setRunCoralSCOP(false)}
					/>
				</div>

				{runCoralSCOP && (
					<>
						<button
							type="button"
							className={styles.advancedToggle}
							aria-expanded={showAdvanced}
							onClick={() => setShowAdvanced((v) => !v)}
						>
							<span
								className={`${styles.advancedChevron}${showAdvanced ? ` ${styles.advancedChevronOpen}` : ""}`}
							>
								▶
							</span>
							Advanced mask filter settings
						</button>
						{showAdvanced && (
							<div className={styles.advancedBody}>
								<SettingGroups>
									<SettingSliderBlock
										title="Min Area:"
										description="Remove masks that are too small, as a % of the image area. Range 0–20."
										id="min-area"
										defaultValue={config.min_area * 100}
										minValue={0}
										maxValue={20}
										step={0.1}
										onChange={(value) =>
											projectCreationDispatch({
												type: "UPDATE_MIN_AREA",
												payload: value / 100,
											})
										}
									/>
									<SettingSliderBlock
										title="Min Confidence:"
										description="Remove masks the model is not confident about. Higher values give more reliable masks. (in %)"
										id="min-confidence"
										defaultValue={config.min_confidence * 100}
										minValue={0}
										maxValue={100}
										step={1}
										onChange={(value) =>
											projectCreationDispatch({
												type: "UPDATE_MIN_CONFIDENCE",
												payload: value / 100,
											})
										}
									/>
									<SettingSliderBlock
										title="Max Overlap:"
										description="Remove masks that overlap too much with other masks, measured by Intersection over Union (IoU). (in %)"
										id="max-overlap"
										defaultValue={config.max_overlap * 100}
										minValue={0}
										maxValue={50}
										step={0.1}
										onChange={(value) =>
											projectCreationDispatch({
												type: "UPDATE_MAX_OVERLAP",
												payload: value / 100,
											})
										}
									/>
								</SettingGroups>
							</div>
						)}
					</>
				)}
			</div>

			<BottomBar className={layoutStyles.mainSectionBottom}>
				<Button className={styles.wizardButton} onClick={onBack} isBorder>
					Back
				</Button>
				<Button className={styles.wizardButton} onClick={onNext}>Create Project</Button>
			</BottomBar>
		</>
	);
}
