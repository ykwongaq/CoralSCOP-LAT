import { useVisualizationSetting } from "../../../store";
import {
	AnnotationSiderBlock,
	AnnotationToggleBlock,
} from "../../ui/SettingSideBar";
import LabelBar from "../Labels/LabelBar";
import styles from "./ToolBar.module.css";

export default function AnnotationSideBar() {
	const { visualizationSettingState, visualizationSettingDispatch } =
		useVisualizationSetting();

	return (
		<div className={styles.sideBarSub}>
			<AnnotationSiderBlock
				name="Mask Opacity"
				id="opacity"
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
			></AnnotationSiderBlock>
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
			<LabelBar />
		</div>
	);
}
