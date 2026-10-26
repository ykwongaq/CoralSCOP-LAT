export interface ProjectConfig {
  min_area: number;
  min_confidence: number;
  max_overlap: number;
  /** Store CLAHE-enhanced copies of the images and run CoralSCOP on them. */
  clahe?: boolean;
}
