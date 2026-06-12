import { type Data } from "./Data";
import { type Label } from "./Label";

export interface ProjectState {
  dataList: Data[];
  labels: Label[];
  projectName: string;

  /**
   * Label IDs that should be excluded from coverage / area statistics.
   * The pixels belonging to these labels are subtracted from the total
   * image area when computing percentages.
   */
  excludedLabelIds: number[];

  /**
   * Project UUID stored in project_info.json.  For new-format .coral files
   * (no embedded embeddings) this is also the SAM session_id — embeddings
   * are stored persistently on the server under this key.
   */
  projectId?: string;
  /** SAM session UUID on the backend. Present when embeddings are available. */
  sessionId?: string;
  /** Original .coral file bytes. Held so save can clone images/annotations. */
  sourceFile?: ArrayBuffer;
}
