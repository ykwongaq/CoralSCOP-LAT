import { type ImageData } from "../ImageData";
import { type ProjectConfig } from "./ProjectConfig";
export interface ProjectCreationState {
	imageDataList: ImageData[];
	selectedIndices: number[];
	config: ProjectConfig;
	model_selection: string | null;
}
