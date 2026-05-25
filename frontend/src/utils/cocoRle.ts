import type { RLE } from "../types/RLE";

// ---------------------------------------------------------------------------
// Inline Web Worker source — runs decoding off the main thread.
// Must be self-contained (no imports).
// ---------------------------------------------------------------------------
const WORKER_SOURCE = `
function decodeOne(rle) {
    const [height, width] = rle.size;
    const counts = rle.counts;   // number[]
    const total  = height * width;

    // Step 1: fill a column-major buffer using SIMD-optimised TypedArray.fill().
    // COCO RLE is already in column-major (Fortran) order, so each run maps to
    // a contiguous slice — no per-pixel index arithmetic needed here.
    const col = new Uint8Array(total); // zero-initialised = background
    let pos = 0;
    for (let i = 0; i < counts.length; i++) {
        const cnt = counts[i];
        if (i & 1 && cnt > 0) col.fill(1, pos, pos + cnt);
        pos += cnt;
    }

    // Step 2: tiled transpose col-major → row-major.
    // Inner loop writes are sequential (row * width + c, c++) = 1 cache line
    // per row-slice.  Tile size 64 keeps both tiles in L1/L2 cache.
    const row = new Uint8Array(total);
    const T = 64;
    for (let r0 = 0; r0 < height; r0 += T) {
        const rEnd = Math.min(r0 + T, height);
        for (let c0 = 0; c0 < width; c0 += T) {
            const cEnd = Math.min(c0 + T, width);
            for (let r = r0; r < rEnd; r++) {
                const rw = r * width;
                for (let c = c0; c < cEnd; c++) {
                    row[rw + c] = col[c * height + r];
                }
            }
        }
    }
    return row;
}

self.onmessage = function(e) {
    const { rles, startIdx } = e.data;
    const decoded = rles.map(decodeOne);
    // Transfer ownership of the underlying ArrayBuffers to avoid copying.
    self.postMessage({ decoded, startIdx }, decoded.map(d => d.buffer));
};
`;

// Lazily create a single blob URL for the worker so it is reused across calls.
// Configurable number of threads for parallel decoding.
export const numThreads: number = 8;

let _workerUrl: string | null = null;

function getWorkerUrl(): string {
	if (_workerUrl === null) {
		const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
		_workerUrl = URL.createObjectURL(blob);
	}
	return _workerUrl;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Decode a single COCO uncompressed RLE (counts as number[]) on the main thread.
 *
 * Two-phase algorithm for maximum throughput:
 *   1. Fill a column-major Uint8Array with TypedArray.fill() — SIMD-optimised,
 *      no per-pixel index arithmetic.
 *   2. Tiled 64×64 transpose to row-major — sequential writes keep the CPU's
 *      write buffer hot; tile size fits in L1/L2 cache.
 *
 * This avoids the strided writes (stride = image width) of a naïve approach,
 * which cause a cache miss on every foreground pixel for images wider than
 * ~64 pixels.
 *
 * Returns a row-major Uint8Array: 0 = background, 1 = foreground.
 * Index formula: row * width + col.
 */
export function decodeRLE(rle: RLE): Uint8Array {
	const [height, width] = rle.size;
	const counts = rle.counts as number[];
	const total = height * width;

	const col = new Uint8Array(total);
	let pos = 0;
	for (let i = 0; i < counts.length; i++) {
		const cnt = counts[i];
		if (i & 1 && cnt > 0) col.fill(1, pos, pos + cnt);
		pos += cnt;
	}

	const row = new Uint8Array(total);
	const T = 64;
	for (let r0 = 0; r0 < height; r0 += T) {
		const rEnd = Math.min(r0 + T, height);
		for (let c0 = 0; c0 < width; c0 += T) {
			const cEnd = Math.min(c0 + T, width);
			for (let r = r0; r < rEnd; r++) {
				const rw = r * width;
				for (let c = c0; c < cEnd; c++) {
					row[rw + c] = col[c * height + r];
				}
			}
		}
	}

	return row;
}

/**
 * Decode a batch of COCO uncompressed RLE masks (counts as number[]) in parallel.
 *
 * Work is split evenly across up to numThreads Web Workers,
 * so all CPU cores decode concurrently. ArrayBuffers are transferred (not
 * copied) back from workers to eliminate serialisation overhead.
 *
 * Falls back to the synchronous decodeRleLocally path for a single mask to
 * avoid worker-spawn latency.
 *
 * Returns one row-major Uint8Array per input RLE, in the same order as input.
 * Each byte is 0 (background) or 1 (foreground): index = row * width + col.
 */
export async function decodeRleMasks(rles: RLE[]): Promise<Uint8Array[]> {
	if (rles.length === 0) return [];
	if (rles.length === 1) return [decodeRLE(rles[0])];

	const numWorkers = Math.min(rles.length, numThreads);
	const chunkSize = Math.ceil(rles.length / numWorkers);
	const url = getWorkerUrl();

	const results = new Array<Uint8Array>(rles.length);

	await Promise.all(
		Array.from({ length: numWorkers }, (_, w) => {
			const start = w * chunkSize;
			const chunk = rles.slice(start, start + chunkSize);
			if (chunk.length === 0) return Promise.resolve();

			return new Promise<void>((resolve, reject) => {
				const worker = new Worker(url);
				worker.onmessage = (e: MessageEvent) => {
					const { decoded, startIdx } = e.data as {
						decoded: Uint8Array[];
						startIdx: number;
					};
					for (let k = 0; k < decoded.length; k++) {
						results[startIdx + k] = decoded[k];
					}
					worker.terminate();
					resolve();
				};
				worker.onerror = (err) => {
					worker.terminate();
					reject(err);
				};
				worker.postMessage({ rles: chunk, startIdx: start });
			});
		}),
	);

	return results;
}
