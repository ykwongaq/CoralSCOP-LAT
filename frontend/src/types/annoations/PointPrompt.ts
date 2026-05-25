import type { Point } from "../Point";

export interface PointPrompt extends Point {
	type: "positive" | "negative";
}
