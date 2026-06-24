// Canonical taxonomic ranks, ordered from broadest (kingdom) to most specific
// (species). Used for both the pyramid UI and (de)serialization.
export const TAXONOMIC_RANKS = [
	"kingdom",
	"phylum",
	"class",
	"order",
	"family",
	"genus",
	"species",
] as const;

export type TaxonomicRank = (typeof TAXONOMIC_RANKS)[number];

/**
 * A taxonomic assignment for a label.
 *
 * `ranks` always holds all seven keys; an empty string means the rank was not
 * specified. The "specified rank" (the deepest non-empty rank) is *derived*
 * rather than stored — any rank below it is treated as uncertain / unspecified.
 */
export interface Taxonomy {
	ranks: Record<TaxonomicRank, string>;
	// GBIF usageKey of the selected taxon, kept for provenance / image lookup.
	gbifKey?: number;
}
