import type { Color } from "../../../../types";
import { colorToHex } from "../../../../utils/color";
import { CORAL_WATCH_POINTS, OUTPUT_WIDTH, OUTPUT_HEIGHT } from "./constants";
import styles from "./CoralWatchPicker.module.css";

interface SampleOverlayProps {
	colors: Map<string, Color>;
	positions: Map<string, { x: number; y: number }>;
	draggingLabel: string | null;
	onDotMouseDown: (label: string, e: React.MouseEvent) => void;
}

export function SampleOverlay({
	colors,
	positions,
	draggingLabel,
	onDotMouseDown,
}: SampleOverlayProps) {
	return (
		<div className={styles.sampleOverlay}>
			{CORAL_WATCH_POINTS.map((pt) => {
				const pos = positions.get(pt.label) ?? pt;
				const colorObj = colors.get(pt.label) ?? { r: 255, g: 255, b: 255 };
				const colorHex = colorToHex(colorObj);
				const isDragging = draggingLabel === pt.label;
				return (
					<div
						key={pt.label}
						className={styles.sampleDot}
						style={
							{
								left: `${(pos.x / OUTPUT_WIDTH) * 100}%`,
								top: `${(pos.y / OUTPUT_HEIGHT) * 100}%`,
								backgroundColor: colorHex,
								"--dot-color": colorHex,
								cursor: isDragging ? "grabbing" : "grab",
							} as React.CSSProperties & Record<string, string>
						}
						onMouseDown={(e) => onDotMouseDown(pt.label, e)}
					>
						<span className={styles.dotTooltip}>{pt.label}</span>
					</div>
				);
			})}
		</div>
	);
}
