import { useEffect, useRef, useState } from "react";
import layoutStyles from "../PanelLayout.module.css";
import styles from "./CreationWizard.module.css";
import { useProjectCreation } from "../../../store";
import { enhanceImageFromUrl } from "../../../services";
import { Button } from "../../ui";
import { BottomBar } from "../../layout";
import ChoiceCard from "./ChoiceCard";

interface EnhancementStepProps {
	onBack: () => void;
	onNext: () => void;
}

type PreviewState =
	| { status: "loading" }
	| { status: "ready"; url: string }
	| { status: "error"; message: string };

/** Wizard step 2: decide whether to apply CLAHE enhancement to the images. */
export default function EnhancementStep({ onBack, onNext }: EnhancementStepProps) {
	const { projectCreationState, projectCreationDispatch } =
		useProjectCreation();
	const useClahe = projectCreationState.config.clahe === true;

	const selectedImages = projectCreationState.imageDataList.filter((_, i) =>
		projectCreationState.selectedIndices.includes(i),
	);
	const imageCount = selectedImages.length;

	// Before/after preview, one selected image at a time.
	const [previewIndex, setPreviewIndex] = useState(0);
	const previewImage = selectedImages[previewIndex] ?? null;
	const [previews, setPreviews] = useState<Record<string, PreviewState>>({});
	const createdUrlsRef = useRef<string[]>([]);

	const previewKey = previewImage?.imageUrl ?? null;
	const previewName = previewImage?.imageName ?? "";
	const preview = previewKey ? previews[previewKey] : undefined;

	useEffect(() => {
		if (!previewKey || preview) return;
		const controller = new AbortController();
		setPreviews((p) => ({ ...p, [previewKey]: { status: "loading" } }));
		enhanceImageFromUrl(previewKey, previewName, controller.signal)
			.then((blob) => {
				const url = URL.createObjectURL(blob);
				createdUrlsRef.current.push(url);
				setPreviews((p) => ({ ...p, [previewKey]: { status: "ready", url } }));
			})
			.catch((err: unknown) => {
				if (err instanceof DOMException && err.name === "AbortError") {
					// Let the preview load again if the user comes back to it.
					setPreviews((p) => {
						const next = { ...p };
						delete next[previewKey];
						return next;
					});
					return;
				}
				setPreviews((p) => ({
					...p,
					[previewKey]: {
						status: "error",
						message: err instanceof Error ? err.message : String(err),
					},
				}));
			});
		return () => controller.abort();
		// `preview` is left out on purpose: setting it to "loading" must not cancel the request.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [previewKey, previewName]);

	// Free the preview images when leaving the step.
	useEffect(() => {
		const urls = createdUrlsRef.current;
		return () => urls.forEach((url) => URL.revokeObjectURL(url));
	}, []);

	function setUseClahe(value: boolean) {
		projectCreationDispatch({ type: "UPDATE_CLAHE", payload: value });
	}

	return (
		<>
			<div className={layoutStyles.mainSectionContent}>
				<p className={styles.stepTitle}>Enhance the images with CLAHE?</p>
				<p className={styles.stepDesc}>
					CLAHE (Contrast Limited Adaptive Histogram Equalization) boosts local
					contrast, which can make corals easier to see in dark or murky
					underwater images. The original images are always kept. CoralSCOP and
					SAM run on the enhanced images, and statistics such as bleaching
					always use the original colours. You can switch between the two at
					any time while annotating.
				</p>

				<div className={styles.choiceGroup} role="radiogroup">
					<ChoiceCard
						selected={useClahe}
						title="Yes, apply CLAHE"
						description="Store an enhanced copy of every image and use it for display and models."
						onSelect={() => setUseClahe(true)}
					/>
					<ChoiceCard
						selected={!useClahe}
						title="No, keep the originals"
						description="Use the images as uploaded. You can still turn enhancement on later."
						onSelect={() => setUseClahe(false)}
					/>
				</div>

				{previewImage && (
					<div className={styles.previewBlock}>
						<div className={styles.previewHeader}>
							<span className={styles.previewTitle}>Preview</span>
							{imageCount > 1 && (
								<span className={styles.previewNav}>
									<button
										type="button"
										className={styles.previewNavButton}
										onClick={() =>
											setPreviewIndex((i) => (i - 1 + imageCount) % imageCount)
										}
										aria-label="Previous image"
									>
										‹
									</button>
									<span>
										{previewIndex + 1} / {imageCount}
									</span>
									<button
										type="button"
										className={styles.previewNavButton}
										onClick={() => setPreviewIndex((i) => (i + 1) % imageCount)}
										aria-label="Next image"
									>
										›
									</button>
								</span>
							)}
						</div>
						<div className={styles.previewGrid}>
							<figure className={styles.previewFigure}>
								<img src={previewImage.imageUrl} alt={`${previewName}, original`} />
								<figcaption>Original</figcaption>
							</figure>
							<figure className={styles.previewFigure}>
								{preview?.status === "ready" ? (
									<img src={preview.url} alt={`${previewName}, enhanced with CLAHE`} />
								) : (
									<div className={styles.previewPlaceholder}>
										{preview?.status === "error"
											? `Preview failed: ${preview.message}`
											: "Enhancing…"}
									</div>
								)}
								<figcaption>CLAHE enhanced</figcaption>
							</figure>
						</div>
					</div>
				)}
			</div>

			<BottomBar className={layoutStyles.mainSectionBottom}>
				<Button className={styles.wizardButton} onClick={onBack} isBorder>
					Back
				</Button>
				<Button className={styles.wizardButton} onClick={onNext}>
					Next
				</Button>
			</BottomBar>
		</>
	);
}
