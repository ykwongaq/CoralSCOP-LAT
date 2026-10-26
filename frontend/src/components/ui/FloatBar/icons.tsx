/* Inline SVG icons for actions the icon font doesn't cover.
   They use currentColor so they match the surrounding text color. */

const svgProps = {
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.6,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	"aria-hidden": true,
};

export function TagIcon() {
	return (
		<svg {...svgProps}>
			<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.2 7.2a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1-.3-.7z" />
			<circle cx="8.2" cy="8.2" r="1.4" />
		</svg>
	);
}

export function RunModelIcon() {
	return (
		<svg {...svgProps}>
			<circle cx="12" cy="12" r="9" />
			<path d="M10 8.5v7l5.5-3.5z" />
		</svg>
	);
}
