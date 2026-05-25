import type { Point } from "../Point";
import type Color from "../Color";

export interface ClassPoint {
	label: string;
	position: Point;
	color: Color;
}

export default interface CoralWatchCard {
	topLeft: Point;
	topRight: Point;
	bottomRight: Point;
	bottomLeft: Point;
	classPoints: ClassPoint[];
}
