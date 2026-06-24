import {
	TAXONOMIC_RANKS,
	type TaxonomicRank,
	type Taxonomy,
} from "../types";
import { emptyTaxonomy } from "../utils/taxonomy";

/**
 * Taxonomy lookups against public, CORS-enabled APIs (GBIF, iNaturalist,
 * Wikipedia). These are external services unrelated to the app backend, so we
 * use the browser `fetch` directly rather than the backend `apiClient`.
 *
 * Endpoints:
 *  - GBIF suggest:  https://api.gbif.org/v1/species/suggest?q=<query>
 *  - GBIF detail:   https://api.gbif.org/v1/species/<key>
 *  - GBIF media:    https://api.gbif.org/v1/occurrence/search?taxonKey=<key>&mediaType=StillImage
 *  - iNaturalist:   https://api.inaturalist.org/v1/taxa?q=<name>
 *  - Wikipedia:     https://en.wikipedia.org/api/rest_v1/page/summary/<name>
 */

const GBIF_BASE = "https://api.gbif.org/v1";
const INATURALIST_BASE = "https://api.inaturalist.org/v1";
const WIKIPEDIA_SUMMARY =
	"https://en.wikipedia.org/api/rest_v1/page/summary";

export interface TaxonSuggestion {
	key: number;
	scientificName: string;
	canonicalName?: string;
	rank: string; // GBIF rank, upper-case (e.g. "GENUS")
}

/** GBIF returns ranks upper-cased; map to our lower-case rank union. */
function normalizeRank(rank: string | undefined): TaxonomicRank | null {
	if (!rank) return null;
	const lower = rank.toLowerCase();
	return (TAXONOMIC_RANKS as readonly string[]).includes(lower)
		? (lower as TaxonomicRank)
		: null;
}

/** Real-time taxon name suggestions for autocomplete. */
export async function suggestTaxa(
	query: string,
	signal?: AbortSignal,
): Promise<TaxonSuggestion[]> {
	const q = query.trim();
	if (!q) return [];

	const res = await fetch(
		`${GBIF_BASE}/species/suggest?q=${encodeURIComponent(q)}&limit=12`,
		{ signal },
	);
	if (!res.ok) throw new Error(`GBIF suggest failed: ${res.status}`);

	const data = (await res.json()) as Array<{
		key: number;
		scientificName?: string;
		canonicalName?: string;
		rank?: string;
	}>;

	return data.map((d) => ({
		key: d.key,
		scientificName: d.scientificName ?? d.canonicalName ?? "",
		canonicalName: d.canonicalName,
		rank: d.rank ?? "",
	}));
}

/**
 * Fetch a taxon's full hierarchy by GBIF key and build a Taxonomy with every
 * rank from kingdom down to (and including) the taxon's own rank filled in.
 */
export async function getTaxonDetail(
	key: number,
	signal?: AbortSignal,
): Promise<Taxonomy> {
	const res = await fetch(`${GBIF_BASE}/species/${key}`, { signal });
	if (!res.ok) throw new Error(`GBIF detail failed: ${res.status}`);

	const data = (await res.json()) as Record<string, unknown>;
	const taxonomy = emptyTaxonomy();
	taxonomy.gbifKey = key;

	// GBIF detail exposes each rank as a top-level field (kingdom, phylum, ...).
	for (const rank of TAXONOMIC_RANKS) {
		const value = data[rank];
		if (typeof value === "string" && value.trim()) {
			taxonomy.ranks[rank] = value.trim();
		}
	}

	// Ensure the taxon's own rank is populated from its canonical name even if
	// GBIF omitted the matching rank field (can happen for the queried rank).
	const ownRank = normalizeRank(data.rank as string | undefined);
	if (ownRank && !taxonomy.ranks[ownRank]) {
		const name =
			(data.canonicalName as string) ?? (data.scientificName as string) ?? "";
		if (name.trim()) taxonomy.ranks[ownRank] = name.trim();
	}

	return taxonomy;
}

/**
 * Find a representative image URL for a taxon. Tries GBIF occurrence media
 * first (keyed by usageKey), then iNaturalist's default photo, then a Wikipedia
 * page thumbnail. Returns null when nothing is found.
 */
export async function getTaxonImage(
	opts: { gbifKey?: number; name?: string },
	signal?: AbortSignal,
): Promise<string | null> {
	const { gbifKey, name } = opts;

	// 1. GBIF occurrence media (actual photographed records of the taxon).
	if (gbifKey !== undefined) {
		try {
			const res = await fetch(
				`${GBIF_BASE}/occurrence/search?taxonKey=${gbifKey}&mediaType=StillImage&limit=1`,
				{ signal },
			);
			if (res.ok) {
				const data = (await res.json()) as {
					results?: Array<{ media?: Array<{ identifier?: string }> }>;
				};
				const url = data.results?.[0]?.media?.[0]?.identifier;
				if (url) return url;
			}
		} catch (err) {
			if (isAbort(err)) throw err;
		}
	}

	if (!name || !name.trim()) return null;

	// 2. iNaturalist default photo.
	try {
		const res = await fetch(
			`${INATURALIST_BASE}/taxa?q=${encodeURIComponent(name)}&per_page=1`,
			{ signal },
		);
		if (res.ok) {
			const data = (await res.json()) as {
				results?: Array<{
					default_photo?: { medium_url?: string; url?: string };
				}>;
			};
			const photo = data.results?.[0]?.default_photo;
			const url = photo?.medium_url ?? photo?.url;
			if (url) return url;
		}
	} catch (err) {
		if (isAbort(err)) throw err;
	}

	// 3. Wikipedia page thumbnail.
	try {
		const res = await fetch(
			`${WIKIPEDIA_SUMMARY}/${encodeURIComponent(name)}`,
			{ signal },
		);
		if (res.ok) {
			const data = (await res.json()) as {
				thumbnail?: { source?: string };
			};
			if (data.thumbnail?.source) return data.thumbnail.source;
		}
	} catch (err) {
		if (isAbort(err)) throw err;
	}

	return null;
}

/** True when an error is an AbortController cancellation. */
export function isAbort(err: unknown): boolean {
	return err instanceof DOMException && err.name === "AbortError";
}
