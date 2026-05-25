import { ScaledLineSideBar, ScaledLineCanvas } from "../../layout";

export const SCALE_DEFINE_PANEL_ID = "scale-define-panel";

export default function ScaleDefinePanel() {
	return (
		<>
			{" "}
			<ScaledLineSideBar /> <ScaledLineCanvas />{" "}
		</>
	);
}
