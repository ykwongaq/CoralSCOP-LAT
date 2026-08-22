import { useEffect } from "react";
import type { AnnotationCommand } from "../utils";
import { normalizeKey, KEYMAP } from "../utils";

/**
 * Thin bridge: listens for keydown events, looks up the current mode's KEYMAP,
 * and calls execute() with the matching command.
 *
 * All actual logic lives in the command map defined in AnnotationPanel —
 * this hook only handles the key → command translation.
 */
export function useAnnotationKeyboard(
	mode: "select" | "add" | "edit",
	execute: (cmd: AnnotationCommand) => void,
) {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			// Skip when the user is typing in an input field or contentEditable element
			const target = e.target as HTMLElement;
			const tag = target.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable)
				return;

			const key = normalizeKey(e);
			const cmd = KEYMAP[mode][key];
			if (!cmd) return;

			e.preventDefault();
			execute(cmd);
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [mode, execute]);
}
