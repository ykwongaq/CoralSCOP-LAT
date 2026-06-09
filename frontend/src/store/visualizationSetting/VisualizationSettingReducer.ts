import type { VisualizationSetting } from "../../types";

export type VisualizationSettingAction =
	| {
			type: "SET_HIDING_LABELS";
			payload: VisualizationSetting["hiddingLabels"];
	  }
	| { type: "SET_SHOW_MASKS"; payload: boolean }
	| { type: "SET_MASK_OPACITY"; payload: number }
	| { type: "SET_PENDING_MASK_OPACITY"; payload: number }
	| { type: "SET_BRIGHTNESS"; payload: number }
	| { type: "SET_CONTRAST"; payload: number }
	| { type: "SET_SATURATION"; payload: number }
	| { type: "SET_TEMPERATURE"; payload: number }
	| { type: "SET_TINT"; payload: number }
	| { type: "RESET_VISUALIZATION_SETTINGS" };

export const initialVisualizationSetting: VisualizationSetting = {
	hiddingLabels: [],
	showMasks: true,
	maskOpacity: 0.4,
	brightness: 100,
	contrast: 100,
	saturation: 100,
	pendingMaskOpacity: 0.7,
	temperature: 0,
	tint: 0,
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
		case "SET_TEMPERATURE":
			return { ...state, temperature: action.payload };
		case "SET_TINT":
			return { ...state, tint: action.payload };
		case "RESET_VISUALIZATION_SETTINGS":
			return { ...initialVisualizationSetting };
		default:
			return state;
	}
}
