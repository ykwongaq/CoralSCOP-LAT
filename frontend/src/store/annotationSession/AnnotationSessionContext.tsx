import { createContext, useContext, useReducer } from "react";
import type { AnnotationSessionState } from "../../types";
import {
	annotationSessionReducer,
	initialAnnotationSessionState,
	type AnnotationSessionAction,
} from "./AnnotationSessionReducer";

export const AnnotationSessionContext = createContext<{
	annotationSessionState: AnnotationSessionState;
	annotationSessionDispatch: React.Dispatch<AnnotationSessionAction>;
} | null>(null);

export function useAnnotationSession() {
	const context = useContext(AnnotationSessionContext);
	if (!context) {
		throw new Error(
			"useAnnotationSession must be used within an AnnotationSessionProvider",
		);
	}
	return context;
}

export function AnnotationSessionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [annotationSessionState, annotationSessionDispatch] = useReducer(
		annotationSessionReducer,
		initialAnnotationSessionState,
	);

	return (
		<AnnotationSessionContext.Provider
			value={{ annotationSessionState, annotationSessionDispatch }}
		>
			{children}
		</AnnotationSessionContext.Provider>
	);
}
