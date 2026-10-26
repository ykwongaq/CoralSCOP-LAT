import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ResizableSideBar.module.css";

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 240;
const MAX_WIDTH = 800;
/** Dragging narrower than this closes the sidebar. */
const COLLAPSE_THRESHOLD = 140;
const KEYBOARD_STEP = 16;
const STORAGE_KEY = "coralscop.toolbar";

interface StoredState {
	width: number;
	collapsed: boolean;
}

function maxWidth() {
	return Math.min(MAX_WIDTH, Math.round(window.innerWidth * 0.6));
}

function clampWidth(width: number) {
	return Math.max(MIN_WIDTH, Math.min(maxWidth(), width));
}

function loadState(): StoredState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<StoredState>;
			return {
				width:
					typeof parsed.width === "number"
						? clampWidth(parsed.width)
						: DEFAULT_WIDTH,
				collapsed: parsed.collapsed === true,
			};
		}
	} catch {
		// Storage unavailable — fall back to defaults.
	}
	return { width: DEFAULT_WIDTH, collapsed: false };
}

function saveState(state: StoredState) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Ignore storage errors.
	}
}

interface ResizableSideBarProps {
	children: React.ReactNode;
}

/**
 * Wraps a tool sidebar with a draggable right edge and a collapse button.
 * Drag the edge to resize, drag it far left (or click the arrow) to close,
 * and double-click the edge to reset the width.
 */
export default function ResizableSideBar({ children }: ResizableSideBarProps) {
	const [{ width, collapsed }, setState] = useState<StoredState>(loadState);
	const [dragging, setDragging] = useState(false);
	const dragStart = useRef<{ x: number; width: number } | null>(null);

	// Persist whenever a change is committed (not on every drag frame).
	useEffect(() => {
		if (!dragging) saveState({ width, collapsed });
	}, [width, collapsed, dragging]);

	const toggle = useCallback(() => {
		setState((s) => ({ ...s, collapsed: !s.collapsed }));
	}, []);

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		dragStart.current = { x: e.clientX, width: collapsed ? 0 : width };
		setDragging(true);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const start = dragStart.current;
		if (!start) return;
		const next = start.width + (e.clientX - start.x);
		if (next < COLLAPSE_THRESHOLD) {
			setState((s) => ({ ...s, collapsed: true }));
		} else {
			setState({ width: clampWidth(next), collapsed: false });
		}
	};

	const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!dragStart.current) return;
		dragStart.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
		setDragging(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
			e.preventDefault();
			const delta = e.key === "ArrowLeft" ? -KEYBOARD_STEP : KEYBOARD_STEP;
			setState((s) =>
				s.collapsed
					? { ...s, collapsed: delta < 0 }
					: { width: clampWidth(s.width + delta), collapsed: false },
			);
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			toggle();
		}
	};

	// Keep the whole page showing the resize cursor while dragging.
	useEffect(() => {
		if (!dragging) return;
		const { cursor, userSelect } = document.body.style;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		return () => {
			document.body.style.cursor = cursor;
			document.body.style.userSelect = userSelect;
		};
	}, [dragging]);

	const className = [
		styles.sideBar,
		collapsed ? styles.collapsed : "",
		dragging ? styles.dragging : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={className} style={{ width: collapsed ? 0 : width }}>
			<div className={styles.clip} aria-hidden={collapsed}>
				<div className={styles.content} style={{ minWidth: MIN_WIDTH }}>
					{children}
				</div>
			</div>

			<div
				className={styles.handle}
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize toolbar"
				aria-valuenow={collapsed ? 0 : width}
				aria-valuemin={0}
				aria-valuemax={MAX_WIDTH}
				tabIndex={0}
				title="Drag to resize · double-click to reset"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
				onDoubleClick={() =>
					setState({ width: DEFAULT_WIDTH, collapsed: false })
				}
				onKeyDown={handleKeyDown}
			/>

			<button
				type="button"
				className={styles.toggle}
				onClick={toggle}
				onPointerDown={(e) => e.stopPropagation()}
				aria-label={collapsed ? "Open toolbar" : "Close toolbar"}
				aria-expanded={!collapsed}
				title={collapsed ? "Open toolbar" : "Close toolbar"}
			>
				<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
					<path
						d={collapsed ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"}
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>
		</div>
	);
}
