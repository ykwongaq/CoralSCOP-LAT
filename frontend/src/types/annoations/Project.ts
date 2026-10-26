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

  /** Project UUID stored in project_info.json. */
  projectId?: string;
  /**
   * SAM session UUID, freshly generated each time a project is opened.
   * The server keeps this session's embeddings in memory until it is released.
   */
  sessionId?: string;
  /** Original .coral file bytes. Held so save can clone images/annotations. */
  sourceFile?: ArrayBuffer;
}
