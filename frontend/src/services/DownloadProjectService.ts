import { apiClient } from "./ApiClient";
import triggerDownload from "../utils/download";
import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";

export interface DownloadProjectRequest {
  token: string;
  filename?: string;
}

export interface DownloadProjectResponse {
  success: boolean;
}

export function downloadProject(
  request: DownloadProjectRequest,
  callbacks: ApiRequestCallbacks<DownloadProjectResponse>,
): ApiRequestHandle {
  const { token, filename } = request;

  return apiClient.request<Blob>(
    `/api/projects/download/${encodeURIComponent(token)}`,
    {
      method: "GET",
      responseType: "blob",
      onError: callbacks.onError,
      onComplete: (blob) => {
        triggerDownload(
          blob,
          filename ? `${filename}.coral` : `project_${token}.coral`,
        );

        callbacks.onComplete?.({ success: true });
      },
    },
  );
}
