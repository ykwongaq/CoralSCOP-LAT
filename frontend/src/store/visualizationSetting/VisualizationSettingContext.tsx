import { createContext, useContext, useReducer } from "react";
import type { VisualizationSetting } from "../../types";
import {
	visualizationSettingReducer,
	initialVisualizationSetting,
	type VisualizationSettingAction,
} from "./VisualizationSettingReducer";

export const VisualizationSettingContext = createContext<{
	visualizationSettingState: VisualizationSetting;
	visualizationSettingDispatch: React.Dispatch<VisualizationSettingAction>;
} | null>(null);

export function useVisualizationSetting() {
	const context = useContext(VisualizationSettingContext);
	if (!context) {
		throw new Error(
			"useVisualizationSetting must be used within a VisualizationSettingProvider",
		);
	}
	return context;
}

export function VisualizationSettingProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [visualizationSettingState, visualizationSettingDispatch] = useReducer(
		visualizationSettingReducer,
		initialVisualizationSetting,
	);

	return (
		<VisualizationSettingContext.Provider
			value={{ visualizationSettingState, visualizationSettingDispatch }}
		>
			{children}
		</VisualizationSettingContext.Provider>
	);
}
