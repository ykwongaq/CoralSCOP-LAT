import type {
	Label,
	AnnotationSessionState,
	EditPolygon,
	PendingAnnotation,
	Point,
	PointPrompt,
} from "../../types";

export type AnnotationSessionAction =
	| { type: "SET_PENDING_MASK"; payload: PendingAnnotation }
	| { type: "CLEAR_PENDING_MASK" }
	| { type: "SET_ACTIVE_LABEL"; payload: Label | null }
	| { type: "CLEAR_ACTIVE_LABEL" }
	| { type: "TOGGLE_ANNOTATION_SELECTION"; payload: { annIds: number[] } }
	| { type: "CLEAR_SELECTION" }
	| { type: "SET_ANNOTATION_MODE"; payload: "select" | "add" | "edit" }
	| { type: "SET_CURRENT_DATA_INDEX"; payload: number }
	| { type: "ADD_POINT_PROMPT"; payload: PointPrompt }
	| { type: "CLEAR_POINT_PROMPTS" }
	| { type: "UNDO_POINT_PROMPT" }
	| { type: "SET_PROMPT_MODE"; payload: "point" | "polygon" }
	| { type: "ADD_POLYGON_VERTEX"; payload: Point }
	| { type: "CLEAR_POLYGON_VERTICES" }
	| { type: "UNDO_POLYGON_VERTEX" }
	| { type: "START_EDIT_POLYGON"; payload: EditPolygon }
	| { type: "SET_EDIT_POLYGON_POINTS"; payload: Point[] }
	| { type: "CLEAR_EDIT_POLYGON" }
	| { type: "SELECT_SCALED_LINE_ID"; payload: number | null };

export const initialAnnotationSessionState: AnnotationSessionState = {
	pendingMask: null,
	activateLabel: null,
	selectedAnnotations: [],
	annotationMode: "select",
	promptMode: "point",
	currentDataIndex: 0,
	pointPrompts: [],
	polygonPoints: [],
	editPolygon: null,
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
		polygonPoints: [],
		pendingMask: null,
		editPolygon: null,
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
			return {
				...state,
				annotationMode: action.payload,
				// Leaving edit mode discards the in-progress polygon.
				editPolygon: action.payload === "edit" ? state.editPolygon : null,
			};
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
		case "SET_PROMPT_MODE":
			return {
				...state,
				promptMode: action.payload,
				pointPrompts: [],
				polygonPoints: [],
				pendingMask: null,
			};
		case "ADD_POLYGON_VERTEX":
			return {
				...state,
				polygonPoints: [...state.polygonPoints, action.payload],
			};
		case "CLEAR_POLYGON_VERTICES":
			return { ...state, polygonPoints: [] };
		case "UNDO_POLYGON_VERTEX":
			return { ...state, polygonPoints: state.polygonPoints.slice(0, -1) };
		case "START_EDIT_POLYGON":
			return { ...state, editPolygon: action.payload };
		case "SET_EDIT_POLYGON_POINTS":
			return state.editPolygon
				? {
						...state,
						editPolygon: { ...state.editPolygon, points: action.payload },
					}
				: state;
		case "CLEAR_EDIT_POLYGON":
			return { ...state, editPolygon: null };
		case "SELECT_SCALED_LINE_ID":
			return select_scaled_line_id(state, action.payload);
		default:
			return state;
	}
}
