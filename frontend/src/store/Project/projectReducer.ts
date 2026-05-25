import {
	type Label,
	type RLE,
	type ProjectState,
	type ScaledLine,
	type CoralWatchCard,
} from "../../types";

export const initialProjectAnnotationState: ProjectState = {
	dataList: [],
	labels: [],
	projectName: "",
};

export type ModelOutputAnnotation = {
	category_id: number;
	segmentation: RLE;
};

export type ModelOutputCategory = {
	id: number;
	name: string;
};

export type ProjectAction =
	| { type: "LOAD_PROJECT"; payload: ProjectState }
	| { type: "SET_PROJECT_NAME"; payload: string }
	| {
			type: "ADD_LABEL";
			payload: {
				labelName: string;
			};
	  }
	| {
			type: "DELETE_LABEL";
			payload: { labelId: number };
	  }
	| {
			type: "UPDATE_LABEL_NAME";
			payload: { labelId: number; newName: string };
	  }
	| { type: "ADD_LABEL_STATUS"; payload: { labelId: number; status: string } }
	| {
			type: "DELETE_LABEL_STATUS";
			payload: { labelId: number; statusIndex: number };
	  }
	| {
			type: "ASSIGN_LABEL_TO_ANNOTATION";
			payload: { dataId: number; annotationId: number; labelId: number };
	  }
	| {
			type: "DELETE_ANNOTATIONS";
			payload: { dataId: number; annotationIds: number[] };
	  }
	| {
			type: "ADD_ANNOTATION";
			payload: { dataId: number; segmentation: RLE; labelId: number };
	  }
	| {
			type: "ADD_MODEL_OUTPUT";
			payload: {
				dataId: number;
				annotations: ModelOutputAnnotation[];
				categories: ModelOutputCategory[];
			};
	  }
	| { type: "ADD_SCALED_LINE"; payload: { dataId: number; line: ScaledLine } }
	| {
			type: "UPDATE_SCALED_LINE";
			payload: {
				dataId: number;
				lineId: number;
				updates: Partial<Omit<ScaledLine, "id">>;
			};
	  }
	| { type: "DELETE_SCALED_LINE"; payload: { dataId: number; lineId: number } }
	| {
			type: "SET_CORAL_WATCH_CARD";
			payload: { dataId: number; card: CoralWatchCard | null };
	  };

function setCoralWatchCard(
	state: ProjectState,
	dataId: number,
	card: CoralWatchCard | null,
): ProjectState {
	return {
		...state,
		dataList: state.dataList.map((data) => {
			if (data.id !== dataId) return data;
			return {
				...data,
				coralWatch: card,
			};
		}),
	};
}
function addScaledLine(
	state: ProjectState,
	dataId: number,
	line: ScaledLine,
): ProjectState {
	return {
		...state,
		dataList: state.dataList.map((data) => {
			if (data.id !== dataId) return data;

			const newLineId =
				data.scaledLineList.length > 0
					? Math.max(...data.scaledLineList.map((l) => l.id)) + 1
					: 0;

			return {
				...data,
				scaledLineList: [...data.scaledLineList, { ...line, id: newLineId }],
			};
		}),
	};
}

function updateScaledLine(
	state: ProjectState,
	dataId: number,
	lineId: number,
	updates: Partial<Omit<ScaledLine, "id">>,
): ProjectState {
	return {
		...state,
		dataList: state.dataList.map((data) =>
			data.id === dataId
				? {
						...data,
						scaledLineList: data.scaledLineList.map((line) =>
							line.id === lineId ? { ...line, ...updates } : line,
						),
					}
				: data,
		),
	};
}

function deleteScaledLine(
	state: ProjectState,
	dataId: number,
	lineId: number,
): ProjectState {
	return {
		...state,
		dataList: state.dataList.map((data) => {
			if (data.id !== dataId) return data;

			const remainingLines = data.scaledLineList
				.filter((line) => line.id !== lineId)
				.map((line, index) => ({ ...line, id: index }));

			return {
				...data,
				scaledLineList: remainingLines,
			};
		}),
	};
}

function addModelOutput(
	state: ProjectState,
	dataId: number,
	annotations: ModelOutputAnnotation[],
	categories: ModelOutputCategory[],
): ProjectState {
	// Build a mapping from model category_id → local label id.
	// Reuse an existing label when the name matches; otherwise create a new one.
	const categoryIdToLabelId = new Map<number, number>();
	let workingLabels: Label[] = [...state.labels];

	for (const category of categories) {
		const existing = workingLabels.find((l) => l.name === category.name);
		if (existing) {
			categoryIdToLabelId.set(category.id, existing.id);
		} else {
			const newId = workingLabels.length;
			workingLabels = [
				...workingLabels,
				{ id: newId, name: category.name, status: [] },
			];
			categoryIdToLabelId.set(category.id, newId);
		}
	}

	// Append all annotations to the target data item, assigning fresh IDs.
	const targetData = state.dataList.find((d) => d.id === dataId);
	let nextAnnotationId =
		Math.max(0, ...(targetData?.annotations.map((a) => a.id) ?? [])) + 1;

	const newAnnotations = annotations.flatMap((annotation) => {
		const labelId = categoryIdToLabelId.get(annotation.category_id);
		if (labelId === undefined) return [];
		return [
			{
				id: nextAnnotationId++,
				segmentation: annotation.segmentation,
				labelId,
			},
		];
	});

	return {
		...state,
		labels: workingLabels,
		dataList: state.dataList.map((data) =>
			data.id === dataId
				? { ...data, annotations: [...data.annotations, ...newAnnotations] }
				: data,
		),
	};
}

function addAnnotation(
	state: ProjectState,
	dataId: number,
	segmentation: RLE,
	labelId: number,
): ProjectState {
	const newAnnotationId =
		Math.max(
			0,
			...(state.dataList
				.find((data) => data.id === dataId)
				?.annotations.map((ann) => ann.id) ?? []),
		) + 1;

	const newAnnotation = {
		id: newAnnotationId,
		segmentation,
		labelId,
	};

	return {
		...state,
		dataList: state.dataList.map((data) =>
			data.id === dataId
				? { ...data, annotations: [...data.annotations, newAnnotation] }
				: data,
		),
	};
}
function addLabel(state: ProjectState, labelName: string): ProjectState {
	const newLabelId = state.labels.length;
	const newLabel: Label = {
		id: newLabelId,
		name: labelName,
		status: [],
	};

	return {
		...state,
		labels: [...state.labels, newLabel],
	};
}

function deleteLabel(state: ProjectState, labelId: number): ProjectState {
	// Remove the label and reassign contiguous IDs to the remaining labels
	const remainingLabels = state.labels
		.filter((label) => label.id !== labelId)
		.map((label, index) => ({ ...label, id: index }));

	// Build a mapping from old ID -> new ID for surviving labels
	const oldToNewId = new Map<number, number>();
	state.labels
		.filter((label) => label.id !== labelId)
		.forEach((label, index) => {
			oldToNewId.set(label.id, index);
		});

	// Remove annotations that used the deleted label; remap the rest
	const updatedDataList = state.dataList.map((data) => ({
		...data,
		annotations: data.annotations
			.filter((annotation) => annotation.labelId !== labelId)
			.map((annotation) => ({
				...annotation,
				labelId: oldToNewId.get(annotation.labelId) ?? annotation.labelId,
			})),
	}));

	return {
		...state,
		labels: remainingLabels,
		dataList: updatedDataList,
	};
}

function addLabelStatus(
	state: ProjectState,
	labelId: number,
	status: string,
): ProjectState {
	return {
		...state,
		labels: state.labels.map((label) =>
			label.id === labelId
				? { ...label, status: [...label.status, status] }
				: label,
		),
	};
}

function deleteLabelStatus(
	state: ProjectState,
	labelId: number,
	statusIndex: number,
): ProjectState {
	return {
		...state,
		labels: state.labels.map((label) =>
			label.id === labelId
				? {
						...label,
						status: label.status.filter((_, i) => i !== statusIndex),
					}
				: label,
		),
	};
}

function updateLabelName(
	state: ProjectState,
	labelId: number,
	newName: string,
): ProjectState {
	return {
		...state,
		labels: state.labels.map((label) =>
			label.id === labelId ? { ...label, name: newName } : label,
		),
	};
}

function assignLabelToAnnotation(
	state: ProjectState,
	dataId: number,
	annotationId: number,
	labelId: number,
): ProjectState {
	return {
		...state,
		dataList: state.dataList.map((data) =>
			data.id === dataId
				? {
						...data,
						annotations: data.annotations.map((annotation) =>
							annotation.id === annotationId
								? { ...annotation, labelId }
								: annotation,
						),
					}
				: data,
		),
	};
}

function deleteAnnotations(
	state: ProjectState,
	dataId: number,
	annotationIds: number[],
): ProjectState {
	const idsToDelete = new Set(annotationIds);
	return {
		...state,
		dataList: state.dataList.map((data) =>
			data.id === dataId
				? {
						...data,
						annotations: data.annotations
							.filter((annotation) => !idsToDelete.has(annotation.id))
							.map((annotation, index) => ({ ...annotation, id: index })),
					}
				: data,
		),
	};
}

export function projectReducer(
	state: ProjectState,
	action: ProjectAction,
): ProjectState {
	switch (action.type) {
		case "LOAD_PROJECT":
			return action.payload;
		case "SET_PROJECT_NAME":
			return { ...state, projectName: action.payload };
		case "ADD_LABEL":
			return addLabel(state, action.payload.labelName);
		case "DELETE_LABEL":
			return deleteLabel(state, action.payload.labelId);
		case "UPDATE_LABEL_NAME":
			return updateLabelName(
				state,
				action.payload.labelId,
				action.payload.newName,
			);
		case "ADD_LABEL_STATUS":
			return addLabelStatus(
				state,
				action.payload.labelId,
				action.payload.status,
			);
		case "DELETE_LABEL_STATUS":
			return deleteLabelStatus(
				state,
				action.payload.labelId,
				action.payload.statusIndex,
			);
		case "ASSIGN_LABEL_TO_ANNOTATION":
			return assignLabelToAnnotation(
				state,
				action.payload.dataId,
				action.payload.annotationId,
				action.payload.labelId,
			);
		case "DELETE_ANNOTATIONS":
			return deleteAnnotations(
				state,
				action.payload.dataId,
				action.payload.annotationIds,
			);
		case "ADD_ANNOTATION":
			return addAnnotation(
				state,
				action.payload.dataId,
				action.payload.segmentation,
				action.payload.labelId,
			);
		case "ADD_MODEL_OUTPUT":
			return addModelOutput(
				state,
				action.payload.dataId,
				action.payload.annotations,
				action.payload.categories,
			);
		case "ADD_SCALED_LINE":
			return addScaledLine(state, action.payload.dataId, action.payload.line);
		case "UPDATE_SCALED_LINE":
			return updateScaledLine(
				state,
				action.payload.dataId,
				action.payload.lineId,
				action.payload.updates,
			);
		case "DELETE_SCALED_LINE":
			return deleteScaledLine(
				state,
				action.payload.dataId,
				action.payload.lineId,
			);
		case "SET_CORAL_WATCH_CARD":
			return setCoralWatchCard(
				state,
				action.payload.dataId,
				action.payload.card,
			);
		default:
			return state;
	}
}
