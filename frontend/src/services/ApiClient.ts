import type { ApiError, ApiRequestHandle, StreamEvent } from "../types/api";

type RequestBody = Record<string, unknown> | FormData;

/**
 * Configuration for a single request. Mirrors ApiRequestCallbacks but
 * excludes `onLoading` — that lifecycle event is the caller's responsibility
 * (services call it before any async preparation, not the HTTP layer).
 */
interface ApiRequestConfig<TData> {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: RequestBody;
  /**
   * When true, the response body is read as a stream of JSON lines
   * (SSE "data: {...}" or plain NDJSON). The server should emit:
   *   {"type":"progress","value":N}   — triggers onProgress
   *   {"type":"complete","data":{..}} — triggers onComplete
   *   {"type":"error","message":".."}  — triggers onError
   */
  streaming?: boolean;
  /**
   * Controls how the response body is parsed (default: "json").
   *   "json" — parse as JSON and pass to onComplete
   *   "blob" — read as Blob and pass to onComplete
   * 204 No Content responses skip body parsing entirely regardless of this setting.
   */
  responseType?: "json" | "blob";
  onProgress?: (progress: number) => void;
  onError?: (error: ApiError) => void;
  onComplete?: (data: TData) => void;
}

export class ApiClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fires an HTTP request and returns a handle immediately.
   * The request runs asynchronously in the background.
   * Call handle.cancel() to abort at any time.
   */
  request<TData>(
    endpoint: string,
    config: ApiRequestConfig<TData>,
  ): ApiRequestHandle {
    const controller = new AbortController();
    void this.execute(endpoint, config, controller);
    return { cancel: () => controller.abort() };
  }

  private async execute<TData>(
    endpoint: string,
    config: ApiRequestConfig<TData>,
    controller: AbortController,
  ): Promise<void> {
    try {
      const headers: Record<string, string> = { ...config.headers };
      let body: BodyInit | undefined;

      if (config.body instanceof FormData) {
        // Let the browser set Content-Type with the multipart boundary.
        body = config.body;
      } else if (config.body !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(config.body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: config.method ?? "POST",
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        config.onError?.({ status: response.status, message: text });
        return;
      }

      if (config.streaming) {
        await this.readStream(response, config, controller);
      } else if (response.status === 204) {
        // No Content — nothing to parse.
        config.onComplete?.(undefined as TData);
      } else if (config.responseType === "blob") {
        const data = (await response.blob()) as TData;
        config.onComplete?.(data);
      } else {
        const data = (await response.json()) as TData;
        config.onComplete?.(data);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      config.onError?.({
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Reads a streaming response line-by-line.
   * Supports both plain SSE ("data: {...}") and raw NDJSON (one JSON per line).
   */
  private async readStream<TData>(
    response: Response,
    config: Pick<
      ApiRequestConfig<TData>,
      "onProgress" | "onError" | "onComplete"
    >,
    _controller: AbortController,
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      config.onError?.({ message: "Response body is not readable." });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // The last element may be an incomplete line — keep it in the buffer.
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          // Skip blank lines and SSE comment lines (": keep-alive", etc.).
          if (!trimmed || trimmed.startsWith(":")) continue;

          // Strip optional "data: " SSE prefix.
          const jsonStr = trimmed.startsWith("data: ")
            ? trimmed.slice(6)
            : trimmed;

          try {
            const event = JSON.parse(jsonStr) as StreamEvent<TData>;
            this.dispatchStreamEvent(event, config);
          } catch {
            // Non-JSON line — ignore silently.
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      config.onError?.({
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      reader.releaseLock();
    }
  }

  private dispatchStreamEvent<TData>(
    event: StreamEvent<TData>,
    config: Pick<
      ApiRequestConfig<TData>,
      "onProgress" | "onError" | "onComplete"
    >,
  ): void {
    switch (event.type) {
      case "progress":
        if (event.value !== undefined) {
          config.onProgress?.(event.value);
        }
        break;
      case "complete":
        if (event.data !== undefined) {
          config.onComplete?.(event.data);
        }
        break;
      case "error":
        config.onError?.({
          message: event.message ?? "An unknown server error occurred.",
        });
        break;
    }
  }
}

/**
 * Singleton API client. The base URL is read from the VITE_API_BASE_URL
 * environment variable, falling back to localhost:8000 for local development.
 */
export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8000";

export const apiClient = new ApiClient(API_BASE);
