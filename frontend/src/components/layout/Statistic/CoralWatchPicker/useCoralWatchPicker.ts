import { useState, useRef, useEffect, useCallback } from "react";
import type { RefObject } from "react";
import CoralWatchCardImage from "../../../../assets/coralwatch.png";
import type { Data, CoralWatchCard, Point, Color } from "../../../../types";
import { perspectiveWarpImage } from "./transforms";
import { drawSourceImageWithCorners, drawDigitalCard } from "./canvas-drawing";
import { CORAL_WATCH_POINTS, OUTPUT_WIDTH, OUTPUT_HEIGHT } from "./constants";

export interface UseCoralWatchPickerReturn {
	corners: Point[];
	showPreview: boolean;
	sampledColors: Map<string, Color>;
	pointPositions: Map<string, Point>;
	draggingLabel: string | null;
	sourceCanvasRef: RefObject<HTMLCanvasElement | null>;
	previewCanvasRef: RefObject<HTMLCanvasElement | null>;
	digitalCardCanvasRef: RefObject<HTMLCanvasElement | null>;
	sourceCanvasWrapperRef: RefObject<HTMLDivElement | null>;
	previewWrapRef: RefObject<HTMLDivElement | null>;
	handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	handleDotMouseDown: (label: string, e: React.MouseEvent) => void;
	handlePreviewMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
	handleConfirm: () => void;
	handleReset: () => void;
}

export function useCoralWatchPicker(
	data: Data,
	initialCard: CoralWatchCard | undefined,
	onConfirm: (card: CoralWatchCard | null) => void,
): UseCoralWatchPickerReturn {
	const [corners, setCorners] = useState<Point[]>([]);
	const [showPreview, setShowPreview] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [sampledColors, setSampledColors] = useState<Map<string, Color>>(
		new Map(),
	);
	const [pointPositions, setPointPositions] = useState<Map<string, Point>>(
		new Map(),
	);
	const [draggingLabel, setDraggingLabel] = useState<string | null>(null);

	const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
	const previewCanvasRef = useRef<HTMLCanvasElement>(null);
	const digitalCardCanvasRef = useRef<HTMLCanvasElement>(null);
	const sourceCanvasWrapperRef = useRef<HTMLDivElement>(null);
	const previewWrapRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const coralWatchImageRef = useRef<HTMLImageElement | null>(null);
	const displayScaleRef = useRef<{ scaleX: number; scaleY: number }>({
		scaleX: 1,
		scaleY: 1,
	});
	const originalImageDimensionsRef = useRef<{ width: number; height: number }>({
		width: 0,
		height: 0,
	});

	const drawSourceCanvas = useCallback(() => {
		const canvas = sourceCanvasRef.current;
		const image = imageRef.current;
		if (!canvas || !image) return;

		drawSourceImageWithCorners(canvas, image, corners, displayScaleRef.current);
	}, [corners]);

	// Load images
	useEffect(() => {
		const image = new Image();
		image.onload = () => {
			imageRef.current = image;
			originalImageDimensionsRef.current = {
				width: image.width,
				height: image.height,
			};
			setImageLoaded(true);
		};
		image.src = data.imageData.imageUrl;
	}, [data.imageData.imageUrl]);

	// Resize canvas to fill container while maintaining aspect ratio
	useEffect(() => {
		if (
			!imageLoaded ||
			!sourceCanvasRef.current ||
			!sourceCanvasWrapperRef.current
		) {
			return;
		}

		const resizeCanvas = () => {
			const wrapper = sourceCanvasWrapperRef.current;
			const canvas = sourceCanvasRef.current;
			if (!wrapper || !canvas) return;

			const { width: imgWidth, height: imgHeight } =
				originalImageDimensionsRef.current;
			if (imgWidth === 0 || imgHeight === 0) return;

			const wrapperWidth = wrapper.clientWidth;
			const wrapperHeight = wrapper.clientHeight;

			// Calculate scale to fit image in wrapper while maintaining aspect ratio
			const scaleX = wrapperWidth / imgWidth;
			const scaleY = wrapperHeight / imgHeight;
			const scale = Math.min(scaleX, scaleY);

			// Set canvas dimensions
			canvas.width = Math.round(imgWidth * scale);
			canvas.height = Math.round(imgHeight * scale);

			displayScaleRef.current = { scaleX: scale, scaleY: scale };
		};

		resizeCanvas();

		// Set up resize observer
		const observer = new ResizeObserver(() => {
			resizeCanvas();
			drawSourceCanvas();
		});

		observer.observe(sourceCanvasWrapperRef.current);

		return () => {
			observer.disconnect();
		};
	}, [imageLoaded, drawSourceCanvas]);

	useEffect(() => {
		const coralWatchImg = new Image();
		coralWatchImg.onload = () => {
			coralWatchImageRef.current = coralWatchImg;
		};
		coralWatchImg.src = CoralWatchCardImage;
	}, []);

	// Clear corners when image URL changes
	useEffect(() => {
		setCorners([]);
		setShowPreview(false);
		setSampledColors(new Map());
		setPointPositions(new Map());
		setDraggingLabel(null);
	}, [data.imageData.imageUrl]);

	// Initialize with saved card if provided
	useEffect(() => {
		if (initialCard) {
			setCorners([
				initialCard.topLeft,
				initialCard.topRight,
				initialCard.bottomRight,
				initialCard.bottomLeft,
			]);

			const colors = new Map<string, Color>();
			const positions = new Map<string, Point>();
			for (const cp of initialCard.classPoints) {
				colors.set(cp.label, cp.color);
				positions.set(cp.label, cp.position);
			}
			setSampledColors(colors);
			setPointPositions(positions);
			setShowPreview(true);
		}
	}, [initialCard]);

	// Initialize point positions from CORAL_WATCH_POINTS when corners change
	useEffect(() => {
		if (corners.length === 4 && !initialCard) {
			const initialPositions = new Map<string, Point>();
			for (const pt of CORAL_WATCH_POINTS) {
				initialPositions.set(pt.label, { x: pt.x, y: pt.y });
			}
			setPointPositions(initialPositions);
		}
	}, [corners.length, initialCard]);

	// Global mouseup handler to stop dragging
	useEffect(() => {
		const handleMouseUp = () => {
			setDraggingLabel(null);
		};

		if (draggingLabel) {
			window.addEventListener("mouseup", handleMouseUp);
			return () => {
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [draggingLabel]);

	// Redraw when corners or image change
	useEffect(() => {
		drawSourceCanvas();
	}, [corners, drawSourceCanvas, imageLoaded]);

	// Run perspective transform when all 4 corners are set
	useEffect(() => {
		if (corners.length !== 4) return;

		const previewCanvas = previewCanvasRef.current;
		if (!previewCanvas) return;

		const image = imageRef.current;
		if (!image) return;

		try {
			const { imageData, colors } = perspectiveWarpImage(image, corners);

			const ctx = previewCanvas.getContext("2d");
			if (!ctx) return;
			previewCanvas.width = OUTPUT_WIDTH;
			previewCanvas.height = OUTPUT_HEIGHT;
			ctx.putImageData(imageData, 0, 0);

			setSampledColors(colors);
			setShowPreview(true);
		} catch (error) {
			console.error("Error in perspective warp:", error);
		}
	}, [corners]);

	// Draw final card with cropped center and color boxes
	useEffect(() => {
		if (sampledColors.size === 0) return;

		const canvas = digitalCardCanvasRef.current;
		if (!canvas) return;

		drawDigitalCard(canvas, sampledColors, coralWatchImageRef.current);
	}, [sampledColors]);

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (corners.length >= 4 || !imageRef.current) return;

		const canvas = sourceCanvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
		const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

		const originalX = canvasX / displayScaleRef.current.scaleX;
		const originalY = canvasY / displayScaleRef.current.scaleY;

		setCorners([...corners, { x: originalX, y: originalY }]);
	};

	const handleDotMouseDown = (label: string, e: React.MouseEvent) => {
		e.preventDefault();
		setDraggingLabel(label);
	};

	const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!draggingLabel || !previewWrapRef.current) return;

		const rect = previewWrapRef.current.getBoundingClientRect();
		const x = Math.max(
			0,
			Math.min(
				(((e.clientX - rect.left) / rect.width) * OUTPUT_WIDTH) | 0,
				OUTPUT_WIDTH - 1,
			),
		);
		const y = Math.max(
			0,
			Math.min(
				(((e.clientY - rect.top) / rect.height) * OUTPUT_HEIGHT) | 0,
				OUTPUT_HEIGHT - 1,
			),
		);

		// Update point position
		const newPositions = new Map(pointPositions);
		newPositions.set(draggingLabel, { x, y });
		setPointPositions(newPositions);

		// Sample color from preview canvas
		const previewCanvas = previewCanvasRef.current;
		if (previewCanvas) {
			const ctx = previewCanvas.getContext("2d");
			if (ctx) {
				const imageData = ctx.getImageData(x, y, 1, 1);
				const r = imageData.data[0];
				const g = imageData.data[1];
				const b = imageData.data[2];
				const a = imageData.data[3];

				const newColors = new Map(sampledColors);
				newColors.set(draggingLabel, { r, g, b, a });
				setSampledColors(newColors);
			}
		}
	};

	const handleConfirm = () => {
		if (corners.length === 0) {
			onConfirm(null);
			return;
		}

		if (corners.length !== 4) return;
		const [topLeft, topRight, bottomRight, bottomLeft] = corners;

		const classPoints = CORAL_WATCH_POINTS.map((pt) => ({
			label: pt.label,
			position: pointPositions.get(pt.label) ?? pt,
			color: sampledColors.get(pt.label) ?? { r: 255, g: 255, b: 255, a: 255 },
		}));

		onConfirm({
			topLeft,
			topRight,
			bottomRight,
			bottomLeft,
			classPoints,
		});
	};

	const handleReset = () => {
		setCorners([]);
		setShowPreview(false);
		setSampledColors(new Map());
		setPointPositions(new Map());
		setDraggingLabel(null);
	};

	return {
		corners,
		showPreview,
		sampledColors,
		pointPositions,
		draggingLabel,
		sourceCanvasRef,
		previewCanvasRef,
		digitalCardCanvasRef,
		sourceCanvasWrapperRef,
		previewWrapRef,
		handleCanvasClick,
		handleDotMouseDown,
		handlePreviewMouseMove,
		handleConfirm,
		handleReset,
	};
}
