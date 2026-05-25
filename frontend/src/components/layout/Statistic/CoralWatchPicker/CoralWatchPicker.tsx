import { createPortal } from "react-dom";
import CoralWatchLogo from "../../../../assets/CoralWatchLogo.png";
import type { Data, CoralWatchCard } from "../../../../types";
import { useCoralWatchPicker } from "./useCoralWatchPicker";
import { SampleOverlay } from "./SampleOverlay";
import { CORNER_LABELS, CORNER_COLORS } from "./constants";

import styles from "./CoralWatchPicker.module.css";

export interface CoralWatchPickerProps {
	data: Data;
	onClose: () => void;
	onConfirm: (card: CoralWatchCard | null) => void;
	initialCard?: CoralWatchCard;
}

export function CoralWatchPicker({
	data,
	onClose,
	onConfirm,
	initialCard,
}: CoralWatchPickerProps) {
	const {
		corners,
		showPreview,
		sampledColors,
		pointPositions,
		draggingLabel,
		sourceCanvasRef,
		previewCanvasRef,
		digitalCardCanvasRef,
		sourceCanvasWrapperRef,
		previewWrapRef,
		handleCanvasClick,
		handleDotMouseDown,
		handlePreviewMouseMove,
		handleConfirm,
		handleReset,
	} = useCoralWatchPicker(data, initialCard, onConfirm);

	return createPortal(
		<div className={styles.backdrop} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.header}>
					<img src={CoralWatchLogo} alt="CoralWatch" className={styles.logo} />
					<h2 className={styles.title}>CoralWatch Card Picker</h2>
				</div>

				<div className={styles.instructions}>
					<p className={styles.instructionText}>
						Click the 4 corners of the card in order:
						<strong> Top-Left → Top-Right → Bottom-Right → Bottom-Left</strong>
					</p>
					<div className={styles.cornerChips}>
						{CORNER_LABELS.map((label, index) => (
							<div
								key={index}
								className={`${styles.chip} ${
									index < corners.length ? styles.completed : ""
								}`}
								style={{
									backgroundColor:
										index < corners.length ? CORNER_COLORS[index] : "#e5e7eb",
								}}
							>
								<span className={styles.chipLabel}>{label}</span>
								{index < corners.length && (
									<span className={styles.checkmark}>✓</span>
								)}
							</div>
						))}
					</div>
				</div>

				<div className={styles.canvasArea}>
					<div className={styles.sourcePanel}>
						<label className={styles.canvasLabel}>Source Image</label>
						<div
							className={styles.sourceCanvasWrapper}
							ref={sourceCanvasWrapperRef}
						>
							<canvas
								ref={sourceCanvasRef}
								className={styles.sourceCanvas}
								onClick={handleCanvasClick}
							/>
						</div>
					</div>

					<div
						className={`${styles.previewPanel} ${
							showPreview ? styles.visible : ""
						}`}
					>
						<label className={styles.canvasLabel}>Extracted Card</label>
						<div
							className={styles.previewWrap}
							ref={previewWrapRef}
							onMouseMove={handlePreviewMouseMove}
						>
							<canvas ref={previewCanvasRef} className={styles.previewCanvas} />
							{showPreview && (
								<SampleOverlay
									colors={sampledColors}
									positions={pointPositions}
									draggingLabel={draggingLabel}
									onDotMouseDown={handleDotMouseDown}
								/>
							)}
						</div>
						{showPreview && (
							<p className={styles.refineInstruction}>
								Drag the colored dots to refine the sampled colors
							</p>
						)}
					</div>

					<div
						className={`${styles.finalCardPanel} ${
							showPreview ? styles.visible : ""
						}`}
					>
						<label className={styles.canvasLabel}>Digital Card</label>
						<canvas
							ref={digitalCardCanvasRef}
							className={styles.finalCardCanvas}
						/>
					</div>
				</div>

				<div className={styles.footer}>
					<button className={styles.cancelBtn} onClick={onClose}>
						Cancel
					</button>
					<button
						className={styles.resetBtn}
						onClick={handleReset}
						disabled={corners.length === 0}
					>
						Reset
					</button>
					<button
						className={styles.confirmBtn}
						onClick={handleConfirm}
						disabled={corners.length !== 4 && corners.length !== 0}
					>
						Confirm
					</button>
				</div>
			</div>
		</div>,
		document.body,
	);
}

export default CoralWatchPicker;
