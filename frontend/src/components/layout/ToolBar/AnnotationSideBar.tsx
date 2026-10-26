import { CollapsibleGroup } from "../../ui/SettingSideBar";
import LabelBar from "../Labels/LabelBar";
import VisualizationSettingsPanel from "./VisualizationSettingsPanel";
import ResizableSideBar from "./ResizableSideBar";
import styles from "./ToolBar.module.css";

export default function AnnotationSideBar() {
	return (
		<ResizableSideBar>
			<div className={styles.sideBarSub}>
				<CollapsibleGroup
					title="Visualization"
					defaultExpanded={false}
					maxContentHeight="60vh"
				>
					<VisualizationSettingsPanel />
				</CollapsibleGroup>
				<CollapsibleGroup title="Labels" defaultExpanded={true} fill={true}>
					<LabelBar />
				</CollapsibleGroup>
			</div>
		</ResizableSideBar>
	);
}
