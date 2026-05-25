import type { Point, Color } from "../../../../types";
import { colorToHex } from "../../../../utils/color";
import {
	CORNER_COLORS,
	FINAL_CARD_SIZE,
	BOX_SIZE,
	CLASS_GRID_POSITIONS,
} from "./constants";

export function drawSourceImageWithCorners(
	canvas: HTMLCanvasElement,
	image: HTMLImageElement,
	corners: Point[],
	displayScale: { scaleX: number; scaleY: number },
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

	// Dynamic sizing based on image resolution (canvas dimensions)
	const refWidth = 512;
	const sizeScale = canvas.width / refWidth;
	const dotRadius = Math.max(3, 7 * sizeScale);
	const dotStrokeWidth = Math.max(1, 2 * sizeScale);
	const fontSize = Math.max(9, 8 * sizeScale);
	const lineWidth = Math.max(0.2, 0.1 * sizeScale);

	// Draw corner markers
	corners.forEach((corner, index) => {
		const scaledX = corner.x * displayScale.scaleX;
		const scaledY = corner.y * displayScale.scaleY;

		// Draw circle
		ctx.beginPath();
		ctx.arc(scaledX, scaledY, dotRadius, 0, 2 * Math.PI);
		ctx.fillStyle = CORNER_COLORS[index];
		ctx.fill();
		ctx.strokeStyle = "white";
		ctx.lineWidth = dotStrokeWidth;
		ctx.stroke();

		// Draw number
		ctx.fillStyle = "white";
		ctx.font = `bold ${fontSize}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText((index + 1).toString(), scaledX, scaledY);

		// Draw lines between points
		if (index > 0) {
			const prevCorner = corners[index - 1];
			const prevScaledX = prevCorner.x * displayScale.scaleX;
			const prevScaledY = prevCorner.y * displayScale.scaleY;
			ctx.beginPath();
			ctx.moveTo(prevScaledX, prevScaledY);
			ctx.lineTo(scaledX, scaledY);
			ctx.strokeStyle = CORNER_COLORS[index];
			ctx.lineWidth = lineWidth;
			ctx.stroke();
		}
	});

	// Close the polygon
	if (corners.length === 4) {
		const scaledX0 = corners[0].x * displayScale.scaleX;
		const scaledY0 = corners[0].y * displayScale.scaleY;
		const scaledX3 = corners[3].x * displayScale.scaleX;
		const scaledY3 = corners[3].y * displayScale.scaleY;
		ctx.beginPath();
		ctx.moveTo(scaledX3, scaledY3);
		ctx.lineTo(scaledX0, scaledY0);
		ctx.strokeStyle = CORNER_COLORS[3];
		ctx.lineWidth = lineWidth;
		ctx.stroke();
	}
}

export function drawDigitalCard(
	canvas: HTMLCanvasElement,
	sampledColors: Map<string, Color>,
	coralWatchImg: HTMLImageElement | null,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	canvas.width = FINAL_CARD_SIZE;
	canvas.height = FINAL_CARD_SIZE;

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, FINAL_CARD_SIZE, FINAL_CARD_SIZE);

	if (coralWatchImg) {
		// Crop the center 5/7 of the 512x512 source card image
		const cropX = 512 / 7;
		const cropY = 512 / 7;
		const cropWidth = (5 * 512) / 7;
		const cropHeight = (5 * 512) / 7;

		const destX = BOX_SIZE;
		const destY = BOX_SIZE;
		const destWidth = 5 * BOX_SIZE;
		const destHeight = 5 * BOX_SIZE;

		ctx.drawImage(
			coralWatchImg,
			cropX,
			cropY,
			cropWidth,
			cropHeight,
			destX,
			destY,
			destWidth,
			destHeight,
		);
	}

	const centerX = BOX_SIZE / 2;
	const centerY = BOX_SIZE / 2;

	for (const [label, pos] of Object.entries(CLASS_GRID_POSITIONS)) {
		const x = pos.col * BOX_SIZE;
		const y = pos.row * BOX_SIZE;

		const colorObj = sampledColors.get(label) ?? { r: 255, g: 255, b: 255 };
		const colorHex = colorToHex(colorObj);

		ctx.fillStyle = colorHex;
		ctx.fillRect(x, y, BOX_SIZE, BOX_SIZE);

		ctx.strokeStyle = "#333333";
		ctx.lineWidth = 2;
		ctx.strokeRect(x, y, BOX_SIZE, BOX_SIZE);

		ctx.fillStyle = "#000000";
		ctx.font = "bold 22px Arial";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, x + centerX, y + centerY);
	}
}
