import { createContext, useContext, useReducer } from "react";
import type { ProjectCreationState } from "../../types";
import {
	projectCreationReducer,
	initialProjectCreationState,
	type ProjectCreationAction,
} from "./ProjectCreationReducer";

export const ProjectCreationContext = createContext<{
	projectCreationState: ProjectCreationState;
	projectCreationDispatch: React.Dispatch<ProjectCreationAction>;
} | null>(null);

export function useProjectCreation() {
	const context = useContext(ProjectCreationContext);
	if (!context) {
		throw new Error(
			"useProjectCreation must be used within a ProjectCreationProvider",
		);
	}
	return context;
}

export function ProjectCreationProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [projectCreationState, projectCreationDispatch] = useReducer(
		projectCreationReducer,
		initialProjectCreationState,
	);

	return (
		<ProjectCreationContext.Provider
			value={{ projectCreationState, projectCreationDispatch }}
		>
			{children}
		</ProjectCreationContext.Provider>
	);
}
