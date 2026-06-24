/**
 * Serialized taxonomy block stored in a category. Each rank is the taxon name,
 * or `null` when unspecified (including ranks deeper than `specified_rank`,
 * which are considered uncertain). Present only for taxonomic categories.
 */
export interface CocoTaxonomy {
	kingdom: string | null;
	phylum: string | null;
	class: string | null;
	order: string | null;
	family: string | null;
	genus: string | null;
	species: string | null;
	// Deepest rank the user actually specified (null if none).
	specified_rank: string | null;
	// GBIF usageKey of the selected taxon, when known.
	gbif_key?: number;
}

export interface CocoCategory {
	id: number;
	name: string;
	color: string;
	status: string[];
	// Absent means "simple" (backward compatible with old projects).
	type?: "simple" | "taxonomic";
	// Present only when type === "taxonomic".
	taxonomy?: CocoTaxonomy;
}
