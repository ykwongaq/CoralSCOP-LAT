import triggerDownload from "../utils/download";
import {
	calculatePixelScale,
	countRLEPixels,
	calculateEffectiveTotalPixels,
} from "./StatisticService";
import type { ProjectState } from "../types";
import {
	TAXONOMIC_RANKS,
	type TaxonomicRank,
} from "../types/annoations/Taxonomy";

export type StatisticsExportFormat = "csv" | "excel";

type TaxonomyColumnHeader = `Taxonomy_${Capitalize<TaxonomicRank>}`;
type AreaUnit = "mm²" | "cm²" | "m²";

interface StatisticsExportRow {
	Unique_Image_name: string;
	Label: string;
	Label_ID: number;
	Status: string;
	"Instance count": number;
	"Pixel count": number;
	"Number of pixels per image": number;
	"Number of excluded pixels": number;
	"% coverage per label based on pixels": number;
	"Label area": number | "N/A";
	"Image Area": number | "N/A";
	"Excluded Area": number | "N/A";
	"Coverage per label based on area": number;
	Unit: string;
}

type StatisticsExportRowWithTaxonomy = StatisticsExportRow &
	Record<TaxonomyColumnHeader, string>;

function toTaxonomyColumnHeader(rank: TaxonomicRank): TaxonomyColumnHeader {
	return `Taxonomy_${rank[0].toUpperCase()}${rank.slice(1)}` as TaxonomyColumnHeader;
}

const TAXONOMY_COLUMN_HEADERS: TaxonomyColumnHeader[] = TAXONOMIC_RANKS.map(
	toTaxonomyColumnHeader,
);

const COLUMN_HEADERS: Array<keyof StatisticsExportRowWithTaxonomy> = [
	"Unique_Image_name",
	"Label",
	"Label_ID",
	"Status",
	"Instance count",
	"Pixel count",
	"Number of pixels per image",
	"Number of excluded pixels",
	"% coverage per label based on pixels",
	"Label area",
	"Image Area",
	"Excluded Area",
	"Coverage per label based on area",
	"Unit",
	...TAXONOMY_COLUMN_HEADERS,
];

function pickLargestScaledLineUnit(
	scaledLines: ProjectState["dataList"][number]["scaledLineList"] | undefined,
): "mm" | "cm" | "m" | null {
	if (!scaledLines || scaledLines.length === 0) {
		return null;
	}

	const priority: Record<"mm" | "cm" | "m", number> = {
		mm: 0,
		cm: 1,
		m: 2,
	};

	let selected: "mm" | "cm" | "m" | null = null;
	for (const line of scaledLines) {
		const pixelLength = Math.hypot(
			line.end.x - line.start.x,
			line.end.y - line.start.y,
		);
		if (
			!Number.isFinite(pixelLength) ||
			pixelLength <= 0 ||
			!Number.isFinite(line.scale) ||
			line.scale <= 0
		) {
			continue;
		}

		if (!selected || priority[line.unit] > priority[selected]) {
			selected = line.unit;
		}
	}

	return selected;
}

function areaUnitFromScaledLineUnit(unit: "mm" | "cm" | "m"): AreaUnit {
	if (unit === "m") return "m²";
	if (unit === "cm") return "cm²";
	return "mm²";
}

function areaUnitFactor(areaUnit: AreaUnit): number {
	if (areaUnit === "m²") return 1;
	if (areaUnit === "cm²") return 1e4;
	return 1e6;
}

function buildTaxonomyColumns(
	label: ProjectState["labels"][number] | undefined,
): Record<TaxonomyColumnHeader, string> {
	const taxonomyRanks = label?.taxonomy?.ranks;
	const taxonomyColumns = {} as Record<TaxonomyColumnHeader, string>;

	for (const rank of TAXONOMIC_RANKS) {
		const value = taxonomyRanks?.[rank]?.trim();
		taxonomyColumns[toTaxonomyColumnHeader(rank)] = value ? value : "N/A";
	}

	return taxonomyColumns;
}

function buildStatisticsRows(
	state: ProjectState,
): StatisticsExportRowWithTaxonomy[] {
	if (state.dataList.length === 0) {
		throw new Error("No images available. Load a project first.");
	}

	const labelMap = new Map(state.labels.map((label) => [label.id, label]));
	const excludedLabelIdSet = new Set(state.excludedLabelIds);
	const rows: StatisticsExportRowWithTaxonomy[] = [];

	for (const data of state.dataList) {
		const pixelScale = calculatePixelScale(data.scaledLineList ?? []);
		const hasScale = pixelScale.squareMetersPerPixel > 0;
		const preferredScaledLineUnit = pickLargestScaledLineUnit(
			data.scaledLineList ?? [],
		);
		const exportAreaUnit: AreaUnit | null = hasScale
			? preferredScaledLineUnit
				? areaUnitFromScaledLineUnit(preferredScaledLineUnit)
				: pixelScale.unit
			: null;
		const exportAreaFactor = exportAreaUnit
			? areaUnitFactor(exportAreaUnit)
			: 0;
		const totalPixels = data.imageData.width * data.imageData.height;
		const effectiveTotalPixels = calculateEffectiveTotalPixels(
			data,
			state.excludedLabelIds,
		);
		const excludedPixels = totalPixels - effectiveTotalPixels;
		const areaPerImage = hasScale
			? Number(
					(
						totalPixels *
						pixelScale.squareMetersPerPixel *
						exportAreaFactor
					).toFixed(4),
				)
			: "N/A";
		const areaExcludedPerImage = hasScale
			? Number(
					(
						excludedPixels *
						pixelScale.squareMetersPerPixel *
						exportAreaFactor
					).toFixed(4),
				)
			: "N/A";
		const byLabelId = new Map<
			number,
			{ pixels: number; instanceCount: number }
		>();

		for (const annotation of data.annotations) {
			const current = byLabelId.get(annotation.labelId) ?? {
				pixels: 0,
				instanceCount: 0,
			};
			current.pixels += countRLEPixels(annotation.segmentation);
			current.instanceCount += 1;
			byLabelId.set(annotation.labelId, current);
		}

		for (const [labelId, stats] of Array.from(byLabelId.entries()).sort(
			([leftId], [rightId]) => leftId - rightId,
		)) {
			if (excludedLabelIdSet.has(labelId)) {
				continue;
			}

			const label = labelMap.get(labelId);
			const pixelCoveragePct =
				effectiveTotalPixels > 0
					? (stats.pixels / effectiveTotalPixels) * 100
					: 0;
			const labelArea = hasScale
				? Number(
						(
							stats.pixels *
							pixelScale.squareMetersPerPixel *
							exportAreaFactor
						).toFixed(4),
					)
				: "N/A";
			const coverageBasedOnAreaPct = hasScale
				? areaPerImage === "N/A" || areaExcludedPerImage === "N/A"
					? 0
					: areaPerImage - areaExcludedPerImage > 0
						? Number(
								(
									(Number(labelArea) /
										(Number(areaPerImage) - Number(areaExcludedPerImage))) *
									100
								).toFixed(2),
							)
						: 0
				: Number(pixelCoveragePct.toFixed(2));

			rows.push({
				Unique_Image_name: data.imageData.imageName,
				Label: label?.name ?? `label_${labelId}`,
				Label_ID: labelId,
				Status:
					(label?.status.length ?? 0) > 0 ? label!.status.join(", ") : "N/A",
				"Instance count": stats.instanceCount,
				"Pixel count": stats.pixels,
				"Number of pixels per image": totalPixels,
				"Number of excluded pixels": excludedPixels,
				"% coverage per label based on pixels": Number(
					pixelCoveragePct.toFixed(2),
				),
				"Label area": labelArea,
				"Image Area": areaPerImage,
				"Excluded Area": areaExcludedPerImage,
				"Coverage per label based on area": coverageBasedOnAreaPct,
				Unit: hasScale && exportAreaUnit ? exportAreaUnit : "no calibration",
				...buildTaxonomyColumns(label),
			});
		}
	}

	return rows;
}

function escapeCsvValue(value: string | number): string {
	const stringValue = String(value);
	if (!/[",\r\n]/.test(stringValue)) {
		return stringValue;
	}
	return `"${stringValue.replace(/"/g, '""')}"`;
}

function buildCsvContent(rows: StatisticsExportRowWithTaxonomy[]): string {
	const headerLine = COLUMN_HEADERS.map(escapeCsvValue).join(",");
	const dataLines = rows.map((row) =>
		COLUMN_HEADERS.map((header) => escapeCsvValue(row[header])).join(","),
	);
	return [headerLine, ...dataLines].join("\r\n");
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function buildExcelContent(rows: StatisticsExportRowWithTaxonomy[]): string {
	const tableHead = COLUMN_HEADERS.map(
		(header) => `<th>${escapeHtml(header)}</th>`,
	).join("");
	const tableRows = rows
		.map(
			(row) =>
				`<tr>${COLUMN_HEADERS.map((header) => `<td>${escapeHtml(String(row[header]))}</td>`).join("")}</tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html>
	<head>
		<meta charset="UTF-8" />
		<style>
			table { border-collapse: collapse; font-family: Arial, sans-serif; }
			th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
			th { background: #f3f4f6; font-weight: 600; }
		</style>
	</head>
	<body>
		<table>
			<thead>
				<tr>${tableHead}</tr>
			</thead>
			<tbody>
				${tableRows}
			</tbody>
		</table>
	</body>
</html>`;
}

export async function exportProjectStatisticsSpreadsheet(
	state: ProjectState,
	format: StatisticsExportFormat,
): Promise<void> {
	const rows = buildStatisticsRows(state);
	const baseName = `${state.projectName || "project"}_statistics`;

	if (format === "csv") {
		const csvBlob = new Blob(["\ufeff", buildCsvContent(rows)], {
			type: "text/csv;charset=utf-8;",
		});
		triggerDownload(csvBlob, `${baseName}.csv`);
		return;
	}

	const excelBlob = new Blob(["\ufeff", buildExcelContent(rows)], {
		type: "application/vnd.ms-excel;charset=utf-8;",
	});
	triggerDownload(excelBlob, `${baseName}.xls`);
}
