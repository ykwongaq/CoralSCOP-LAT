import type Color from "../types/Color";

/**
 * Convert a CSS hex color string to an RGB tuple.
 * Returns [0, 0, 0] for invalid input.
 */
export function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];
    return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
    ];
}

/**
 * Convert a Color object to a CSS hex string.
 */
export function colorToHex(color: Color): string {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}
