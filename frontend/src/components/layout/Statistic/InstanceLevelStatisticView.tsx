import { useEffect, useState, useMemo, useCallback } from "react";
import type { Label, Data, Annotation, RLE } from "../../../types";
import {
	computeBleachingPercentages,
	computeBleachedPixelMap,
	classifyPixelsByColor,
	type ColorClassificationResult,
} from "../../../services";
import CroppedCanvas from "../../ui/Statistic/CroppedCanvas";
import InstanceSettingsModal from "./InstanceSettingsModal";
import ColorClassificationPanel from "./ColorClassificationPanel";

import styles from "./InstanceLevelStatisticView.module.css";

interface Props {
	data: Data | null;
	labels: Label[];
	selectedIds: number[];
}

interface InstanceStats {
	labelName: string;
	statuses: string[];
	areaPct: number;
	bleachingPct: number | null;
	colorClassification: ColorClassificationResult[] | null;
}

export default function InstanceLevelStatisticView({
	data,
	labels,
	selectedIds,
}: Props) {
	const [stats, setStats] = useState<InstanceStats | null>(null);
	const [distanceThreshold, setDistanceThreshold] = useState(100);
	const [workingDistanceThreshold, setWorkingDistanceThreshold] = useState(100);
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showMask, setShowMask] = useState(false);
	const [maskAlpha, setMaskAlpha] = useState(100);
	const [showUnclassified, setShowUnclassified] = useState(false);

	const selectedAnnotation = useMemo(() => {
		if (!data) return null;
		const firstId = selectedIds[0];
		if (firstId === undefined) return null;
		return data.annotations.find((a) => a.id === firstId) ?? null;
	}, [data, selectedIds]);

	const computeBleaching = useCallback(
		async (
			imageUrl: string,
			annotations: Annotation[],
			w: number,
			h: number,
			threshold: number,
		) => {
			return computeBleachingPercentages(imageUrl, annotations, w, h, threshold);
		},
		[],
	);

	const calculateAreaPercentage = useCallback(
		(
			annotation: Annotation,
			imageWidth: number,
			imageHeight: number,
		): number => {
			const rle = annotation.segmentation as RLE;
			if (!rle || !rle.counts || !rle.size) return 0;

			let pixelCount = 0;
			for (let i = 1; i < rle.counts.length; i += 2) {
				pixelCount += rle.counts[i];
			}

			const totalPixels = imageWidth * imageHeight;
			return totalPixels > 0 ? (pixelCount / totalPixels) * 100 : 0;
		},
		[],
	);

	useEffect(() => {
		if (!data || !selectedAnnotation) {
			setStats(null);
			return;
		}

		const labelMap = new Map(labels.map((l) => [l.id, l]));
		const label = labelMap.get(selectedAnnotation.labelId);
		const areaPct = calculateAreaPercentage(
			selectedAnnotation,
			data.imageData.width,
			data.imageData.height,
		);

		setStats({
			labelName: label?.name ?? "(unlabeled)",
			statuses: label?.status ?? [],
			areaPct,
			bleachingPct: null,
			colorClassification: null,
		});

		const { imageUrl, width, height } = data.imageData;
		computeBleaching(imageUrl, [selectedAnnotation], width, height, distanceThreshold).then(
			(pcts) => {
				setStats((prev) => (prev ? { ...prev, bleachingPct: pcts[0] } : null));
			},
		);

		if (data.coralWatch && data.coralWatch.classPoints.length > 0) {
			classifyPixelsByColor(
				imageUrl,
				selectedAnnotation,
				data.coralWatch.classPoints,
				distanceThreshold,
			).then((results) => {
				setStats((prev) =>
					prev ? { ...prev, colorClassification: results } : null,
				);
			});
		} else {
			computeBleachedPixelMap(
				imageUrl,
				selectedAnnotation,
				width,
				height,
				distanceThreshold,
			).then((pixelMap) => {
				const bleachedPixels = pixelMap.filter((p) => p === "Bleached").length;
				const totalPixels = pixelMap.filter((p) => p !== "").length;
				const bleachedClassification: ColorClassificationResult[] = [
					{
						label: "Bleached",
						pixels: bleachedPixels,
						pct: totalPixels > 0 ? (bleachedPixels / totalPixels) * 100 : 0,
						color: { r: 169, g: 169, b: 169 },
						pixelMap,
					},
					{
						label: "Unbleached",
						pixels: totalPixels - bleachedPixels,
						pct: totalPixels > 0 ? ((totalPixels - bleachedPixels) / totalPixels) * 100 : 0,
						color: { r: 139, g: 79, b: 19 },
					},
				];
				setStats((prev) =>
					prev ? { ...prev, colorClassification: bleachedClassification } : null,
				);
			});
		}
	}, [
		data,
		selectedAnnotation,
		labels,
		computeBleaching,
		calculateAreaPercentage,
		distanceThreshold,
	]);

	if (!selectedAnnotation) {
		return (
			<div className={`${styles.statSection} ${styles.statSectionInstance}`}>
				<h3 className={styles.statSectionTitle}>Instance Statistics</h3>
				<p className={styles.statEmptyHint}>
					Click or drag on the canvas to select annotations.
				</p>
			</div>
		);
	}

	return (
		<div className={`${styles.statSection} ${styles.statSectionInstance}`}>
			<div className={styles.statHeaderRow}>
				<h3 className={styles.statSectionTitle}>Instance Statistics</h3>
				<div className={styles.statSettingsButtonWrapper}>
					<button
						className={styles.statSettingsBtn}
						onClick={() => setShowSettingsModal(!showSettingsModal)}
						title="Settings"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
							<path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
							<path d="M12 2v2" />
							<path d="M12 20v2" />
							<path d="m4.93 4.93 1.41 1.41" />
							<path d="m17.66 17.66 1.41 1.41" />
							<path d="M2 12h2" />
							<path d="M20 12h2" />
							<path d="m6.34 17.66-1.41 1.41" />
							<path d="m19.07 4.93-1.41 1.41" />
						</svg>
					</button>
					{showSettingsModal && (
						<InstanceSettingsModal
							showMask={showMask}
							maskAlpha={maskAlpha}
							onShowMaskChange={setShowMask}
							onMaskAlphaChange={setMaskAlpha}
							workingDistanceThreshold={workingDistanceThreshold}
							onThresholdChange={setDistanceThreshold}
							onWorkingThresholdChange={setWorkingDistanceThreshold}
							hasCoralWatch={!!data?.coralWatch}
							showUnclassified={showUnclassified}
							onShowUnclassifiedChange={setShowUnclassified}
							onClose={() => setShowSettingsModal(false)}
						/>
					)}
				</div>
			</div>
			{data && stats && (
				<div className={styles.statSplitRow}>
					<div className={styles.statImagePanel}>
						<CroppedCanvas
							imageUrl={data.imageData.imageUrl}
							annotation={selectedAnnotation}
							imageWidth={data.imageData.width}
							imageHeight={data.imageData.height}
							colorClassification={stats.colorClassification}
							showMask={showMask}
							maskAlpha={maskAlpha}
							showColorBoxes={!!data.coralWatch}
						/>
					</div>
					<div className={styles.statDataPanel}>
						<div className={styles.statCategoryBlock}>
							<span className={styles.statCategoryLabel}>Category</span>
							<span className={styles.statCategoryName}>{stats.labelName}</span>
						</div>

						{stats.statuses.length > 0 && (
							<div className={styles.statTagList}>
								{stats.statuses.map((s) => (
									<span key={s} className={styles.statTag}>
										{s}
									</span>
								))}
							</div>
						)}

						<div className={styles.statMetricsRow}>
							<div className={styles.statMetricBlock}>
								<span className={styles.statMetricValue}>
									{stats.bleachingPct === null ? (
										<span className={styles.statLoading}>…</span>
									) : (
										`${stats.bleachingPct.toFixed(1)}%`
									)}
								</span>
								<span className={styles.statMetricLabel}>White Pixel</span>
							</div>
							<div className={styles.statMetricDivider} />
							<div className={styles.statMetricBlock}>
								<span className={styles.statMetricValue}>
									{stats.areaPct.toFixed(2)}%
								</span>
								<span className={styles.statMetricLabel}>Area</span>
							</div>
						</div>

						<ColorClassificationPanel
							colorClassification={stats.colorClassification}
							showUnclassified={showUnclassified}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
