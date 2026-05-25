export interface GridPosition {
	row: number;
	col: number;
}

export interface SamplePoint {
	label: string;
	x: number;
	y: number;
}

export const CORNER_LABELS = [
	"1. Top-Left",
	"2. Top-Right",
	"3. Bottom-Right",
	"4. Bottom-Left",
];

export const CORNER_COLORS = ["#425df9", "#00dfd4", "#7a9ae3", "#002a67"];

export const FINAL_CARD_SIZE = 518;
export const BOX_SIZE = 74;

export const OUTPUT_WIDTH = 512;
export const OUTPUT_HEIGHT = 512;

export const CLASS_GRID_POSITIONS: Record<string, GridPosition> = {
	B1: { row: 0, col: 0 },
	B2: { row: 0, col: 1 },
	B3: { row: 0, col: 2 },
	B4: { row: 0, col: 3 },
	B5: { row: 0, col: 4 },
	B6: { row: 0, col: 5 },
	C1: { row: 0, col: 6 },
	C2: { row: 1, col: 6 },
	C3: { row: 2, col: 6 },
	C4: { row: 3, col: 6 },
	C5: { row: 4, col: 6 },
	C6: { row: 5, col: 6 },
	D1: { row: 6, col: 6 },
	D2: { row: 6, col: 5 },
	D3: { row: 6, col: 4 },
	D4: { row: 6, col: 3 },
	D5: { row: 6, col: 2 },
	D6: { row: 6, col: 1 },
	E1: { row: 6, col: 0 },
	E2: { row: 5, col: 0 },
	E3: { row: 4, col: 0 },
	E4: { row: 3, col: 0 },
	E5: { row: 2, col: 0 },
	E6: { row: 1, col: 0 },
};

export const CORAL_WATCH_POINTS: SamplePoint[] = [
	{ label: "B1", x: 35, y: 35 },
	{ label: "B2", x: 108, y: 35 },
	{ label: "B3", x: 183, y: 36 },
	{ label: "B4", x: 257, y: 36 },
	{ label: "B5", x: 331, y: 35 },
	{ label: "B6", x: 401, y: 35 },
	{ label: "C1", x: 473, y: 38 },
	{ label: "C2", x: 473, y: 109 },
	{ label: "C3", x: 472, y: 181 },
	{ label: "C4", x: 473, y: 255 },
	{ label: "C5", x: 475, y: 325 },
	{ label: "C6", x: 474, y: 401 },
	{ label: "D1", x: 472, y: 473 },
	{ label: "D2", x: 400, y: 476 },
	{ label: "D3", x: 327, y: 473 },
	{ label: "D4", x: 249, y: 471 },
	{ label: "D5", x: 182, y: 474 },
	{ label: "D6", x: 107, y: 472 },
	{ label: "E1", x: 35, y: 475 },
	{ label: "E2", x: 35, y: 398 },
	{ label: "E3", x: 35, y: 324 },
	{ label: "E4", x: 36, y: 254 },
	{ label: "E5", x: 33, y: 177 },
	{ label: "E6", x: 42, y: 110 },
];
