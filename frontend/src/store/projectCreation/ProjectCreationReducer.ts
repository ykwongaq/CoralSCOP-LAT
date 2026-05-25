import type { ImageData, ProjectCreationState } from "../../types";
export type ProjectCreationAction =
	| { type: "ADD_IMAGE"; payload: ImageData }
	| { type: "ADD_IMAGES"; payload: ImageData[] }
	| { type: "TOGGLE_IMAGE_SELECTION"; payload: number }
	| { type: "SELECT_ALL_IMAGES"; payload: null }
	| { type: "DESELECT_ALL_IMAGES"; payload: null }
	| { type: "UPDATE_MIN_AREA"; payload: number }
	| { type: "UPDATE_MIN_CONFIDENCE"; payload: number }
	| { type: "UPDATE_MAX_OVERLAP"; payload: number }
	| { type: "UPDATE_MODEL_SELECTION"; payload: string | null };

function add_image(state: ProjectCreationState, payload: ImageData) {
	const newIndex = state.imageDataList.length;
	return {
		...state,
		imageDataList: [...state.imageDataList, { ...payload }],
		selectedIndices: [...state.selectedIndices, newIndex],
	};
}

function add_images(state: ProjectCreationState, payload: ImageData[]) {
	const startIndex = state.imageDataList.length;
	const newIndices = payload.map((_, i) => startIndex + i);
	return {
		...state,
		imageDataList: [...state.imageDataList, ...payload],
		selectedIndices: [...state.selectedIndices, ...newIndices],
	};
}

function toggle_image_selection(
	state: ProjectCreationState,
	payload: number,
): ProjectCreationState {
	if (payload < 0 || payload >= state.imageDataList.length) return state;
	const has = state.selectedIndices.includes(payload);
	return {
		...state,
		selectedIndices: has
			? state.selectedIndices.filter((i) => i !== payload)
			: [...state.selectedIndices, payload],
	};
}

function select_all_images(state: ProjectCreationState): ProjectCreationState {
	return {
		...state,
		selectedIndices: state.imageDataList.map((_, i) => i),
	};
}

function deselect_all_images(
	state: ProjectCreationState,
): ProjectCreationState {
	return {
		...state,
		selectedIndices: [],
	};
}

function update_min_area(state: ProjectCreationState, payload: number) {
	return {
		...state,
		config: {
			...state.config,
			min_area: payload,
		},
	};
}

function update_min_confidence(state: ProjectCreationState, payload: number) {
	return {
		...state,
		config: {
			...state.config,
			min_confidence: payload,
		},
	};
}

function update_max_overlap(state: ProjectCreationState, payload: number) {
	return {
		...state,
		config: {
			...state.config,
			max_overlap: payload,
		},
	};
}

function update_model_selection(
	state: ProjectCreationState,
	payload: string | null,
) {
	return {
		...state,
		model_selection: payload,
	};
}

export const initialProjectCreationState: ProjectCreationState = {
	imageDataList: [],
	selectedIndices: [],
	config: {
		min_area: 0.001,
		min_confidence: 0.5,
		max_overlap: 0.001,
	},
	model_selection: "CoralSCOP",
};

export function projectCreationReducer(
	state: ProjectCreationState,
	action: ProjectCreationAction,
): ProjectCreationState {
	switch (action.type) {
		case "ADD_IMAGE":
			return add_image(state, action.payload);
		case "ADD_IMAGES":
			return add_images(state, action.payload);
		case "TOGGLE_IMAGE_SELECTION":
			return toggle_image_selection(state, action.payload);
		case "SELECT_ALL_IMAGES":
			return select_all_images(state);
		case "DESELECT_ALL_IMAGES":
			return deselect_all_images(state);
		case "UPDATE_MIN_AREA":
			return update_min_area(state, action.payload);
		case "UPDATE_MIN_CONFIDENCE":
			return update_min_confidence(state, action.payload);
		case "UPDATE_MAX_OVERLAP":
			return update_max_overlap(state, action.payload);
		case "UPDATE_MODEL_SELECTION":
			return update_model_selection(state, action.payload);
		default:
			return state;
	}
}
