export interface Label {
    // Unique identifier for the label
    id: number;

    // Name of the label (e.g., "Car", "Person", "Tree")
    name: string;

    // Optional sub-label (e.g., "Healthy", "Unhealthy" for a "Plant" label)
    status: string[];
}
