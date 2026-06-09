import { useVisualizationSetting } from "../../../store";
import {
	AnnotationSiderBlock,
	AnnotationToggleBlock,
	CollapsibleGroup,
} from "../../ui/SettingSideBar";
import LabelBar from "../Labels/LabelBar";
import styles from "./ToolBar.module.css";

export default function AnnotationSideBar() {
	const { visualizationSettingState, visualizationSettingDispatch } =
		useVisualizationSetting();

	return (
		<div className={styles.sideBarSub}>
			<CollapsibleGroup title="Visualization" defaultExpanded={false}>
				<AnnotationSiderBlock
					name="Mask Opacity"
					id="mask-opacity"
					defaultValue={Math.round(visualizationSettingState.maskOpacity * 100)}
					onChange={(value) => {
						visualizationSettingDispatch({
							type: "SET_MASK_OPACITY",
							payload: value / 100,
						});
					}}
					minValue={0}
					maxValue={100}
					step={1}
				/>
				<AnnotationSiderBlock
					name="Brightness"
					id="brightness"
					defaultValue={Math.round(visualizationSettingState.brightness)}
					onChange={(value) => {
						visualizationSettingDispatch({
							type: "SET_BRIGHTNESS",
							payload: value,
						});
					}}
					minValue={0}
					maxValue={200}
					step={1}
				/>
				<AnnotationSiderBlock
					name="Contrast"
					id="contrast"
					defaultValue={Math.round(visualizationSettingState.contrast)}
					onChange={(value) => {
						visualizationSettingDispatch({
							type: "SET_CONTRAST",
							payload: value,
						});
					}}
					minValue={0}
					maxValue={200}
					step={1}
				/>

				<AnnotationSiderBlock
					name="Saturation"
					id="saturation"
					defaultValue={Math.round(visualizationSettingState.saturation)}
					onChange={(value) => {
						visualizationSettingDispatch({
							type: "SET_SATURATION",
							payload: value,
						});
					}}
					minValue={0}
					maxValue={200}
					step={1}
				/>
				<AnnotationSiderBlock
					name="White Balance Temperature"
					id="temperature"
					defaultValue={Math.round(visualizationSettingState.temperature * 100)}
					onChange={(value) => {
						visualizationSettingDispatch({
							type: "SET_TEMPERATURE",
							payload: value / 100,
						});
					}}
					minValue={-100}
					maxValue={100}
					step={1}
				/>
				<AnnotationSiderBlock
					name="White Balance Tint"
					id="tint"
					defaultValue={Math.round(visualizationSettingState.tint * 100)}
					onChange={(value) => {
						visualizationSettingDispatch({
							type: "SET_TINT",
							payload: value / 100,
						});
					}}
					minValue={-100}
					maxValue={100}
					step={1}
				/>
				<AnnotationToggleBlock
					name="Show Masks (Tab)"
					id="show-masks"
					defaultValue={visualizationSettingState.showMasks}
					onChange={(value) => {
						visualizationSettingDispatch({
							type: "SET_SHOW_MASKS",
							payload: value,
						});
					}}
				></AnnotationToggleBlock>
				<button
					type="button"
					onClick={() => {
						visualizationSettingDispatch({
							type: "RESET_VISUALIZATION_SETTINGS",
						});
					}}
					style={{
						marginTop: 12,
						padding: "6px 16px",
						fontSize: 12,
						fontWeight: 500,
						fontFamily: "Roboto, sans-serif",
						color: "#5b8def",
						backgroundColor: "transparent",
						border: "1px solid #5b8def",
						borderRadius: 6,
						cursor: "pointer",
						alignSelf: "flex-start",
					}}
				>
					Reset to Defaults
				</button>
			</CollapsibleGroup>
			<CollapsibleGroup title="Labels" defaultExpanded={true} fill={true}>
				<LabelBar />
			</CollapsibleGroup>
		</div>
	);
}
