import type { VisualizationSetting } from "../../types";

export type VisualizationSettingAction =
	| { type: "SET_HIDING_LABELS"; payload: VisualizationSetting["hiddingLabels"] }
	| { type: "SET_SHOW_MASKS"; payload: boolean }
	| { type: "SET_MASK_OPACITY"; payload: number }
	| { type: "SET_PENDING_MASK_OPACITY"; payload: number }
	| { type: "SET_BRIGHTNESS"; payload: number }
	| { type: "SET_CONTRAST"; payload: number }
	| { type: "SET_SATURATION"; payload: number };

export const initialVisualizationSetting: VisualizationSetting = {
	hiddingLabels: [],
	showMasks: true,
	maskOpacity: 0.4,
	brightness: 100,
	contrast: 100,
	saturation: 100,
	pendingMaskOpacity: 0.7,
};

export function visualizationSettingReducer(
	state: VisualizationSetting,
	action: VisualizationSettingAction,
): VisualizationSetting {
	switch (action.type) {
		case "SET_HIDING_LABELS":
			return { ...state, hiddingLabels: action.payload };
		case "SET_SHOW_MASKS":
			return { ...state, showMasks: action.payload };
		case "SET_MASK_OPACITY":
			return { ...state, maskOpacity: action.payload };
		case "SET_PENDING_MASK_OPACITY":
			return { ...state, pendingMaskOpacity: action.payload };
		case "SET_BRIGHTNESS":
			return { ...state, brightness: action.payload };
		case "SET_CONTRAST":
			return { ...state, contrast: action.payload };
		case "SET_SATURATION":
			return { ...state, saturation: action.payload };
		default:
			return state;
	}
}
