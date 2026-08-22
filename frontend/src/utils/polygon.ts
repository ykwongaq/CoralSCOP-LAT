import type { Point } from "../types";

// ---------------------------------------------------------------------------
// Mask → editable polygon
//
// Extracts the outer contour of a binary mask (row-major Uint8Array) using
// Moore-neighbor tracing, then simplifies it with Ramer–Douglas–Peucker.
// Only the component containing the top-leftmost foreground pixel is traced;
// holes and additional components are ignored for now.
// ---------------------------------------------------------------------------

// 8-neighbour directions in clockwise order (screen coords: +y points down).
const DIRS: ReadonlyArray<readonly [number, number]> = [
	[1, 0], // 0 E
	[1, 1], // 1 SE
	[0, 1], // 2 S
	[-1, 1], // 3 SW
	[-1, 0], // 4 W
	[-1, -1], // 5 NW
	[0, -1], // 6 N
	[1, -1], // 7 NE
];

function findTopLeftForeground(
	mask: Uint8Array,
	width: number,
	height: number,
): { x: number; y: number } | null {
	for (let y = 0; y < height; y++) {
		const row = y * width;
		for (let x = 0; x < width; x++) {
			if (mask[row + x]) return { x, y };
		}
	}
	return null;
}

/**
 * Trace the outer boundary of the foreground component containing
 * (startX, startY). Returns an ordered, closed list of pixel coordinates.
 */
function traceOutline(
	mask: Uint8Array,
	width: number,
	height: number,
	startX: number,
	startY: number,
): Array<[number, number]> {
	const boundary: Array<[number, number]> = [];
	let x = startX;
	let y = startY;
	// The start pixel is the top-leftmost foreground pixel, so its west
	// neighbour is guaranteed background — begin scanning from there.
	let entry = 4; // index of W in DIRS

	const maxIter = (width + 1) * (height + 1) * 4;
	for (let i = 0; i < maxIter; i++) {
		boundary.push([x, y]);

		let found = -1;
		for (let k = 1; k <= 8; k++) {
			const d = (entry + k) % 8;
			const nx = x + DIRS[d][0];
			const ny = y + DIRS[d][1];
			if (
				nx >= 0 &&
				nx < width &&
				ny >= 0 &&
				ny < height &&
				mask[ny * width + nx]
			) {
				found = d;
				break;
			}
		}
		if (found === -1) break; // isolated pixel

		x += DIRS[found][0];
		y += DIRS[found][1];
		entry = (found + 4) % 8; // we entered the new pixel from the opposite direction

		// One full boundary loop is complete once we re-enter the start pixel.
		if (x === startX && y === startY) break;
	}
	return boundary;
}

function perpendicularDistance(
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number,
): number {
	const dx = bx - ax;
	const dy = by - ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(px - ax, py - ay);
	const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function rdpMark(
	points: Array<[number, number]>,
	first: number,
	last: number,
	epsilon: number,
	keep: Uint8Array,
): void {
	if (last <= first + 1) return;
	const [ax, ay] = points[first];
	const [bx, by] = points[last];

	let maxDist = -1;
	let index = -1;
	for (let i = first + 1; i < last; i++) {
		const [px, py] = points[i];
		const dist = perpendicularDistance(px, py, ax, ay, bx, by);
		if (dist > maxDist) {
			maxDist = dist;
			index = i;
		}
	}
	if (maxDist > epsilon) {
		keep[index] = 1;
		rdpMark(points, first, index, epsilon, keep);
		rdpMark(points, index, last, epsilon, keep);
	}
}

function simplifyRDP(
	points: Array<[number, number]>,
	epsilon: number,
): Array<[number, number]> {
	const n = points.length;
	if (n <= 2) return points.slice();
	const keep = new Uint8Array(n);
	keep[0] = 1;
	keep[n - 1] = 1;
	rdpMark(points, 0, n - 1, epsilon, keep);

	const out: Array<[number, number]> = [];
	for (let i = 0; i < n; i++) {
		if (keep[i]) out.push(points[i]);
	}
	return out;
}

/**
 * Convert a binary mask into an editable polygon.
 *
 * @param mask     Row-major Uint8Array (1 = foreground), e.g. from decodeRLE.
 * @param width    Mask width in pixels.
 * @param height   Mask height in pixels.
 * @param epsilon  RDP simplification tolerance in pixels (default 1).
 * @param maxVertices  Cap on output vertices; epsilon is increased until the
 *                     result fits, keeping rendering/hit-testing fast.
 * @returns Polygon vertices in image pixel coordinates ([] if the mask has
 *          fewer than 3 boundary pixels).
 */
export function extractPolygonFromMask(
	mask: Uint8Array,
	width: number,
	height: number,
	epsilon = 1,
	maxVertices = 512,
): Point[] {
	const start = findTopLeftForeground(mask, width, height);
	if (!start) return [];

	const trace = traceOutline(mask, width, height, start.x, start.y);
	if (trace.length < 3) return [];

	let eps = epsilon;
	let simplified = simplifyRDP(trace, eps);
	while (simplified.length > maxVertices && eps < 64) {
		eps *= 1.5;
		simplified = simplifyRDP(trace, eps);
	}

	return simplified.map(([x, y]) => ({ x, y }));
}
