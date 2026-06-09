import { useCallback, useEffect, useRef } from "react";
import { useAnnotationSession, useProject } from "../../../store";
import { type ScaledLine } from "../../../types";
import { useCanvasImageDisplay } from "../../../hooks";

type DraftLine = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
};

type InteractionState =
	| { phase: "idle" }
	| {
			phase: "leftDown";
			startClientX: number;
			startClientY: number;
			startImgX: number;
			startImgY: number;
	  }
	| { phase: "drawing"; startImgX: number; startImgY: number }
	| { phase: "panning"; lastClientX: number; lastClientY: number };

const DRAG_THRESHOLD = 5;
const MIN_LINE_LENGTH = 8;
const CLICK_HIT_THRESHOLD = 10;
const DEFAULT_UNIT: ScaledLine["unit"] = "cm";

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function distancePointToSegment(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
) {
	const dx = x2 - x1;
	const dy = y2 - y1;

	if (dx === 0 && dy === 0) {
		return Math.hypot(px - x1, py - y1);
	}

	const t = clamp(
		((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy),
		0,
		1,
	);
	const projX = x1 + t * dx;
	const projY = y1 + t * dy;
	return Math.hypot(px - projX, py - projY);
}

import styles from "./CanvasCommon.module.css";

function formatScaleValue(line: ScaledLine) {
	const scaleValue = Number.isFinite(line.scale) ? line.scale : 0;
	if (scaleValue <= 0) {
		return "";
	}
	const rounded =
		scaleValue >= 10 ? scaleValue.toFixed(1) : scaleValue.toFixed(2);
	return `${Number(rounded)} ${line.unit ?? DEFAULT_UNIT}`;
}

function drawStoredLine(
	ctx: CanvasRenderingContext2D,
	line: ScaledLine,
	selected: boolean,
	viewportScale: number,
) {
	const strokeColor = selected ? "#ff8a00" : "#2d8cff";
	const text = formatScaleValue(line);
	const radius = 5 / viewportScale;

	ctx.save();
	ctx.strokeStyle = strokeColor;
	ctx.fillStyle = strokeColor;
	ctx.lineWidth = (selected ? 3 : 2) / viewportScale;
	ctx.beginPath();
	ctx.moveTo(line.start.x, line.start.y);
	ctx.lineTo(line.end.x, line.end.y);
	ctx.stroke();

	for (const point of [line.start, line.end]) {
		ctx.beginPath();
		ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 1.5 / viewportScale;
		ctx.stroke();
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = (selected ? 3 : 2) / viewportScale;
	}

	if (text) {
		const centerX = (line.start.x + line.end.x) / 2;
		const centerY = (line.start.y + line.end.y) / 2;
		const angle = Math.atan2(
			line.end.y - line.start.y,
			line.end.x - line.start.x,
		);
		let rotation = angle;
		if (rotation > Math.PI / 2 || rotation < -Math.PI / 2) {
			rotation += Math.PI;
		}

		ctx.save();
		ctx.translate(centerX, centerY);
		ctx.rotate(rotation);
		ctx.font = `${14 / viewportScale}px sans-serif`;
		ctx.textBaseline = "middle";
		const metrics = ctx.measureText(text);
		const paddingX = 6 / viewportScale;
		const labelHeight = 18 / viewportScale;
		const labelY = -14 / viewportScale;
		ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
		ctx.strokeStyle = selected
			? "rgba(255, 138, 0, 0.45)"
			: "rgba(45, 140, 255, 0.35)";
		ctx.lineWidth = 1 / viewportScale;
		ctx.fillRect(
			-metrics.width / 2 - paddingX,
			labelY - labelHeight / 2,
			metrics.width + paddingX * 2,
			labelHeight,
		);
		ctx.strokeRect(
			-metrics.width / 2 - paddingX,
			labelY - labelHeight / 2,
			metrics.width + paddingX * 2,
			labelHeight,
		);
		ctx.fillStyle = strokeColor;
		ctx.fillText(text, -metrics.width / 2, labelY);
		ctx.restore();
	}

	ctx.restore();
}

function drawDraftLine(
	ctx: CanvasRenderingContext2D,
	line: DraftLine,
	viewportScale: number,
) {
	const centerX = (line.startX + line.endX) / 2;
	const centerY = (line.startY + line.endY) / 2;
	const radius = 6 / viewportScale;
	const text = "Release to save scale line";

	ctx.save();
	ctx.lineCap = "round";

	ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
	ctx.lineWidth = 7 / viewportScale;
	ctx.setLineDash([12 / viewportScale, 8 / viewportScale]);
	ctx.beginPath();
	ctx.moveTo(line.startX, line.startY);
	ctx.lineTo(line.endX, line.endY);
	ctx.stroke();

	ctx.strokeStyle = "#ff5a1f";
	ctx.lineWidth = 3.5 / viewportScale;
	ctx.shadowColor = "rgba(255, 90, 31, 0.45)";
	ctx.shadowBlur = 12 / viewportScale;
	ctx.setLineDash([10 / viewportScale, 6 / viewportScale]);
	ctx.beginPath();
	ctx.moveTo(line.startX, line.startY);
	ctx.lineTo(line.endX, line.endY);
	ctx.stroke();

	ctx.setLineDash([]);
	ctx.shadowBlur = 0;
	ctx.fillStyle = "#ff5a1f";
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 2 / viewportScale;

	for (const point of [
		{ x: line.startX, y: line.startY },
		{ x: line.endX, y: line.endY },
	]) {
		ctx.beginPath();
		ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}

	ctx.font = `bold ${13 / viewportScale}px sans-serif`;
	ctx.textBaseline = "middle";
	const metrics = ctx.measureText(text);
	const paddingX = 7 / viewportScale;
	const labelHeight = 20 / viewportScale;
	const labelY = -16 / viewportScale;

	ctx.fillStyle = "rgba(22, 27, 34, 0.78)";
	ctx.fillRect(
		centerX - metrics.width / 2 - paddingX,
		centerY + labelY - labelHeight / 2,
		metrics.width + paddingX * 2,
		labelHeight,
	);
	ctx.fillStyle = "#ffffff";
	ctx.fillText(text, centerX - metrics.width / 2, centerY + labelY);
	ctx.restore();
}

export default function ScaledLineCanvas() {
	const { projectState, projectDispatch } = useProject();
	const { annotationSessionState, annotationSessionDispatch } =
		useAnnotationSession();

	const data =
		projectState.dataList[annotationSessionState.currentDataIndex] ?? null;
	const scaledLines = data?.scaledLineList ?? [];

	const imageUrl = data?.imageData.imageUrl ?? null;

	// -------------------------------------------------------------------
	// Shared image-display hook — manages image loading, white balance,
	// viewport, zoom, and rAF scheduling.
	// -------------------------------------------------------------------
	const {
		canvasRef,
		containerRef,
		imageSizeRef,
		viewportRef,
		requestDraw,
		drawImageToContext,
	} = useCanvasImageDisplay(imageUrl);

	const interactionRef = useRef<InteractionState>({ phase: "idle" });
	const draftLineRef = useRef<DraftLine | null>(null);
	const linesRef = useRef(scaledLines);
	linesRef.current = scaledLines;
	const selectedLineIdRef = useRef(annotationSessionState.selectedScaledLineId);
	selectedLineIdRef.current = annotationSessionState.selectedScaledLineId;

	// -------------------------------------------------------------------
	// Core draw — reads everything from refs, safe to call from rAF
	// -------------------------------------------------------------------
	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const { scale, originX, originY } = viewportRef.current;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.save();
		ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);

		// Image (all viz adjustments handled by the hook)
		drawImageToContext(ctx);

		for (const line of linesRef.current) {
			drawStoredLine(ctx, line, selectedLineIdRef.current === line.id, scale);
		}

		if (draftLineRef.current) {
			drawDraftLine(ctx, draftLineRef.current, scale);
		}

		ctx.restore();
	}, [canvasRef, viewportRef, drawImageToContext]);

	// Stable wrapper that avoids re-creating the rAF callback on every draw change
	const scheduleDraw = useCallback(
		() => requestDraw(draw),
		[requestDraw, draw],
	);

	// -------------------------------------------------------------------
	// Coordinate helpers
	// -------------------------------------------------------------------
	const toImageCoords = useCallback((clientX: number, clientY: number) => {
		const canvas = canvasRef.current;
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		const { scale, originX, originY } = viewportRef.current;
		return {
			x: (clientX - rect.left) / scale + originX,
			y: (clientY - rect.top) / scale + originY,
		};
	}, [canvasRef, viewportRef]);

	const isInImageBounds = useCallback((imgX: number, imgY: number) => {
		const { width, height } = imageSizeRef.current;
		return imgX >= 0 && imgY >= 0 && imgX <= width && imgY <= height;
	}, [imageSizeRef]);

	const clampToImageBounds = useCallback((imgX: number, imgY: number) => {
		const { width, height } = imageSizeRef.current;
		return {
			x: clamp(imgX, 0, width),
			y: clamp(imgY, 0, height),
		};
	}, []);

	const findLineIdAtPoint = useCallback((imgX: number, imgY: number) => {
		const threshold = CLICK_HIT_THRESHOLD / viewportRef.current.scale;
		let nearest: { id: number; distance: number } | null = null;

		for (const line of linesRef.current) {
			const distance = distancePointToSegment(
				imgX,
				imgY,
				line.start.x,
				line.start.y,
				line.end.x,
				line.end.y,
			);
			if (distance <= threshold && (!nearest || distance < nearest.distance)) {
				nearest = { id: line.id, distance };
			}
		}

		return nearest?.id ?? null;
	}, [viewportRef]);

	// -------------------------------------------------------------------
	// Mouse handlers
	// -------------------------------------------------------------------
	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const img = toImageCoords(e.clientX, e.clientY);
			if (!img) return;

			if (e.button === 2) {
				interactionRef.current = {
					phase: "panning",
					lastClientX: e.clientX,
					lastClientY: e.clientY,
				};
				if (canvasRef.current) {
					canvasRef.current.style.cursor = "grabbing";
				}
				return;
			}

			if (e.button !== 0 || !isInImageBounds(img.x, img.y)) {
				return;
			}

			interactionRef.current = {
				phase: "leftDown",
				startClientX: e.clientX,
				startClientY: e.clientY,
				startImgX: img.x,
				startImgY: img.y,
			};
		},
		[isInImageBounds, toImageCoords, canvasRef],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const interaction = interactionRef.current;

			if (interaction.phase === "leftDown") {
				const dx = e.clientX - interaction.startClientX;
				const dy = e.clientY - interaction.startClientY;
				if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
					interactionRef.current = {
						phase: "drawing",
						startImgX: interaction.startImgX,
						startImgY: interaction.startImgY,
					};
					draftLineRef.current = {
						startX: interaction.startImgX,
						startY: interaction.startImgY,
						endX: interaction.startImgX,
						endY: interaction.startImgY,
					};
					scheduleDraw();
				}
				return;
			}

			if (interaction.phase === "drawing") {
				const img = toImageCoords(e.clientX, e.clientY);
				if (!img || !draftLineRef.current) return;
				const clamped = clampToImageBounds(img.x, img.y);
				draftLineRef.current.endX = clamped.x;
				draftLineRef.current.endY = clamped.y;
				scheduleDraw();
				return;
			}

			if (interaction.phase === "panning") {
				const dx = e.clientX - interaction.lastClientX;
				const dy = e.clientY - interaction.lastClientY;
				viewportRef.current = {
					...viewportRef.current,
					originX: viewportRef.current.originX - dx / viewportRef.current.scale,
					originY: viewportRef.current.originY - dy / viewportRef.current.scale,
				};
				interactionRef.current = {
					phase: "panning",
					lastClientX: e.clientX,
					lastClientY: e.clientY,
				};
				scheduleDraw();
			}
		},
		[clampToImageBounds, scheduleDraw, toImageCoords, viewportRef],
	);

	const handleMouseUp = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const interaction = interactionRef.current;
			const img = toImageCoords(e.clientX, e.clientY);

			if (interaction.phase === "leftDown" && img) {
				const selectedLineId = isInImageBounds(img.x, img.y)
					? findLineIdAtPoint(img.x, img.y)
					: null;
				annotationSessionDispatch({
					type: "SELECT_SCALED_LINE_ID",
					payload: selectedLineId,
				});
			}

			if (interaction.phase === "drawing" && draftLineRef.current && data) {
				const { startX, startY, endX, endY } = draftLineRef.current;
				const lineLength = Math.hypot(endX - startX, endY - startY);
				if (lineLength >= MIN_LINE_LENGTH) {
					const nextLineId =
						linesRef.current.length > 0
							? Math.max(...linesRef.current.map((line) => line.id)) + 1
							: 0;

					projectDispatch({
						type: "ADD_SCALED_LINE",
						payload: {
							dataId: data.id,
							line: {
								id: -1,
								start: { x: startX, y: startY },
								end: { x: endX, y: endY },
								scale: 0,
								unit: DEFAULT_UNIT,
							},
						},
					});
					annotationSessionDispatch({
						type: "SELECT_SCALED_LINE_ID",
						payload: nextLineId,
					});
				}
			}

			interactionRef.current = { phase: "idle" };
			draftLineRef.current = null;
			if (canvasRef.current) {
				canvasRef.current.style.cursor = "crosshair";
			}
			scheduleDraw();
		},
		[
			data,
			projectDispatch,
			annotationSessionDispatch,
			findLineIdAtPoint,
			isInImageBounds,
			scheduleDraw,
			toImageCoords,
			canvasRef,
		],
	);

	const handleMouseLeave = useCallback(() => {
		interactionRef.current = { phase: "idle" };
		draftLineRef.current = null;
		if (canvasRef.current) {
			canvasRef.current.style.cursor = "crosshair";
		}
		scheduleDraw();
	}, [scheduleDraw, canvasRef]);

	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			e.preventDefault();
		},
		[],
	);

	// ==================================================================
	// Effects (scale-line-specific; image/viewport/zoom effects live in
	// the useCanvasImageDisplay hook)
	// ==================================================================

	// Clear selected line when it no longer exists in the data
	useEffect(() => {
		const selectedId = annotationSessionState.selectedScaledLineId;
		if (
			selectedId !== null &&
			!scaledLines.some((line) => line.id === selectedId)
		) {
			annotationSessionDispatch({
				type: "SELECT_SCALED_LINE_ID",
				payload: null,
			});
			return;
		}
		scheduleDraw();
	}, [
		annotationSessionState.selectedScaledLineId,
		annotationSessionDispatch,
		scheduleDraw,
		scaledLines,
	]);

	// Set initial cursor and ensure canvas ref is ready for the wheel
	// listener (managed by the hook)
	useEffect(() => {
		if (canvasRef.current) {
			canvasRef.current.style.cursor = "crosshair";
		}
	}, [canvasRef]);

	// -------------------------------------------------------------------
	// Render
	// -------------------------------------------------------------------
	return (
		<div
			ref={containerRef}
			style={{ position: "relative", flex: 1, overflow: "hidden" }}
		>
			<div
				className={styles.canvasContainer}
				style={{ backgroundColor: "var(--surface-surface-primary3)" }}
			>
				<canvas
					ref={canvasRef}
					className={styles.canvas}
					style={{ display: "block", cursor: "crosshair" }}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseLeave}
					onContextMenu={handleContextMenu}
				/>
			</div>
		</div>
	);
}
