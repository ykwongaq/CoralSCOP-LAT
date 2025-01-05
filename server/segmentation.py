import io
import logging
import time
import numpy as np
import torch

from .segment_anything import SamAutomaticMaskGenerator, sam_model_registry
from .util.coco import encode_to_coco_mask, decode_coco_mask

from typing import List, Dict, Set


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
        filtered_index = set()

        masks = [
            decode_coco_mask(annotation["segmentation"]) for annotation in annotations
        ]

        iou_matrix = self.calculate_iou_matrix(masks)
        areas = [annotation["area"] for annotation in annotations]

        filtered_indices = self.filter_masks_by_iou(iou_matrix, iou_limit, areas)

        keep = set()
        for filtered_index in filtered_indices:
            keep.add(annotations[filtered_index]["id"])

        return keep

    def calculate_iou_matrix(self, masks: List[np.ndarray]) -> np.ndarray:
        n = len(masks)
        masks = np.array(masks)

        # Flatten masks for easier broadcasting
        masks_flat = masks.reshape(n, -1)

        intersection = np.dot(masks_flat, masks_flat.T)
        area = np.sum(masks_flat, axis=1)
        union = area[:, None] + area[None, :] - intersection

        # Avoid division by zero
        union[union == 0] = 1e-10

        iou_mat = intersection / union
        return iou_mat

    def filter_masks_by_iou(
        self, iou_matrix: np.ndarray, threshold: float, areas: List[int]
    ) -> List[int]:

        n = iou_matrix.shape[0]
        filtered_indices = set()

        # Create a list of all indices sorted by area in descending order
        sorted_indices = sorted(range(n), key=lambda idx: areas[idx], reverse=True)

        keep_mask = np.zeros(n, dtype=bool)

        for idx in sorted_indices:
            if not keep_mask[idx]:
                filtered_indices.add(idx)
                # Mark all masks with IoU > threshold as kept
                keep_mask[iou_matrix[idx] > threshold] = True

        return filtered_indices
