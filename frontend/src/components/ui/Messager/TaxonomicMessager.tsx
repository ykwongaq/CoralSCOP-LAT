import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../Button";
import {
	TAXONOMIC_RANKS,
	type TaxonomicRank,
	type Taxonomy,
} from "../../../types";
import {
	deepestSpecifiedRank,
	emptyTaxonomy,
	isRankUncertain,
} from "../../../utils/taxonomy";
import {
	getTaxonDetail,
	getTaxonImage,
	isAbort,
	suggestTaxa,
	type TaxonSuggestion,
} from "../../../services/TaxonomyService";
import styles from "./TaxonomicMessager.module.css";

export interface TaxonomicMessagerProps {
	title: string;
	content: string;
	initialTaxonomy?: Taxonomy;
	onConfirm: (taxonomy: Taxonomy) => void;
	onCancel: () => void;
}

const RANK_LABELS: Record<TaxonomicRank, string> = {
	kingdom: "Kingdom",
	phylum: "Phylum",
	class: "Class",
	order: "Order",
	family: "Family",
	genus: "Genus",
	species: "Species",
};

function getGoogleImageSearchUrl(name: string): string {
	return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(name)}`;
}

export default function TaxonomicMessager({
	title,
	initialTaxonomy,
	onConfirm,
	onCancel,
}: TaxonomicMessagerProps) {
	const [ranks, setRanks] = useState<Record<TaxonomicRank, string>>(
		() => initialTaxonomy?.ranks ?? emptyTaxonomy().ranks,
	);
	const [gbifKey, setGbifKey] = useState<number | undefined>(
		initialTaxonomy?.gbifKey,
	);

	const [activeRank, setActiveRank] = useState<TaxonomicRank | null>(null);
	const [suggestions, setSuggestions] = useState<TaxonSuggestion[]>([]);
	const [suggestLoading, setSuggestLoading] = useState(false);

	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [imageLoading, setImageLoading] = useState(false);
	const [previewName, setPreviewName] = useState<string | null>(null);
	const imageSearchUrl =
		previewName && !imageUrl ? getGoogleImageSearchUrl(previewName) : null;

	const imageAbortRef = useRef<AbortController | null>(null);

	const taxonomy: Taxonomy = {
		ranks,
		...(gbifKey !== undefined ? { gbifKey } : {}),
	};
	const hasAnyRank = deepestSpecifiedRank(taxonomy) !== null;

	// --- Image preview -------------------------------------------------------
	const fetchImage = useCallback(
		(opts: { gbifKey?: number; name?: string }) => {
			imageAbortRef.current?.abort();
			const controller = new AbortController();
			imageAbortRef.current = controller;
			setImageLoading(true);
			setPreviewName(opts.name ?? null);
			getTaxonImage(opts, controller.signal)
				.then((url) => {
					if (!controller.signal.aborted) setImageUrl(url);
				})
				.catch((err) => {
					if (!isAbort(err)) setImageUrl(null);
				})
				.finally(() => {
					if (!controller.signal.aborted) setImageLoading(false);
				});
		},
		[],
	);

	// Clean up any in-flight image request on unmount.
	useEffect(() => () => imageAbortRef.current?.abort(), []);

	// --- Autocomplete (debounced) -------------------------------------------
	useEffect(() => {
		if (activeRank === null) return;
		const q = ranks[activeRank].trim();
		// Empty query: suggestions are cleared by the change/focus handlers, so
		// there is nothing to fetch here.
		if (!q) return;

		const controller = new AbortController();
		const timer = setTimeout(() => {
			setSuggestLoading(true);
			suggestTaxa(q, controller.signal)
				.then((res) => {
					if (!controller.signal.aborted) setSuggestions(res);
				})
				.catch((err) => {
					if (!isAbort(err)) setSuggestions([]);
				})
				.finally(() => {
					if (!controller.signal.aborted) setSuggestLoading(false);
				});
		}, 250);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [activeRank, ranks]);

	// --- Handlers ------------------------------------------------------------
	const handleChange = (rank: TaxonomicRank, value: string) => {
		// Manual edits diverge from the selected GBIF record, so drop the key.
		setRanks((prev) => ({ ...prev, [rank]: value }));
		setGbifKey(undefined);
		setActiveRank(rank);
		if (!value.trim()) setSuggestions([]);
	};

	const handleSelect = async (suggestion: TaxonSuggestion) => {
		setActiveRank(null);
		setSuggestions([]);
		const name = suggestion.canonicalName ?? suggestion.scientificName;
		try {
			const detail = await getTaxonDetail(suggestion.key);
			setRanks(detail.ranks);
			setGbifKey(detail.gbifKey);
			fetchImage({ gbifKey: detail.gbifKey, name });
		} catch (err) {
			if (isAbort(err)) return;
			// Fall back to filling just this rank with the suggestion name.
			const fallbackRank =
				(suggestion.rank.toLowerCase() as TaxonomicRank) || null;
			if (fallbackRank && fallbackRank in RANK_LABELS) {
				setRanks((prev) => ({ ...prev, [fallbackRank]: name }));
			}
			setGbifKey(suggestion.key);
			fetchImage({ gbifKey: suggestion.key, name });
		}
	};

	const handleConfirm = () => onConfirm(taxonomy);

	return (
		<div className={styles.modalPop}>
			<div className={styles.modalPopInner}>
				<p className={styles.title}>{title}</p>

				<div className={styles.panels}>
					{/* Left: image preview */}
					<div className={styles.imagePanel}>
						{imageLoading ? (
							<div className={styles.imagePlaceholder}>
								<span className={styles.spinner} />
								<span>Loading image…</span>
							</div>
						) : imageUrl ? (
							<img
								src={imageUrl}
								alt={previewName ?? "taxon"}
								className={styles.image}
							/>
						) : (
							<div className={styles.imagePlaceholder}>
								<span className={styles.imagePlaceholderIcon}>🔍</span>
								<span>
									{previewName
										? "No image found"
										: "Hover or select a taxon to preview an image"}
								</span>
								{imageSearchUrl && (
									<a
										href={imageSearchUrl}
										target="_blank"
										rel="noreferrer"
										className={styles.searchLink}
									>
										Search Google Images
									</a>
								)}
							</div>
						)}
						{previewName && (
							<div className={styles.imageCaption}>{previewName}</div>
						)}
					</div>

					{/* Right: taxonomic pyramid */}
					<div className={styles.pyramidPanel}>
						{TAXONOMIC_RANKS.map((rank) => {
							const uncertain = isRankUncertain(rank, taxonomy);
							const showDropdown =
								activeRank === rank &&
								(suggestions.length > 0 || suggestLoading);

							return (
								<div key={rank} className={styles.rankRow} data-rank={rank}>
									<div className={styles.rankLabel}>{RANK_LABELS[rank]}</div>
									<div className={styles.rankField}>
										<div className={styles.rankTier} aria-hidden="true" />
										<div className={styles.inputWrap}>
											<input
												type="text"
												className={`${styles.rankInput} ${
													uncertain ? styles.rankInputUncertain : ""
												}`}
												value={ranks[rank]}
												placeholder={
													uncertain ? "unspecified" : "Type to search…"
												}
												onChange={(e) => handleChange(rank, e.target.value)}
												onFocus={() => {
													setActiveRank(rank);
													setSuggestions([]);
												}}
												onBlur={() => {
													// Delay so a suggestion click registers first.
													window.setTimeout(() => {
														setActiveRank((cur) => (cur === rank ? null : cur));
													}, 150);
												}}
											/>
											{uncertain && (
												<span
													className={styles.uncertainBadge}
													title="Deeper than the specified rank — uncertain / unspecified"
												>
													uncertain
												</span>
											)}

											{showDropdown && (
												<div className={styles.suggestions}>
													{suggestLoading && (
														<div className={styles.suggestionLoading}>
															Searching…
														</div>
													)}
													{suggestions.map((s) => (
														<button
															key={s.key}
															type="button"
															className={styles.suggestionItem}
															// Fire before input blur closes the list.
															onMouseDown={(e) => e.preventDefault()}
															onMouseEnter={() =>
																fetchImage({
																	gbifKey: s.key,
																	name: s.canonicalName ?? s.scientificName,
																})
															}
															onClick={() => handleSelect(s)}
														>
															<span className={styles.suggestionName}>
																{s.scientificName}
															</span>
															{s.rank && (
																<span className={styles.suggestionRank}>
																	{s.rank.toLowerCase()}
																</span>
															)}
														</button>
													))}
												</div>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className={styles.footer}>
					<Button label="Cancel" onClick={onCancel} isBorder />
					<Button
						label="Confirm"
						onClick={handleConfirm}
						disabled={!hasAnyRank}
					/>
				</div>
			</div>
		</div>
	);
}
