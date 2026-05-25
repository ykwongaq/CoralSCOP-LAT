/**
 * Represents a server-side error returned from an API call.
 */
export interface ApiError {
    /** HTTP status code, if available. */
    status?: number;
    message: string;
}

/**
 * Callbacks for any API request. All callbacks are optional.
 * TData is the shape of the successful response payload.
 */
export interface ApiRequestCallbacks<TData = void> {
    /** Called immediately when the request operation begins (before any network I/O). */
    onLoading?: () => void;
    /** Called each time the server reports a progress update (value: 0–100). */
    onProgress?: (progress: number) => void;
    /** Called if the request fails or the server returns an error. */
    onError?: (error: ApiError) => void;
    /** Called once when the request completes successfully. */
    onComplete?: (data: TData) => void;
}

/**
 * A handle returned by every service call. Use `cancel()` to abort the
 * in-flight request at any point — including during pre-flight preparation
 * such as blob conversion.
 */
export interface ApiRequestHandle {
    cancel: () => void;
}

/**
 * The shape of a single SSE / NDJSON frame that the server streams.
 *
 * Expected server output (one JSON object per line, or SSE "data:" lines):
 *   {"type":"progress","value":25}
 *   {"type":"progress","value":75}
 *   {"type":"complete","data":{...}}
 *   {"type":"error","message":"something went wrong"}
 */
export interface StreamEvent<TData> {
    type: "progress" | "complete" | "error";
    /** Progress percentage 0–100. Present when type === "progress". */
    value?: number;
    /** Response payload. Present when type === "complete". */
    data?: TData;
    /** Error description. Present when type === "error". */
    message?: string;
}