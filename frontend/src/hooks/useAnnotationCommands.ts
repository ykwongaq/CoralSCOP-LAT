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
import { predictInstanceWithRegeneration, rasterizeMask } from "../services";
import {
	type AnnotationCommand,
	decodeRLE,
	extractPolygonFromMask,
	rleArea,
	unionRLEs,
	getActiveImage,
} from "../utils";
import type { Annotation } from "../types";

/**
 * Pick the label for a merged mask: the label used by the most masks wins,
 * ties go to the label covering the larger area. Unlabeled masks (labelId < 0)
 * only win when none of the masks has a label.
 */
function pickMergedLabel(annotations: Annotation[]): number {
	const stats = new Map<number, { count: number; area: number }>();
	for (const ann of annotations) {
		if (ann.labelId < 0) continue;
		const entry = stats.get(ann.labelId) ?? { count: 0, area: 0 };
		entry.count += 1;
		entry.area += rleArea(ann.segmentation);
		stats.set(ann.labelId, entry);
	}

	let best = -1;
	let bestStats = { count: 0, area: -1 };
	for (const [labelId, s] of stats) {
		if (
			s.count > bestStats.count ||
			(s.count === bestStats.count && s.area > bestStats.area)
		) {
			best = labelId;
			bestStats = s;
		}
	}
	return best;
}

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
		if (annotationSessionState.selectedAnnotations.length === 0) return;
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
				undoStack: [],
			},
		});
		annotationSessionDispatch({ type: "SET_ANNOTATION_MODE", payload: "edit" });
	}, [
		annotationSessionState.selectedAnnotations,
		annotationSessionState.currentDataIndex,
		projectState.dataList,
		annotationSessionDispatch,
	]);

	const handleMerge = useCallback(() => {
		const selected = new Set(annotationSessionState.selectedAnnotations);
		if (selected.size < 2) return;

		const data = projectState.dataList[annotationSessionState.currentDataIndex];
		if (!data) return;

		const toMerge = data.annotations.filter((ann) => selected.has(ann.id));
		if (toMerge.length < 2) return;

		let segmentation;
		try {
			segmentation = unionRLEs(toMerge.map((ann) => ann.segmentation));
		} catch (error) {
			console.error("Mask merge failed:", error);
			return;
		}

		projectDispatch({
			type: "MERGE_ANNOTATIONS",
			payload: {
				dataId: annotationSessionState.currentDataIndex,
				annotationIds: toMerge.map((ann) => ann.id),
				segmentation,
				labelId: pickMergedLabel(toMerge),
			},
		});
		annotationSessionDispatch({ type: "CLEAR_SELECTION" });
	}, [
		annotationSessionState.selectedAnnotations,
		annotationSessionState.currentDataIndex,
		projectState.dataList,
		projectDispatch,
		annotationSessionDispatch,
	]);

	const handleConfirmEdit = useCallback(() => {
		const editPolygon = annotationSessionState.editPolygon;
		if (!editPolygon) return;

		// Nothing changed since the last save.
		if (
			editPolygon.points === editPolygon.originalPoints &&
			editPolygon.brushStrokes.length === 0
		)
			return;

		const data = projectState.dataList[annotationSessionState.currentDataIndex];
		if (!data) return;
		const annotation = data.annotations.find(
			(ann) => ann.id === editPolygon.annotationId,
		);
		if (!annotation) return;

		const toPolygons = (points: { x: number; y: number }[]) =>
			points.length >= 3 ? [points.map((p) => [p.x, p.y])] : [];

		// The saved mask is the base: only the area between the original and
		// edited outlines changes, then the strokes apply. Holes, separate
		// pieces and untouched detail of the mask are kept.
		rasterizeMask(
			{
				size: [data.imageData.height, data.imageData.width],
				base: annotation.segmentation,
				basePolygons: toPolygons(editPolygon.originalPoints),
				polygons: toPolygons(editPolygon.points),
				strokes: editPolygon.brushStrokes.map((s) => ({
					points: s.points.map((p) => [p.x, p.y]),
					width: s.width,
					erase: s.erase ?? false,
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
					// Stay in edit mode on the saved mask: strokes and undo
					// history are cleared and the outline is re-extracted.
					const [height, width] = response.mask.size;
					const points = extractPolygonFromMask(
						decodeRLE(response.mask),
						width,
						height,
					);
					annotationSessionDispatch({
						type: "REBASE_EDIT_POLYGON",
						payload: { annotationId: editPolygon.annotationId, points },
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
		annotationSessionDispatch({ type: "RESET_EDIT_POLYGON" });
	}, [annotationSessionDispatch]);

	const handleUndo = useCallback(() => {
		if (mode === "edit") {
			annotationSessionDispatch({ type: "UNDO_EDIT" });
			return;
		}
		if (mode !== "add") return;

		if (annotationSessionState.promptMode === "polygon") {
			annotationSessionDispatch({ type: "UNDO_POLYGON_VERTEX" });
			return;
		}
		if (annotationSessionState.promptMode === "brush") {
			annotationSessionDispatch({ type: "UNDO_BRUSH_STROKE" });
			return;
		}

		// Point prompts: the reducer restores the mask from before the undone
		// prompt. If that mask was never received, run SAM again on the
		// remaining prompts.
		const prompts = annotationSessionState.pointPrompts;
		if (prompts.length === 0) return;
		annotationSessionDispatch({ type: "UNDO_POINT_PROMPT" });

		const remaining = prompts.slice(0, -1);
		if (
			remaining.length === 0 ||
			annotationSessionState.pendingMaskHistory[remaining.length - 1]
		)
			return;

		const sessionId = projectState.sessionId;
		const data = projectState.dataList[annotationSessionState.currentDataIndex];
		if (!sessionId || !data) return;
		// Predict on the version (original or enhanced) currently in use.
		const image = getActiveImage(data.imageData, projectState.useEnhancedImage);
		predictInstanceWithRegeneration(
			{ sessionId, stem: image.embeddingStem, inputPrompts: remaining },
			image.url,
			{
				onComplete: (response) => {
					annotationSessionDispatch({
						type: "SET_PENDING_MASK",
						payload: {
							segmentation: response.mask,
							labelId: annotationSessionState.activateLabel?.id ?? -1,
							id: -1,
							encodedLogit: response.bestMaskLogit,
						},
						promptCount: remaining.length,
					});
				},
				onError: (error) => {
					console.error("SAM inference failed:", error);
				},
			},
		);
	}, [
		mode,
		annotationSessionState.promptMode,
		annotationSessionState.pointPrompts,
		annotationSessionState.pendingMaskHistory,
		annotationSessionState.currentDataIndex,
		annotationSessionState.activateLabel,
		projectState.sessionId,
		projectState.dataList,
		projectState.useEnhancedImage,
		annotationSessionDispatch,
	]);

	const handleToggleLabels = useCallback(() => {
		if (mode === "select") {
			// Assigning a label needs at least one selected mask.
			if (annotationSessionState.selectedAnnotations.length === 0) return;
			setIsLabelPanelOpen((prev) => !prev);
		} else setIsActivateLabelOpen((prev) => !prev);
	}, [mode, annotationSessionState.selectedAnnotations.length]);

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
			merge: handleMerge,
			"confirm-edit": handleConfirmEdit,
			"cancel-edit": handleCancelEdit,
			"reset-edit": handleResetEdit,
			undo: handleUndo,
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
			handleMerge,
			handleConfirmEdit,
			handleCancelEdit,
			handleResetEdit,
			handleUndo,
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
