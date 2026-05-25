import type {
	Label,
	AnnotationSessionState,
	PendingAnnotation,
	PointPrompt,
} from "../../types";

export type AnnotationSessionAction =
	| { type: "SET_PENDING_MASK"; payload: PendingAnnotation }
	| { type: "CLEAR_PENDING_MASK" }
	| { type: "SET_ACTIVE_LABEL"; payload: Label | null }
	| { type: "CLEAR_ACTIVE_LABEL" }
	| { type: "TOGGLE_ANNOTATION_SELECTION"; payload: { annIds: number[] } }
	| { type: "CLEAR_SELECTION" }
	| { type: "SET_ANNOTATION_MODE"; payload: "select" | "add" }
	| { type: "SET_CURRENT_DATA_INDEX"; payload: number }
	| { type: "ADD_POINT_PROMPT"; payload: PointPrompt }
	| { type: "CLEAR_POINT_PROMPTS" }
	| { type: "UNDO_POINT_PROMPT" }
	| { type: "SELECT_SCALED_LINE_ID"; payload: number | null };

export const initialAnnotationSessionState: AnnotationSessionState = {
	pendingMask: null,
	activateLabel: null,
	selectedAnnotations: [],
	annotationMode: "select",
	currentDataIndex: 0,
	pointPrompts: [],
	selectedScaledLineId: null,
};

function select_scaled_line_id(
	state: AnnotationSessionState,
	lineId: number | null,
): AnnotationSessionState {
	return { ...state, selectedScaledLineId: lineId };
}

function toggleMaskSelection(
	state: AnnotationSessionState,
	annIds: number[],
): AnnotationSessionState {
	// Toggle selection of annotations with given IDs
	// So that originally selected annotations that are toggled will be deselected, and vice versa
	const newSelected = new Set(state.selectedAnnotations.map((ann) => ann));
	for (const id of annIds) {
		if (newSelected.has(id)) {
			newSelected.delete(id);
		} else {
			newSelected.add(id);
		}
	}
	return { ...state, selectedAnnotations: Array.from(newSelected) };
}

function setCurrentDataIndex(
	state: AnnotationSessionState,
	index: number,
): AnnotationSessionState {
	// Clear point prompts and pending mask when switching data
	return {
		...state,
		currentDataIndex: index,
		pointPrompts: [],
		pendingMask: null,
		selectedAnnotations: [],
		selectedScaledLineId: null,
	};
}

export function annotationSessionReducer(
	state: AnnotationSessionState,
	action: AnnotationSessionAction,
): AnnotationSessionState {
	switch (action.type) {
		case "SET_PENDING_MASK":
			return { ...state, pendingMask: action.payload };
		case "CLEAR_PENDING_MASK":
			return { ...state, pendingMask: null };
		case "SET_ACTIVE_LABEL":
			return { ...state, activateLabel: action.payload };
		case "CLEAR_ACTIVE_LABEL":
			return { ...state, activateLabel: null };
		case "TOGGLE_ANNOTATION_SELECTION":
			return toggleMaskSelection(state, action.payload.annIds);
		case "CLEAR_SELECTION":
			return { ...state, selectedAnnotations: [] };
		case "SET_ANNOTATION_MODE":
			return { ...state, annotationMode: action.payload };
		case "SET_CURRENT_DATA_INDEX":
			return setCurrentDataIndex(state, action.payload);
		case "ADD_POINT_PROMPT":
			return {
				...state,
				pointPrompts: [...state.pointPrompts, action.payload],
			};
		case "CLEAR_POINT_PROMPTS":
			return { ...state, pointPrompts: [] };
		case "UNDO_POINT_PROMPT":
			return { ...state, pointPrompts: state.pointPrompts.slice(0, -1) };
		case "SELECT_SCALED_LINE_ID":
			return select_scaled_line_id(state, action.payload);
		default:
			return state;
	}
}
