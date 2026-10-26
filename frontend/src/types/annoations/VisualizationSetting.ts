import { type Label } from "./Label";

export interface VisualizationSetting {
	// Labels that user choose not to visualize
	hiddingLabels: Label[];

	// Master switch for all annotation overlays (toggled with Tab)
	showMasks: boolean;

	maskOpacity: number;

	pendingMaskOpacity: number;

	showBoundaries: boolean;

	// Boundary thickness relative to the automatic default (1 = default)
	boundaryWidth: number;

	showLabelBadges: boolean;

	// Label badge (circle + id) size relative to the automatic default (1 = default)
	labelBadgeSize: number;

	brightness: number;

	contrast: number;

	saturation: number;

	temperature: number;
	tint: number;
}
