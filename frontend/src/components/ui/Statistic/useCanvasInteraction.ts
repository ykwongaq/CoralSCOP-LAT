import { useCallback, useRef, useEffect } from "react";

interface Viewport {
	scale: number;
	offsetX: number;
	offsetY: number;
}

export function useCanvasInteraction(
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	viewportRef: React.MutableRefObject<Viewport>,
	requestDraw: () => void,
) {
	const isRightMouseDownRef = useRef(false);
	const lastMousePosRef = useRef({ x: 0, y: 0 });

	const handleWheel = useCallback(
		(e: WheelEvent) => {
			e.preventDefault();
			const { scale, offsetX, offsetY } = viewportRef.current;

			const zoom = e.deltaY < 0 ? 1.1 : 0.9;
			const newScale = Math.max(0.1, Math.min(10, scale * zoom));

			viewportRef.current = {
				scale: newScale,
				offsetX,
				offsetY,
			};

			requestDraw();
		},
		[viewportRef, requestDraw],
	);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (e.button === 2) {
				isRightMouseDownRef.current = true;
				lastMousePosRef.current = { x: e.clientX, y: e.clientY };
			}
		},
		[],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			if (!isRightMouseDownRef.current) return;

			const dx = e.clientX - lastMousePosRef.current.x;
			const dy = e.clientY - lastMousePosRef.current.y;

			const { scale, offsetX, offsetY } = viewportRef.current;
			viewportRef.current = {
				scale,
				offsetX: offsetX + dx / scale,
				offsetY: offsetY + dy / scale,
			};

			lastMousePosRef.current = { x: e.clientX, y: e.clientY };
			requestDraw();
		},
		[viewportRef, requestDraw],
	);

	const handleMouseUp = useCallback(() => {
		isRightMouseDownRef.current = false;
	}, []);

	const handleMouseLeave = useCallback(() => {
		isRightMouseDownRef.current = false;
	}, []);

	// Attach wheel listener
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		canvas.addEventListener("wheel", handleWheel, { passive: false });
		return () => canvas.removeEventListener("wheel", handleWheel);
	}, [handleWheel, canvasRef]);

	// Attach document-level mouse listeners
	useEffect(() => {
		document.addEventListener("mouseup", handleMouseUp);
		document.addEventListener("mouseleave", handleMouseLeave);
		return () => {
			document.removeEventListener("mouseup", handleMouseUp);
			document.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [handleMouseUp, handleMouseLeave]);

	return {
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleMouseLeave,
	};
}
