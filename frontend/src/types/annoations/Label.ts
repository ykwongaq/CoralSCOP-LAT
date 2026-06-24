import type { Taxonomy } from "./Taxonomy";

// Whether a label is a plain name or carries a taxonomic tree.
export type LabelType = "simple" | "taxonomic";

export interface Label {
    // Unique identifier for the label
    id: number;

    // Name of the label (e.g., "Car", "Person", "Tree"). For taxonomic labels
    // this mirrors the deepest specified rank so existing consumers are unaffected.
    name: string;

    // Optional sub-label (e.g., "Healthy", "Unhealthy" for a "Plant" label)
    status: string[];

    // Label kind. Optional for backward compatibility — absent means "simple".
    type?: LabelType;

    // Present only for taxonomic labels.
    taxonomy?: Taxonomy;
}
