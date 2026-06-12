import triggerDownload from "../utils/download";
import {
	calculatePixelScale,
	countRLEPixels,
	calculateEffectiveTotalPixels,
} from "./StatisticService";
import type { ProjectState } from "../types";

export type StatisticsExportFormat = "csv" | "excel";

interface StatisticsExportRow {
	"image name": string;
	label: string;
	"label id": number;
	status: string;
	"instance count": number;
	"pixel count": number;
	"number of image pixel": number;
	"number of excluded pixels": number;
	"% of area over included pixels": number;
	area: number | "N/A";
	unit: string;
}

const COLUMN_HEADERS: Array<keyof StatisticsExportRow> = [
	"image name",
	"label",
	"label id",
	"status",
	"instance count",
	"pixel count",
	"number of image pixel",
	"number of excluded pixels",
	"% of area over included pixels",
	"area",
	"unit",
];

function buildStatisticsRows(state: ProjectState): StatisticsExportRow[] {
	if (state.dataList.length === 0) {
		throw new Error("No images available. Load a project first.");
	}

	const labelMap = new Map(state.labels.map((label) => [label.id, label]));
	const rows: StatisticsExportRow[] = [];

	for (const data of state.dataList) {
		const pixelScale = calculatePixelScale(data.scaledLineList ?? []);
		const hasScale = pixelScale.squareMetersPerPixel > 0;
		const totalPixels = data.imageData.width * data.imageData.height;
		const effectiveTotalPixels = calculateEffectiveTotalPixels(
			data,
			state.excludedLabelIds,
		);
		const excludedPixels = totalPixels - effectiveTotalPixels;
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
			const label = labelMap.get(labelId);
			const areaPct =
				effectiveTotalPixels > 0
					? (stats.pixels / effectiveTotalPixels) * 100
					: 0;
			const area = hasScale
				? Number((stats.pixels * pixelScale.value).toFixed(4))
				: "N/A";

			rows.push({
				"image name": data.imageData.imageName,
				label: label?.name ?? `label_${labelId}`,
				"label id": labelId,
				status:
					(label?.status.length ?? 0) > 0 ? label!.status.join(", ") : "N/A",
				"instance count": stats.instanceCount,
				"pixel count": stats.pixels,
				"number of image pixel": totalPixels,
				"number of excluded pixels": excludedPixels,
				"% of area over included pixels": Number(areaPct.toFixed(2)),
				area,
				unit: hasScale ? pixelScale.unit : "N/A",
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

function buildCsvContent(rows: StatisticsExportRow[]): string {
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

function buildExcelContent(rows: StatisticsExportRow[]): string {
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
