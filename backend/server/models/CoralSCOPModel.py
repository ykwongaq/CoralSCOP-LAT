import time
from typing import Dict, List, Set, Tuple

import numpy as np
import torch

from ..utils.logger import get_logger
from ..utils.masks import encode_masks
from .modelQueue import ModelQueue
from .segment_anything import SamAutomaticMaskGenerator, sam_model_registry

_logger = get_logger(__name__)


class CoralSCOPModel:

    def __init__(
        self,
        model_path,
        model_type,
        point_number=32,
        iou_threshold=0.62,
        sta_threshold=0.62,
        max_masks_num=100,
    ):
        _logger.info("Loading CoralSCOP model from %s", model_path)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        sam = sam_model_registry[model_type](checkpoint=model_path)
        sam.to(self.device)

        self.max_masks_num = max_masks_num
        mask_generator = SamAutomaticMaskGenerator(
            model=sam,
            points_per_side=point_number,
            pred_iou_thresh=iou_threshold,
            stability_score_thresh=sta_threshold,
            crop_n_layers=1,
            crop_n_points_downscale_factor=2,
            min_mask_region_area=100,
        )

        self._queue = ModelQueue(mask_generator, max_concurrent=1)
        _logger.info("CoralSCOP model loaded (device=%s)", self.device)

    def gen_annotations(
        self,
        image: np.ndarray,
        min_area: float = 0.001,
        min_confidence: float = 0.5,
        max_iou: float = 0.1,
    ) -> Dict:
        with self._queue as mask_generator:
            masks = mask_generator.generate(image)

        _logger.info(
            f"Generated {len(masks)} masks, returning top {self.max_masks_num} masks"
        )

        # Filter out the masks that the predicted_iou is null
        masks = [mask for mask in masks if mask["predicted_iou"] is not None]

        # Sort the masks by the predicted_iou in descending order
        masks.sort(key=lambda x: x["predicted_iou"], reverse=True)

        """
        masks is a list of dictionary.

        each dictionary has the following keys
        - "segmentation": the binary mask of the object (numpy array)
        - "predicted_iou": the predicted intersection over union (float)
        - "stability_score": the stability score of the mask (float)
        - "area": the area of the mask (int)
        - "bbox": the bounding box of the mask (list of int)
        """

        masks = self.filter(masks, min_area, min_confidence, max_iou)

        annotations = {"annotations": []}

        for idx, mask in enumerate(masks[: self.max_masks_num]):
            annotation = {
                "id": idx,
                "segmentation": encode_masks(mask["segmentation"]),
                "predicted_iou": mask["predicted_iou"],
                "stability_score": mask["stability_score"],
                "area": mask["area"],
                "image_id": 0,
                "bbox": mask["bbox"],
                "category_id": 0,
            }
            annotations["annotations"].append(annotation)

        return annotations

    def filter(
        self, masks: List[Dict], min_area: float, min_confidence: float, max_iou: float
    ) -> List[Dict]:
        """
        Filter masks by area fraction, confidence, and IoU overlap.
        Returns the surviving masks in their original order.
        """
        _logger.info(
            f"Filtering {len(masks)} masks with min_area={min_area}, "
            f"min_confidence={min_confidence}, max_iou={max_iou}"
        )

        t = time.time()
        keep_area = self.filter_by_area(masks, min_area)
        _logger.info(
            f"Filter by area: {time.time() - t:.2f}s — {len(keep_area)} remain"
        )

        t = time.time()
        keep_conf = self.filter_by_confidence(masks, min_confidence)
        _logger.info(
            f"Filter by confidence: {time.time() - t:.2f}s — {len(keep_conf)} remain"
        )

        # Apply area + confidence first so IoU NMS operates on fewer masks
        pre_filtered = sorted(keep_area & keep_conf)

        t = time.time()
        keep_iou = self.filter_by_iou([masks[i] for i in pre_filtered], max_iou)
        # keep_iou contains indices into the pre_filtered sub-list; map back
        keep_iou_global = {pre_filtered[i] for i in keep_iou}
        _logger.info(
            f"Filter by IoU: {time.time() - t:.2f}s — {len(keep_iou_global)} remain"
        )

        return [masks[i] for i in sorted(keep_iou_global)]

    def filter_by_area(self, masks: List[Dict], area_limit: float) -> Set[int]:
        """
        Return the 0-based indices of masks whose area is >= area_limit fraction
        of the total image area.  Uses SAM's pre-computed 'area' field — no decode needed.
        """
        if not masks:
            return set()

        seg = masks[0]["segmentation"]
        # Raw SAM output: numpy array with shape (H, W)
        total_area = seg.shape[0] * seg.shape[1]
        min_area = total_area * area_limit

        return {i for i, m in enumerate(masks) if m["area"] >= min_area}

    def filter_by_confidence(
        self, masks: List[Dict], confidence_limit: float
    ) -> Set[int]:
        """
        Return the 0-based indices of masks whose predicted_iou >= confidence_limit.
        """
        return {
            i for i, m in enumerate(masks) if m["predicted_iou"] >= confidence_limit
        }

    def filter_by_iou(self, masks: List[Dict], iou_limit: float) -> Set[int]:
        """
        Return the 0-based indices surviving NMS: when two masks overlap with
        IoU >= iou_limit the smaller one is discarded.
        """
        if not masks:
            return set()
        raw = [m["segmentation"] for m in masks]
        return set(self.filter_by_iou_(raw, iou_limit))

    def filter_by_iou_(
        self, masks: List[np.ndarray], iou_threshold: float = 0.5
    ) -> List[int]:
        """
        Given a list of 2D binary masks and an IoU threshold, filter out masks that overlap
        too much with already-kept masks (IoU > iou_threshold). In case of overlap, the
        mask with the smaller area is removed. We always keep the bigger mask.

        Args:
        masks (list of np.ndarray): A list of 2D binary arrays with shape (H, W).
        iou_threshold (float): The IoU threshold above which we consider two masks
                                overlapping "too much."

        Returns:
        A list of indices (relative to the input list) for the masks that are kept.
        """

        if len(masks) == 0:
            return []

        # Convert each 2D mask into a flattened 1D boolean array.
        # This shape will be (N, mask_height * mask_width)
        # Use dtype=bool or uint8 to reduce memory overhead and speed up calculations.
        N = len(masks)
        flattened_masks = []
        areas = np.zeros(N, dtype=np.float64)

        for i, mask in enumerate(masks):
            # Ensure mask is boolean for efficient bitwise ops and multiplication
            mask_bool = mask > 0
            flattened_masks.append(mask_bool.ravel())
            areas[i] = mask_bool.sum()

        # Stack into a single 2D array of shape (N, -1)
        # This operation can take time for large H*W, but it's done once.
        M = np.stack(flattened_masks, axis=0).astype(np.float32)  # shape: (N, H*W)

        # Compute intersection for every pair via matrix multiplication:
        # intersection[i, j] = sum(M[i, :] * M[j, :])
        # Because M is 0/1, multiplication is effectively a bitwise AND.
        # shape of intersection_matrix: (N, N)
        intersection_matrix = M @ M.T

        # For each mask i, area[i] is the total 1's in mask i.
        # union[i, j] = area[i] + area[j] - intersection[i, j]
        area_col = areas.reshape(-1, 1)  # shape: (N, 1)
        area_row = areas.reshape(1, -1)  # shape: (1, N)
        union_matrix = area_col + area_row - intersection_matrix

        # Compute the IoU matrix
        # Avoid division by zero -> only relevant if union=0 for some degenerate masks
        iou_matrix = intersection_matrix / np.clip(union_matrix, a_min=1, a_max=None)

        # Sort masks by area DESC (largest first)
        sorted_indices = np.argsort(areas)[::-1]

        suppressed = np.zeros(N, dtype=bool)  # Track whether a mask is suppressed
        keep = []  # Indices of masks to keep (in sorted order for now)

        for idx in sorted_indices:
            if not suppressed[idx]:
                # Keep this mask
                keep.append(idx)
                # Suppress all masks that have IoU above threshold with this mask
                to_suppress = iou_matrix[idx] >= iou_threshold
                suppressed[to_suppress] = True

        # Sort kept indices back in ascending order to match typical indexing order
        keep.sort()
        return keep
