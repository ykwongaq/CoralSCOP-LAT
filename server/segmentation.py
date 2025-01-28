import io
import logging
import time
import numpy as np
import torch

from .segment_anything import SamAutomaticMaskGenerator, sam_model_registry
from .util.coco import encode_to_coco_mask, decode_coco_mask
from multiprocessing import Pool

from typing import List, Dict, Set


def compute_iou(mask1: np.ndarray, mask2: np.ndarray) -> float:
    """
    Compute the IoU between two 2D binary masks.
    mask1, mask2: 2D numpy arrays of shape (H, W) with values in {0, 1}.
    return: Intersection over Union (float).
    """
    intersection = np.sum(mask1 * mask2)
    union = np.sum(mask1) + np.sum(mask2) - intersection
    if union == 0:
        return 0.0
    return intersection / union


class CoralSegmentation:
    def __init__(
        self,
        model_path,
        model_type,
        point_number=32,
        iou_threshold=0.62,
        sta_threshold=0.62,
    ):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Initializing {self.__class__.__name__} ...")

        sam = sam_model_registry[model_type](checkpoint=model_path)
        device = ""
        if torch.cuda.is_available():
            device = "cuda"
        else:
            device = "cpu"

        device = torch.device(device)
        self.logger.info(f"Using device: {device}")
        sam.to(device=device)

        self.mask_generator = SamAutomaticMaskGenerator(
            model=sam,
            points_per_side=point_number,
            pred_iou_thresh=iou_threshold,
            stability_score_thresh=sta_threshold,
            crop_n_layers=1,
            crop_n_points_downscale_factor=2,
            min_mask_region_area=100,
        )

    def generate_masks_json(self, image: np.ndarray) -> List[Dict]:
        start_time = time.time()
        masks = self.mask_generator.generate(image)
        for idx, mask in enumerate(masks):
            mask["segmentation"] = encode_to_coco_mask(mask["segmentation"] > 0)
            mask["id"] = idx
            mask["iscrowd"] = 0
            mask["category_id"] = -1
            del mask["cate_preds"]
            del mask["fc_features"]
            del mask["point_coords"]
            del mask["stability_score"]
            del mask["crop_box"]
            del mask["similarity"]

        self.logger.info(f"Generate masks time: {time.time() - start_time:.2f} seconds")
        # Filter out the masks that the predicted_iou is null
        masks = [mask for mask in masks if mask["predicted_iou"] is not None]

        return masks

    def filter(
        self, masks: List[Dict], min_area: float, min_confidence: float, max_iou: float
    ) -> List[Dict]:
        """
        Filter out the masks
        """
        self.logger.info(
            f"Filtering masks with min_area: {min_area}, min_confidence: {min_confidence}, max_iou: {max_iou}"
        )

        self.logger.info(f"All indices: {list(range(len(masks)))}")

        start_time = time.time()
        filtered_index_by_area = self.filter_by_area(masks, min_area)
        self.logger.info(f"Filter by area: {time.time() - start_time:.2f} seconds")
        self.logger.info(f"Filtered result by area: {filtered_index_by_area}")

        start_time = time.time()
        filtered_index_by_confidence = self.filter_by_confidence(masks, min_confidence)
        self.logger.info(
            f"Filter by confidence: {time.time() - start_time:.2f} seconds"
        )
        self.logger.info(
            f"Filtered result by confidence: {filtered_index_by_confidence}"
        )

        start_time = time.time()
        filtered_index_by_iou = self.filter_by_iou(masks, max_iou)
        self.logger.info(f"Filter by iou: {time.time() - start_time:.2f} seconds")
        self.logger.info(f"Filtered result by iou: {filtered_index_by_iou}")

        filtered_index = (
            filtered_index_by_area
            & filtered_index_by_confidence
            & filtered_index_by_iou
        )
        self.logger.info(f"Filtered result: {filtered_index}")

        filtered_indices = list(filtered_index)
        masks = [masks[idx] for idx in filtered_indices]

        return masks

    def filter_by_area(self, annotations: List[Dict], area_limit: float) -> Set:
        """
        Filter out the masks which exceed the area limit
        """

        if len(annotations) == 0:
            return set()

        def decode_and_compute_area(annotation):
            mask = decode_coco_mask(annotation["segmentation"])
            area = np.sum(mask)
            return area

        image_size = annotations[0]["segmentation"]["size"]
        image_height = int(image_size[0])
        image_width = int(image_size[1])
        total_area = image_height * image_width
        min_area = total_area * area_limit

        filtered_index = set()
        for annotation in annotations:
            idx = annotation["id"]
            area = decode_and_compute_area(annotation)
            if area >= min_area:
                filtered_index.add(idx)

        return filtered_index

    def filter_by_confidence(
        self, annotations: List[Dict], confidence_limit: float
    ) -> Set:
        """
        Filter out the masks which have confidence lower than the confidence limit
        """
        filtered_index = set()
        for annotation in annotations:
            if annotation["predicted_iou"] >= confidence_limit:
                filtered_index.add(annotation["id"])

        return filtered_index

    def filter_by_iou(self, annotations: List[Dict], iou_limit: float) -> Set:
        """
        Filter out the masks which have iou lower than the iou limit
        """
        masks = [
            decode_coco_mask(annotation["segmentation"]) for annotation in annotations
        ]
        return set(self.filter_masks(masks, iou_limit))

    def filter_masks(
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
        areas = np.zeros(N, dtype=np.int32)

        for i, mask in enumerate(masks):
            # Ensure mask is boolean for efficient bitwise ops and multiplication
            mask_bool = mask > 0
            flattened_masks.append(mask_bool.ravel())
            areas[i] = mask_bool.sum()

        # Stack into a single 2D array of shape (N, -1)
        # This operation can take time for large H*W, but it's done once.
        M = np.stack(flattened_masks, axis=0).astype(np.uint8)  # shape: (N, H*W)

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
                to_suppress = iou_matrix[idx] > iou_threshold
                suppressed[to_suppress] = True

        # Sort kept indices back in ascending order to match typical indexing order
        keep.sort()
        return keep
