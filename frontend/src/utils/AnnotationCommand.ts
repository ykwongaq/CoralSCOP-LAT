export type AnnotationCommand =
	// Shared (both modes)
	| "toggle-masks"
	| "toggle-labels"
	| "select-label-0"
	| "select-label-1"
	| "select-label-2"
	| "select-label-3"
	| "select-label-4"
	| "select-label-5"
	| "select-label-6"
	| "select-label-7"
	| "select-label-8"
	| "prev-image"
	| "next-image"
	// Select mode
	| "remove"
	| "switch-to-add"
	// Add mode
	| "clear-prompts"
	| "confirm-mask"
	| "switch-to-select";

// Normalise a KeyboardEvent into a lookup key, e.g. "ctrl+z", "tab", "r"
export function normalizeKey(e: KeyboardEvent): string {
	const mods = e.ctrlKey || e.metaKey ? "ctrl+" : "";
	return mods + e.key.toLowerCase();
}

const sharedCommands: Partial<Record<string, AnnotationCommand>> = {
	"1": "select-label-0",
	"2": "select-label-1",
	"3": "select-label-2",
	"4": "select-label-3",
	"5": "select-label-4",
	"6": "select-label-5",
	"7": "select-label-6",
	"8": "select-label-7",
	"9": "select-label-8",
	a: "prev-image",
	d: "next-image",
	c: "toggle-labels",
};

export const KEYMAP: Record<
	"select" | "add",
	Partial<Record<string, AnnotationCommand>>
> = {
	select: {
		tab: "toggle-masks",
		r: "remove",
		w: "switch-to-add",
		...sharedCommands,
	},
	add: {
		tab: "toggle-masks",
		" ": "confirm-mask",
		"ctrl+z": "clear-prompts",
		w: "switch-to-select",
		...sharedCommands,
	},
};
