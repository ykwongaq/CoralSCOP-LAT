import { type Label } from "./Label";

export interface VisualizationSetting {
	// Labels that user choose not to visualize
	hiddingLabels: Label[];

	showMasks: boolean;

	maskOpacity: number;

	pendingMaskOpacity: number;

	brightness: number;

	contrast: number;

	saturation: number;
}
