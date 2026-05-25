import { createContext, useContext, useReducer } from "react";
import type { ProjectState } from "../../types";

import {
	projectReducer,
	initialProjectAnnotationState,
	type ProjectAction,
} from "./projectReducer";

export const ProjectContext = createContext<{
	projectState: ProjectState;
	projectDispatch: React.Dispatch<ProjectAction>;
} | null>(null);

export function useProject() {
	const context = useContext(ProjectContext);
	if (!context) {
		throw new Error("useProject must be used within a ProjectProvider");
	}
	return context;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
	const [projectState, projectDispatch] = useReducer(
		projectReducer,
		initialProjectAnnotationState,
	);

	return (
		<ProjectContext.Provider value={{ projectState, projectDispatch }}>
			{children}
		</ProjectContext.Provider>
	);
}
