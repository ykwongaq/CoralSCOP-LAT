import type { Label, LabelType, TaxonomicRank, Taxonomy } from "../types";
import { TAXONOMIC_RANKS } from "../types";
import { taxonomyDisplayName } from "../utils/taxonomy";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStatuses(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const item of raw) {
		if (typeof item !== "string") continue;
		const status = item.trim();
		if (!status || seen.has(status)) continue;
		seen.add(status);
		normalized.push(status);
	}

	return normalized;
}

function parseTaxonomy(raw: unknown): Taxonomy | undefined {
	if (!isObject(raw) || !isObject(raw.ranks)) return undefined;

	const ranks = {} as Record<TaxonomicRank, string>;
	for (const rank of TAXONOMIC_RANKS) {
		const value = raw.ranks[rank];
		ranks[rank] = typeof value === "string" ? value.trim() : "";
	}

	const maybeGbifKey = raw.gbifKey;
	const gbifKey =
		typeof maybeGbifKey === "number" && Number.isFinite(maybeGbifKey)
			? maybeGbifKey
			: undefined;

	return {
		ranks,
		...(gbifKey !== undefined ? { gbifKey } : {}),
	};
}

function parseLabelType(rawType: unknown, hasTaxonomy: boolean): LabelType {
	if (rawType === "simple" || rawType === "taxonomic") return rawType;
	return hasTaxonomy ? "taxonomic" : "simple";
}

function normalizeImportedLabel(item: unknown, index: number): Label | null {
	if (!isObject(item)) return null;

	const taxonomy = parseTaxonomy(item.taxonomy);
	const type = parseLabelType(item.type, Boolean(taxonomy));
	const status = normalizeStatuses(item.status);

	const rawName = typeof item.name === "string" ? item.name.trim() : "";
	const name = rawName || (taxonomy ? taxonomyDisplayName(taxonomy) : "");
	if (!name) return null;

	return {
		id: index,
		name,
		status,
		type,
		...(taxonomy ? { taxonomy } : {}),
	};
}

/**
 * Parse a label JSON file into normalized labels used by import UI.
 *
 * Backward compatible with old exports that only have id/name/status, while
 * preserving type/taxonomy data from newer exports.
 */
export function parseImportedLabels(jsonText: string): Label[] {
	const parsed: unknown = JSON.parse(jsonText);
	if (!Array.isArray(parsed)) {
		throw new Error("The JSON file must contain an array of labels.");
	}

	const labels = parsed
		.map((item, index) => normalizeImportedLabel(item, index))
		.filter((label): label is Label => label !== null);

	if (labels.length === 0) {
		throw new Error("No valid labels found in the file.");
	}

	return labels;
}

export function toImportedLabelPayload(
	labels: Label[],
): Array<Omit<Label, "id">> {
	return labels.map(({ id: _id, ...rest }) => rest);
}
