import { apiClient } from "./ApiClient";
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
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename ? `${filename}.coral` : `project_${token}.coral`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        callbacks.onComplete?.({ success: true });
      },
    },
  );
}
