import { apiClient } from "./ApiClient";
import type { ApiRequestCallbacks, ApiRequestHandle } from "../types/api";

export interface DeleteProjectRequest {
  token: string;
}

export interface DeleteProjectResponse {
  success: boolean;
}

export function deleteProject(
  request: DeleteProjectRequest,
  callbacks: ApiRequestCallbacks<DeleteProjectResponse>,
): ApiRequestHandle {
  const { token } = request;

  return apiClient.request<DeleteProjectResponse>(
    `/api/projects/delete/${encodeURIComponent(token)}`,
    {
      method: "DELETE",
      onProgress: callbacks.onProgress,
      onError: callbacks.onError,
      onComplete: callbacks.onComplete,
    },
  );
}
