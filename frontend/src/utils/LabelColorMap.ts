export type LabelColorMap = Record<number, string>;

export const DEFAULT_LABEL_COLOR_MAP: LabelColorMap = {
    0: "#F6C3CB",
    1: "#FFA500",
    2: "#225437",
    3: "#5F0F63",
    4: "#F7D941",
    5: "#2B00F7",
    6: "#73FBFE",
    7: "#EF7C76",
    8: "#9EFCD6",
    9: "#F2AA34",
    10: "#BADFE5",
    11: "#BED966",
    12: "#EB361C",
    13: "#CCE1FD",
    14: "#F188E9",
    15: "#6CFB45",
    16: "#7FCBAC",
    17: "#C9BFB6",
    18: "#163263",
    19: "#751608",
    20: "#54AFAA",
};

export const DEFAULT_TEXT_COLOR_MAP: LabelColorMap = {
    0: "#000",
    1: "#fff",
    2: "#fff",
    3: "#fff",
    4: "#000",
    5: "#fff",
    6: "#000",
    7: "#000",
    8: "#000",
    9: "#000",
    10: "#000",
    11: "#000",
    12: "#000",
    13: "#000",
    14: "#000",
    15: "#000",
    16: "#000",
    17: "#000",
    18: "#fff",
    19: "#fff",
    20: "#fff",
};

export const NO_LABEL_COLOR = "#FF0000";
export const NO_LABEL_TEXT_COLOR = "#FFFFFF";

export const PENDING_MASK_COLOR = "#1491ff";
export const SELECTED_MASK_COLOR = "#0000FF";

export function getLabelColor(
    labelId: number = -1,
    colorMap: LabelColorMap = DEFAULT_LABEL_COLOR_MAP,
): string {
    if (labelId < 0) {
        return NO_LABEL_COLOR;
    }
    return colorMap[labelId % Object.keys(colorMap).length];
}

export function getTextColor(
    labelId: number = -1,
    colorMap: LabelColorMap = DEFAULT_TEXT_COLOR_MAP,
): string {
    if (labelId < 0) {
        return NO_LABEL_TEXT_COLOR;
    }
    return colorMap[labelId % Object.keys(colorMap).length];
}

export function getPendingMaskColor(): string {
    return PENDING_MASK_COLOR;
}

export function getSelectedMaskColor(): string {
    return SELECTED_MASK_COLOR;
}

export function createLabelColorMap(colors: string[]): LabelColorMap {
    return Object.fromEntries(colors.map((color, index) => [index, color]));
}
