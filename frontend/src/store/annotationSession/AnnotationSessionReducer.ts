import type {
	Label,
	AnnotationSessionState,
	BrushStroke,
	EditPolygon,
	EditSnapshot,
	EditTool,
	PendingAnnotation,
	Point,
	PointPrompt,
} from "../../types";
import {
	BRUSH_SIZE_DEFAULT_PERCENT,
	clampBrushPercent,
} from "../../utils/brush";

export type AnnotationSessionAction =
	// promptCount: number of point prompts the mask was predicted from.
	// When given, the mask is recorded for undo, and only shown if no prompt
	// was added or undone meanwhile.
	| {
			type: "SET_PENDING_MASK";
			payload: PendingAnnotation;
			promptCount?: number;
	  }
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
	| { type: "SET_PROMPT_MODE"; payload: "point" | "polygon" | "brush" }
	| { type: "ADD_POLYGON_VERTEX"; payload: Point }
	| { type: "CLEAR_POLYGON_VERTICES" }
	| { type: "UNDO_POLYGON_VERTEX" }
	// Brush size as a percentage of the image's longer side
	| { type: "SET_BRUSH_SIZE"; payload: number }
	| { type: "ADD_BRUSH_STROKE"; payload: BrushStroke }
	| { type: "APPEND_BRUSH_POINT"; payload: Point }
	| { type: "CLEAR_BRUSH_STROKES" }
	| { type: "UNDO_BRUSH_STROKE" }
	| { type: "SET_EDIT_TOOL"; payload: EditTool }
	| { type: "START_EDIT_POLYGON"; payload: EditPolygon }
	| { type: "SET_EDIT_POLYGON_POINTS"; payload: Point[] }
	| { type: "ADD_EDIT_BRUSH_STROKE"; payload: BrushStroke }
	| { type: "APPEND_EDIT_BRUSH_POINT"; payload: Point }
	// Save the current edit geometry to the undo stack (call before a change)
	| { type: "CHECKPOINT_EDIT" }
	| { type: "UNDO_EDIT" }
	// Restore the geometry from the last save (undoable)
	| { type: "RESET_EDIT_POLYGON" }
	// After a save: the saved mask becomes the new base for editing
	| {
			type: "REBASE_EDIT_POLYGON";
			payload: { annotationId: number; points: Point[] };
	  }
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
	pendingMaskHistory: [],
	polygonPoints: [],
	brushStrokes: [],
	brushSizePercent: BRUSH_SIZE_DEFAULT_PERCENT,
	editTool: "vertex",
	editPolygon: null,
	selectedScaledLineId: null,
};

const MAX_EDIT_UNDO = 100;

/** Push the current edit geometry onto the undo stack. */
function withEditCheckpoint(editPolygon: EditPolygon): EditPolygon {
	const snapshot: EditSnapshot = {
		points: editPolygon.points,
		brushStrokes: editPolygon.brushStrokes,
	};
	return {
		...editPolygon,
		undoStack: [...editPolygon.undoStack, snapshot].slice(-MAX_EDIT_UNDO),
	};
}

/**
 * Restore the most recent snapshot that differs from the current geometry.
 * Snapshots identical to the current state (e.g. a vertex clicked but not
 * moved) are skipped so every undo visibly changes something.
 */
function undoEdit(editPolygon: EditPolygon): EditPolygon {
	const stack = editPolygon.undoStack.slice();
	while (stack.length > 0) {
		const snapshot = stack.pop()!;
		if (
			snapshot.points !== editPolygon.points ||
			snapshot.brushStrokes !== editPolygon.brushStrokes
		) {
			return {
				...editPolygon,
				points: snapshot.points,
				brushStrokes: snapshot.brushStrokes,
				undoStack: stack,
			};
		}
	}
	return { ...editPolygon, undoStack: [] };
}

function setPendingMask(
	state: AnnotationSessionState,
	mask: PendingAnnotation,
	promptCount: number | undefined,
): AnnotationSessionState {
	if (promptCount === undefined) return { ...state, pendingMask: mask };
	// Prediction for prompts that were undone meanwhile: drop it.
	if (promptCount < 1 || promptCount > state.pointPrompts.length) return state;
	const history = state.pendingMaskHistory.slice();
	while (history.length < promptCount) history.push(null);
	history[promptCount - 1] = mask;
	return {
		...state,
		pendingMaskHistory: history,
		// Only show it if it matches the current prompts (avoids an older,
		// slower response overwriting a newer mask).
		pendingMask:
			promptCount === state.pointPrompts.length ? mask : state.pendingMask,
	};
}

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
		pendingMaskHistory: [],
		polygonPoints: [],
		brushStrokes: [],
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
			return setPendingMask(state, action.payload, action.promptCount);
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
			return { ...state, pointPrompts: [], pendingMaskHistory: [] };
		case "UNDO_POINT_PROMPT": {
			if (state.pointPrompts.length === 0) return state;
			const count = state.pointPrompts.length - 1;
			return {
				...state,
				pointPrompts: state.pointPrompts.slice(0, -1),
				pendingMaskHistory: state.pendingMaskHistory.slice(0, count),
				// Mask from before the undone prompt (null if not recorded;
				// the caller then re-runs SAM).
				pendingMask:
					count > 0 ? (state.pendingMaskHistory[count - 1] ?? null) : null,
			};
		}
		case "SET_PROMPT_MODE":
			return {
				...state,
				promptMode: action.payload,
				pointPrompts: [],
				pendingMaskHistory: [],
				polygonPoints: [],
				brushStrokes: [],
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
		case "SET_BRUSH_SIZE":
			return {
				...state,
				brushSizePercent: clampBrushPercent(action.payload),
			};
		case "ADD_BRUSH_STROKE":
			return {
				...state,
				brushStrokes: [...state.brushStrokes, action.payload],
			};
		case "APPEND_BRUSH_POINT": {
			if (state.brushStrokes.length === 0) return state;
			const last = state.brushStrokes[state.brushStrokes.length - 1];
			return {
				...state,
				brushStrokes: [
					...state.brushStrokes.slice(0, -1),
					{ ...last, points: [...last.points, action.payload] },
				],
			};
		}
		case "CLEAR_BRUSH_STROKES":
			return { ...state, brushStrokes: [] };
		case "UNDO_BRUSH_STROKE":
			return { ...state, brushStrokes: state.brushStrokes.slice(0, -1) };
		case "SET_EDIT_TOOL":
			return { ...state, editTool: action.payload };
		case "START_EDIT_POLYGON":
			return { ...state, editPolygon: action.payload };
		case "SET_EDIT_POLYGON_POINTS":
			return state.editPolygon
				? {
						...state,
						editPolygon: { ...state.editPolygon, points: action.payload },
					}
				: state;
		case "ADD_EDIT_BRUSH_STROKE": {
			if (!state.editPolygon) return state;
			const editPolygon = withEditCheckpoint(state.editPolygon);
			return {
				...state,
				editPolygon: {
					...editPolygon,
					brushStrokes: [...editPolygon.brushStrokes, action.payload],
				},
			};
		}
		case "APPEND_EDIT_BRUSH_POINT": {
			if (!state.editPolygon || state.editPolygon.brushStrokes.length === 0)
				return state;
			const strokes = state.editPolygon.brushStrokes;
			const last = strokes[strokes.length - 1];
			return {
				...state,
				editPolygon: {
					...state.editPolygon,
					brushStrokes: [
						...strokes.slice(0, -1),
						{ ...last, points: [...last.points, action.payload] },
					],
				},
			};
		}
		case "CHECKPOINT_EDIT":
			return state.editPolygon
				? { ...state, editPolygon: withEditCheckpoint(state.editPolygon) }
				: state;
		case "UNDO_EDIT":
			return state.editPolygon
				? { ...state, editPolygon: undoEdit(state.editPolygon) }
				: state;
		case "RESET_EDIT_POLYGON": {
			const ep = state.editPolygon;
			if (!ep) return state;
			// Nothing to reset: don't add an empty undo step.
			if (ep.points === ep.originalPoints && ep.brushStrokes.length === 0)
				return state;
			return {
				...state,
				editPolygon: {
					...withEditCheckpoint(ep),
					points: ep.originalPoints,
					brushStrokes: [],
				},
			};
		}
		case "REBASE_EDIT_POLYGON":
			// Ignore if the user left edit mode or switched mask meanwhile.
			if (
				!state.editPolygon ||
				state.editPolygon.annotationId !== action.payload.annotationId
			)
				return state;
			return {
				...state,
				editPolygon: {
					...state.editPolygon,
					points: action.payload.points,
					originalPoints: action.payload.points,
					brushStrokes: [],
					undoStack: [],
				},
			};
		case "CLEAR_EDIT_POLYGON":
			return { ...state, editPolygon: null };
		case "SELECT_SCALED_LINE_ID":
			return select_scaled_line_id(state, action.payload);
		default:
			return state;
	}
}
