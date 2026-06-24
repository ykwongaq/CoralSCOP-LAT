import {
	TAXONOMIC_RANKS,
	type TaxonomicRank,
	type Taxonomy,
} from "../types/annoations/Taxonomy";
import type { Label } from "../types/annoations/Label";
import type { CocoTaxonomy } from "../types/projectCreation/CocoCategory";

/** A taxonomy with every rank empty. */
export function emptyTaxonomy(): Taxonomy {
	return {
		ranks: {
			kingdom: "",
			phylum: "",
			class: "",
			order: "",
			family: "",
			genus: "",
			species: "",
		},
	};
}

/** Deepest rank with a non-empty value, or null when nothing is specified. */
export function deepestSpecifiedRank(t: Taxonomy): TaxonomicRank | null {
	let deepest: TaxonomicRank | null = null;
	for (const rank of TAXONOMIC_RANKS) {
		if (t.ranks[rank]?.trim()) deepest = rank;
	}
	return deepest;
}

/** Display name for a taxonomic label: the deepest specified rank's value. */
export function taxonomyDisplayName(t: Taxonomy): string {
	const rank = deepestSpecifiedRank(t);
	return rank ? t.ranks[rank].trim() : "Unnamed";
}

/**
 * Preferred display name for a label.
 *
 * If taxonomy exists and has a confirmed deepest rank, use that value even if
 * the label type was switched to common/simple. Otherwise, fall back to the
 * stored label name.
 */
export function resolveLabelDisplayName(label: Label): string {
	if (label.taxonomy) {
		const taxonomyName = taxonomyDisplayName(label.taxonomy).trim();
		if (taxonomyName && taxonomyName !== "Unnamed") {
			return taxonomyName;
		}
	}

	return label.name;
}

/** True when `rank` is deeper than the deepest specified rank (uncertain). */
export function isRankUncertain(rank: TaxonomicRank, t: Taxonomy): boolean {
	const deepest = deepestSpecifiedRank(t);
	if (!deepest) return true;
	return TAXONOMIC_RANKS.indexOf(rank) > TAXONOMIC_RANKS.indexOf(deepest);
}

/**
 * Serialize a Taxonomy for the COCO / .coral category schema. Ranks at or above
 * the specified rank carry their value (or null when empty); ranks deeper than
 * the specified rank are null (uncertain / unspecified).
 */
export function toCocoTaxonomy(t: Taxonomy): CocoTaxonomy {
	const deepest = deepestSpecifiedRank(t);
	const deepestIdx = deepest ? TAXONOMIC_RANKS.indexOf(deepest) : -1;

	const valueAt = (rank: TaxonomicRank): string | null => {
		const idx = TAXONOMIC_RANKS.indexOf(rank);
		if (idx > deepestIdx) return null; // deeper than specified → uncertain
		const v = t.ranks[rank]?.trim();
		return v ? v : null;
	};

	return {
		kingdom: valueAt("kingdom"),
		phylum: valueAt("phylum"),
		class: valueAt("class"),
		order: valueAt("order"),
		family: valueAt("family"),
		genus: valueAt("genus"),
		species: valueAt("species"),
		specified_rank: deepest,
		...(t.gbifKey !== undefined ? { gbif_key: t.gbifKey } : {}),
	};
}

/** Reconstruct a Taxonomy from its serialized COCO form. */
export function fromCocoTaxonomy(c: CocoTaxonomy): Taxonomy {
	const ranks = emptyTaxonomy().ranks;
	for (const rank of TAXONOMIC_RANKS) {
		ranks[rank] = c[rank] ?? "";
	}
	return {
		ranks,
		...(c.gbif_key !== undefined ? { gbifKey: c.gbif_key } : {}),
	};
}
