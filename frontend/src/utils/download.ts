export default function triggerDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.style.display = "none";
	// The link must be in the DOM for some browsers (e.g. Firefox) to honour the click.
	document.body.appendChild(a);
	a.click();
	// The browser starts the download asynchronously; revoking the URL right away
	// can cancel it silently, so wait before cleaning up.
	setTimeout(() => {
		a.remove();
		URL.revokeObjectURL(url);
	}, 1000);
}
