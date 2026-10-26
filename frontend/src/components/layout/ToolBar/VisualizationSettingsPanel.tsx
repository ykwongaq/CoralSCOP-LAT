import {
	initialVisualizationSetting,
	useAnnotationSession,
	useProject,
	useVisualizationSetting,
} from "../../../store";
import type { VisualizationSetting } from "../../../types";
import {
	AnnotationSiderBlock,
	AnnotationToggleBlock,
	SettingSection,
} from "../../ui/SettingSideBar";
import styles from "./VisualizationSettingsPanel.module.css";

// ---------------------------------------------------------------------------
// Slider definitions
// ---------------------------------------------------------------------------

type SliderKey =
	| "maskOpacity"
	| "pendingMaskOpacity"
	| "boundaryWidth"
	| "labelBadgeSize"
	| "brightness"
	| "contrast"
	| "saturation"
	| "temperature"
	| "tint";

type SwitchKey = "showBoundaries" | "showLabelBadges";

interface SliderSpec {
	label: string;
	min: number;
	max: number;
	step: number;
	/** Stored value x factor = number shown on the slider. */
	factor: number;
	unit?: string;
}

const SLIDERS: Record<SliderKey, SliderSpec> = {
	maskOpacity: { label: "Fill opacity", min: 0, max: 100, step: 1, factor: 100 },
	pendingMaskOpacity: {
		label: "Preview opacity",
		min: 0,
		max: 100,
		step: 1,
		factor: 100,
	},
	boundaryWidth: { label: "Width", min: 25, max: 500, step: 25, factor: 100 },
	labelBadgeSize: { label: "Size", min: 25, max: 300, step: 5, factor: 100 },
	brightness: { label: "Brightness", min: 0, max: 200, step: 1, factor: 1 },
	contrast: { label: "Contrast", min: 0, max: 200, step: 1, factor: 1 },
	saturation: { label: "Saturation", min: 0, max: 200, step: 1, factor: 1 },
	temperature: {
		label: "Temperature",
		min: -100,
		max: 100,
		step: 1,
		factor: 100,
		unit: "",
	},
	tint: { label: "Tint", min: -100, max: 100, step: 1, factor: 100, unit: "" },
};

interface SectionSpec {
	id: string;
	title: string;
	sliders: SliderKey[];
	/** Setting that turns the whole section on/off from its header. */
	switchKey?: SwitchKey;
}

const ANNOTATION_SECTIONS: SectionSpec[] = [
	{ id: "viz-masks", title: "Masks", sliders: ["maskOpacity", "pendingMaskOpacity"] },
	{
		id: "viz-boundaries",
		title: "Boundaries",
		sliders: ["boundaryWidth"],
		switchKey: "showBoundaries",
	},
	{
		id: "viz-badges",
		title: "Label badges",
		sliders: ["labelBadgeSize"],
		switchKey: "showLabelBadges",
	},
];

const IMAGE_SECTIONS: SectionSpec[] = [
	{
		id: "viz-tone",
		title: "Tone",
		sliders: ["brightness", "contrast", "saturation"],
	},
	{ id: "viz-white-balance", title: "White balance", sliders: ["temperature", "tint"] },
];

const toSlider = (key: SliderKey, value: number) =>
	Math.round(value * SLIDERS[key].factor);

const isModified = (state: VisualizationSetting, keys: SliderKey[]) =>
	keys.some((key) => state[key] !== initialVisualizationSetting[key]);

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export default function VisualizationSettingsPanel() {
	const { visualizationSettingState: viz, visualizationSettingDispatch } =
		useVisualizationSetting();
	const { projectState, projectDispatch } = useProject();
	const { annotationSessionState } = useAnnotationSession();
	const useEnhancedImage = projectState.useEnhancedImage === true;
	const enhanceStatus = annotationSessionState.enhancedImageStatus;

	const update = (payload: Partial<Omit<VisualizationSetting, "hiddingLabels">>) =>
		visualizationSettingDispatch({
			type: "UPDATE_VISUALIZATION_SETTINGS",
			payload,
		});

	const resetKeys = (keys: SliderKey[]) =>
		update(
			Object.fromEntries(
				keys.map((key) => [key, initialVisualizationSetting[key]]),
			),
		);

	const renderSection = (section: SectionSpec, disabled = false) => {
		const switchKey = section.switchKey;
		return (
			<SettingSection
				key={section.id}
				id={section.id}
				title={section.title}
				enabled={switchKey ? viz[switchKey] : undefined}
				onEnabledChange={
					switchKey ? (value) => update({ [switchKey]: value }) : undefined
				}
				modified={isModified(viz, section.sliders)}
				onReset={() => resetKeys(section.sliders)}
				disabled={disabled}
			>
				{section.sliders.map((key) => {
					const spec = SLIDERS[key];
					return (
						<AnnotationSiderBlock
							key={key}
							id={`viz-${key}`}
							name={spec.label}
							value={toSlider(key, viz[key])}
							resetValue={toSlider(key, initialVisualizationSetting[key])}
							minValue={spec.min}
							maxValue={spec.max}
							step={spec.step}
							unit={spec.unit ?? "%"}
							onChange={(value) => update({ [key]: value / spec.factor })}
						/>
					);
				})}
			</SettingSection>
		);
	};

	const allSliders = Object.keys(SLIDERS) as SliderKey[];
	const anyModified =
		isModified(viz, allSliders) ||
		viz.showMasks !== initialVisualizationSetting.showMasks ||
		viz.showBoundaries !== initialVisualizationSetting.showBoundaries ||
		viz.showLabelBadges !== initialVisualizationSetting.showLabelBadges;

	return (
		<div className={styles.panel}>
			<div className={styles.masterToggle}>
				<AnnotationToggleBlock
					name="Show annotations"
					id="viz-show-masks"
					shortcut="Tab"
					description="Masks, boundaries and label badges"
					value={viz.showMasks}
					onChange={(value) =>
						visualizationSettingDispatch({ type: "SET_SHOW_MASKS", payload: value })
					}
				/>
			</div>

			<p className={styles.category}>Annotation overlay</p>
			{ANNOTATION_SECTIONS.map((section) =>
				renderSection(section, !viz.showMasks),
			)}

			<p className={styles.category}>Image</p>
			<div className={styles.enhanceToggle}>
				<AnnotationToggleBlock
					name="Enhanced image (CLAHE)"
					id="viz-enhanced-image"
					description="Boosts local contrast. SAM and CoralSCOP also run on it. Statistics always use the original colours."
					value={useEnhancedImage}
					onChange={(value) =>
						projectDispatch({ type: "SET_USE_ENHANCED_IMAGE", payload: value })
					}
				/>
				{useEnhancedImage && enhanceStatus === "loading" && (
					<p className={styles.enhanceStatus} role="status">
						Enhancing this image…
					</p>
				)}
				{useEnhancedImage && enhanceStatus === "error" && (
					<p
						className={`${styles.enhanceStatus} ${styles.enhanceError}`}
						role="alert"
					>
						Could not enhance this image, showing the original. Turn the
						switch off and on to try again.
					</p>
				)}
			</div>
			{IMAGE_SECTIONS.map((section) => renderSection(section))}

			<button
				type="button"
				className={styles.resetAll}
				disabled={!anyModified}
				onClick={() =>
					visualizationSettingDispatch({ type: "RESET_VISUALIZATION_SETTINGS" })
				}
			>
				Reset all to defaults
			</button>
		</div>
	);
}
