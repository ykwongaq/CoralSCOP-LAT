import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiRequestHandle } from "../../../types/api";
import {
	createProject,
	deleteProject,
	downloadProject,
	type CreateProjectRequest,
} from "../../../services";

export type CreateProjectJobStatus =
	| "idle"
	| "running"
	| "error"
	| "ready"
	| "downloading"
	| "downloaded";

/**
 * Tracks one "create project" run on the server: upload + optional model run,
 * then a one-time download of the resulting .coral file.
 *
 * A project that was created but never downloaded is deleted on the server
 * when it is discarded or when the page unmounts.
 */
export function useCreateProjectJob() {
	const [status, setStatus] = useState<CreateProjectJobStatus>("idle");
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	const requestRef = useRef<ApiRequestHandle | null>(null);
	const tokenRef = useRef<string | null>(null);

	const discardServerProject = useCallback(() => {
		const token = tokenRef.current;
		tokenRef.current = null;
		if (token) deleteProject({ token }, {});
	}, []);

	const start = useCallback(
		(request: CreateProjectRequest) => {
			requestRef.current?.cancel();
			discardServerProject();
			setStatus("running");
			setProgress(null);
			setError(null);

			requestRef.current = createProject(request, {
				onProgress: (pct) => setProgress(pct),
				onError: (err) => {
					requestRef.current = null;
					setError(err.message);
					setStatus("error");
				},
				onComplete: (data) => {
					requestRef.current = null;
					tokenRef.current = data.downloadToken;
					setStatus("ready");
				},
			});
		},
		[discardServerProject],
	);

	/** Stops a running job, or deletes a created-but-not-downloaded project. */
	const reset = useCallback(() => {
		requestRef.current?.cancel();
		requestRef.current = null;
		discardServerProject();
		setStatus("idle");
		setProgress(null);
		setError(null);
	}, [discardServerProject]);

	const download = useCallback((filename: string) => {
		const token = tokenRef.current;
		if (!token) return;
		setStatus("downloading");
		setError(null);
		downloadProject(
			{ token, filename },
			{
				onComplete: () => {
					// The server deletes the file after a download, so there is nothing left to clean up.
					tokenRef.current = null;
					setStatus("downloaded");
				},
				onError: (err) => {
					setError(err.message);
					setStatus("ready");
				},
			},
		);
	}, []);

	// Leaving the page cancels the run and removes any project that was not downloaded.
	useEffect(() => {
		return () => {
			requestRef.current?.cancel();
			const token = tokenRef.current;
			if (token) deleteProject({ token }, {});
		};
	}, []);

	return { status, progress, error, start, reset, download };
}

export type CreateProjectJob = ReturnType<typeof useCreateProjectJob>;
