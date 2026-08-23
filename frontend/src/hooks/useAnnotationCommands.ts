import {
	createContext,
	createElement,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import {
	useAnnotationSession,
	useProject,
	useVisualizationSetting,
} from "../store";
import { rasterizeMask } from "../services";
import {
	type AnnotationCommand,
	decodeRLE,
	extractPolygonFromMask,
} from "../utils";

/**
 * Owns all annotation command logic and the UI state for label pickers.
 * Returns the full execute map plus the picker open/close state so that
 * AnnotationPanel (and any other consumer) can remain thin rendering shells.
 */
function useCreateAnnotationCommands() {
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();
	const { visualizationSettingState, visualizationSettingDispatch } =
		useVisualizationSetting();
	const { projectState, projectDispatch } = useProject();

	const mode = annotationSessionState.annotationMode;
	const [isLabelPanelOpen, setIsLabelPanelOpen] = useState(false);
	const [isActivateLabelOpen, setIsActivateLabelOpen] = useState(false);

	const handleToggleMasks = useCallback(() => {
		visualizationSettingDispatch({
			type: "SET_SHOW_MASKS",
			payload: !visualizationSettingState.showMasks,
		});
	}, [visualizationSettingState.showMasks, visualizationSettingDispatch]);

	const handleRemove = useCallback(() => {
		projectDispatch({
			type: "DELETE_ANNOTATIONS",
			payload: {
				dataId: annotationSessionState.currentDataIndex,
				annotationIds: annotationSessionState.selectedAnnotations,
			},
		});
		annotationSessionDispatch({ type: "CLEAR_SELECTION" });
	}, [
		annotationSessionDispatch,
		projectDispatch,
		annotationSessionState.currentDataIndex,
		annotationSessionState.selectedAnnotations,
	]);

	const handleClearPrompts = useCallback(() => {
		annotationSessionDispatch({ type: "CLEAR_POINT_PROMPTS" });
		annotationSessionDispatch({ type: "CLEAR_POLYGON_VERTICES" });
		annotationSessionDispatch({ type: "CLEAR_BRUSH_STROKES" });
		annotationSessionDispatch({ type: "CLEAR_PENDING_MASK" });
	}, [annotationSessionDispatch]);

	const handleConfirmMask = useCallback(() => {
		const labelId = annotationSessionState.activateLabel
			? annotationSessionState.activateLabel.id
			: -1;

		if (annotationSessionState.promptMode === "polygon") {
			const polygon = annotationSessionState.polygonPoints;
			if (polygon.length < 3) return;

			const data =
				projectState.dataList[annotationSessionState.currentDataIndex];
			if (!data) return;

			rasterizeMask(
				{
					size: [data.imageData.height, data.imageData.width],
					polygons: [polygon.map((p) => [p.x, p.y])],
				},
				{
					onComplete: (response) => {
						projectDispatch({
							type: "ADD_ANNOTATION",
							payload: {
								dataId: annotationSessionState.currentDataIndex,
								segmentation: response.mask,
								labelId,
							},
						});
						annotationSessionDispatch({
							type: "CLEAR_POLYGON_VERTICES",
						});
					},
					onError: (error) => {
						console.error("Polygon rasterization failed:", error);
					},
				},
			);
			return;
		}

		if (annotationSessionState.promptMode === "brush") {
			const strokes = annotationSessionState.brushStrokes;
			if (strokes.length === 0) return;

			const data =
				projectState.dataList[annotationSessionState.currentDataIndex];
			if (!data) return;

			rasterizeMask(
				{
					size: [data.imageData.height, data.imageData.width],
					strokes: strokes.map((s) => ({
						points: s.points.map((p) => [p.x, p.y]),
						width: s.width,
					})),
				},
				{
					onComplete: (response) => {
						projectDispatch({
							type: "ADD_ANNOTATION",
							payload: {
								dataId: annotationSessionState.currentDataIndex,
								segmentation: response.mask,
								labelId,
							},
						});
						annotationSessionDispatch({ type: "CLEAR_BRUSH_STROKES" });
					},
					onError: (error) => {
						console.error("Brush rasterization failed:", error);
					},
				},
			);
			return;
		}

		projectDispatch({
			type: "ADD_ANNOTATION",
			payload: {
				dataId: annotationSessionState.currentDataIndex,
				segmentation: annotationSessionState.pendingMask!.segmentation,
				labelId,
			},
		});
		annotationSessionDispatch({ type: "CLEAR_PENDING_MASK" });
		annotationSessionDispatch({ type: "CLEAR_POINT_PROMPTS" });
	}, [
		annotationSessionState.activateLabel,
		annotationSessionState.currentDataIndex,
		annotationSessionState.pendingMask,
		annotationSessionState.promptMode,
		annotationSessionState.polygonPoints,
		annotationSessionState.brushStrokes,
		projectState.dataList,
		projectDispatch,
		annotationSessionDispatch,
	]);

	const handleSwitchToAdd = useCallback(() => {
		annotationSessionDispatch({ type: "SET_ANNOTATION_MODE", payload: "add" });
	}, [annotationSessionDispatch]);

	const handleSwitchToSelect = useCallback(() => {
		annotationSessionDispatch({ type: "CLEAR_PENDING_MASK" });
		annotationSessionDispatch({ type: "CLEAR_POINT_PROMPTS" });
		annotationSessionDispatch({ type: "CLEAR_POLYGON_VERTICES" });
		annotationSessionDispatch({ type: "CLEAR_BRUSH_STROKES" });
		annotationSessionDispatch({
			type: "SET_ANNOTATION_MODE",
			payload: "select",
		});
	}, [annotationSessionDispatch]);

	const handleStartEdit = useCallback(() => {
		const selected = annotationSessionState.selectedAnnotations;
		if (selected.length !== 1) {
			console.warn(
				"Edit Mask requires exactly one selected annotation",
				selected,
			);
			return;
		}

		const data = projectState.dataList[annotationSessionState.currentDataIndex];
		if (!data) return;

		const annotation = data.annotations.find((ann) => ann.id === selected[0]);
		if (!annotation) {
			console.warn("Selected annotation not found", selected[0]);
			return;
		}

		const [height, width] = annotation.segmentation.size;
		const mask = decodeRLE(annotation.segmentation);
		const points = extractPolygonFromMask(mask, width, height);
		if (points.length < 3) {
			console.warn(
				"Could not extract an editable polygon from the annotation",
				annotation.segmentation,
			);
			return;
		}

		annotationSessionDispatch({
			type: "START_EDIT_POLYGON",
			payload: {
				annotationId: annotation.id,
				points,
				originalPoints: points,
				brushStrokes: [],
			},
		});
		annotationSessionDispatch({ type: "SET_ANNOTATION_MODE", payload: "edit" });
	}, [
		annotationSessionState.selectedAnnotations,
		annotationSessionState.currentDataIndex,
		projectState.dataList,
		annotationSessionDispatch,
	]);

	const handleConfirmEdit = useCallback(() => {
		const editPolygon = annotationSessionState.editPolygon;
		if (!editPolygon || editPolygon.points.length < 3) return;

		const data = projectState.dataList[annotationSessionState.currentDataIndex];
		if (!data) return;

		rasterizeMask(
			{
				size: [data.imageData.height, data.imageData.width],
				polygons: [editPolygon.points.map((p) => [p.x, p.y])],
				strokes: editPolygon.brushStrokes.map((s) => ({
					points: s.points.map((p) => [p.x, p.y]),
					width: s.width,
				})),
			},
			{
				onComplete: (response) => {
					projectDispatch({
						type: "UPDATE_ANNOTATION_SEGMENTATION",
						payload: {
							dataId: annotationSessionState.currentDataIndex,
							annotationId: editPolygon.annotationId,
							segmentation: response.mask,
						},
					});
					annotationSessionDispatch({
						type: "SET_ANNOTATION_MODE",
						payload: "select",
					});
				},
				onError: (error) => {
					console.error("Polygon edit rasterization failed:", error);
				},
			},
		);
	}, [
		annotationSessionState.editPolygon,
		annotationSessionState.currentDataIndex,
		projectState.dataList,
		projectDispatch,
		annotationSessionDispatch,
	]);

	const handleCancelEdit = useCallback(() => {
		annotationSessionDispatch({
			type: "SET_ANNOTATION_MODE",
			payload: "select",
		});
	}, [annotationSessionDispatch]);

	const handleResetEdit = useCallback(() => {
		const editPolygon = annotationSessionState.editPolygon;
		if (!editPolygon) return;
		annotationSessionDispatch({
			type: "SET_EDIT_POLYGON_POINTS",
			payload: editPolygon.originalPoints.map((p) => ({ ...p })),
		});
		annotationSessionDispatch({ type: "CLEAR_EDIT_BRUSH_STROKES" });
	}, [annotationSessionState.editPolygon, annotationSessionDispatch]);

	const handleToggleLabels = useCallback(() => {
		if (mode === "select") setIsLabelPanelOpen((prev) => !prev);
		else setIsActivateLabelOpen((prev) => !prev);
	}, [mode]);

	const handleSelectLabelByIndex = useCallback(
		(index: number) => {
			const label = projectState.labels[index];
			if (!label) return;

			if (isLabelPanelOpen) {
				annotationSessionState.selectedAnnotations.forEach((annotationId) => {
					projectDispatch({
						type: "ASSIGN_LABEL_TO_ANNOTATION",
						payload: {
							dataId: annotationSessionState.currentDataIndex,
							annotationId,
							labelId: label.id,
						},
					});
				});
				annotationSessionDispatch({ type: "CLEAR_SELECTION" });
				setIsLabelPanelOpen(false);
			} else if (isActivateLabelOpen) {
				annotationSessionDispatch({ type: "SET_ACTIVE_LABEL", payload: label });
				setIsActivateLabelOpen(false);
			}
		},
		[
			projectState.labels,
			isLabelPanelOpen,
			isActivateLabelOpen,
			annotationSessionState.selectedAnnotations,
			annotationSessionState.currentDataIndex,
			projectDispatch,
			annotationSessionDispatch,
		],
	);

	const handlePrevImage = useCallback(() => {
		const currentDataIndex = annotationSessionState.currentDataIndex;
		if (currentDataIndex > 0) {
			annotationSessionDispatch({
				type: "SET_CURRENT_DATA_INDEX",
				payload: currentDataIndex - 1,
			});
		}
	}, [annotationSessionDispatch, annotationSessionState.currentDataIndex]);

	const handleNextImage = useCallback(() => {
		const currentDataIndex = annotationSessionState.currentDataIndex;
		if (currentDataIndex < projectState.dataList.length - 1) {
			annotationSessionDispatch({
				type: "SET_CURRENT_DATA_INDEX",
				payload: currentDataIndex + 1,
			});
		}
	}, [
		annotationSessionDispatch,
		annotationSessionState.currentDataIndex,
		projectState.dataList.length,
	]);

	const execute = useMemo(
		(): Record<AnnotationCommand, () => void> => ({
			"toggle-masks": handleToggleMasks,
			remove: handleRemove,
			"clear-prompts": handleClearPrompts,
			"confirm-mask": handleConfirmMask,
			"switch-to-add": handleSwitchToAdd,
			"switch-to-select": handleSwitchToSelect,
			"start-edit": handleStartEdit,
			"confirm-edit": handleConfirmEdit,
			"cancel-edit": handleCancelEdit,
			"reset-edit": handleResetEdit,
			"toggle-labels": handleToggleLabels,
			"select-label-0": () => handleSelectLabelByIndex(0),
			"select-label-1": () => handleSelectLabelByIndex(1),
			"select-label-2": () => handleSelectLabelByIndex(2),
			"select-label-3": () => handleSelectLabelByIndex(3),
			"select-label-4": () => handleSelectLabelByIndex(4),
			"select-label-5": () => handleSelectLabelByIndex(5),
			"select-label-6": () => handleSelectLabelByIndex(6),
			"select-label-7": () => handleSelectLabelByIndex(7),
			"select-label-8": () => handleSelectLabelByIndex(8),
			"prev-image": handlePrevImage,
			"next-image": handleNextImage,
		}),
		[
			handleToggleMasks,
			handleRemove,
			handleClearPrompts,
			handleConfirmMask,
			handleSwitchToAdd,
			handleSwitchToSelect,
			handleStartEdit,
			handleConfirmEdit,
			handleCancelEdit,
			handleResetEdit,
			handleToggleLabels,
			handleSelectLabelByIndex,
			handlePrevImage,
			handleNextImage,
		],
	);

	return {
		execute,
		isLabelPanelOpen,
		setIsLabelPanelOpen,
		isActivateLabelOpen,
		setIsActivateLabelOpen,
	};
}

type AnnotationCommandsContextValue = ReturnType<
	typeof useCreateAnnotationCommands
>;

const AnnotationCommandsContext =
	createContext<AnnotationCommandsContextValue | null>(null);

export function AnnotationCommandsProvider({
	children,
}: {
	children: ReactNode;
}) {
	const value = useCreateAnnotationCommands();
	return createElement(AnnotationCommandsContext.Provider, { value }, children);
}

export function useAnnotationCommands() {
	const context = useContext(AnnotationCommandsContext);

	if (!context) {
		throw new Error(
			"useAnnotationCommands must be used within an AnnotationCommandsProvider",
		);
	}

	return context;
}
