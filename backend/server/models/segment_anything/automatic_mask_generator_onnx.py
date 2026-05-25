import numpy as np
from typing import Tuple
from PIL import Image

import multiprocessing

from typing import Any, Dict, List, Optional, Tuple
from copy import deepcopy
from ..util.onnx import preprocess_image, preprocess_point, preprocess_labels
import onnxruntime as ort
import torch

from .build_sam import sam_model_registry
from .predictor import SamPredictor
from .utils.onnx import SamOnnxModel

from .utils.amg_numpy import (
    MaskData,
    area_from_rle,
    batch_iterator,
    batched_mask_to_box,
    box_xyxy_to_xywh,
    build_all_layer_point_grids,
    calculate_stability_score,
    coco_encode_rle,
    generate_crop_boxes,
    is_box_near_crop_edge,
    mask_to_rle_numpy,
    remove_small_regions,
    rle_to_mask,
    uncrop_boxes_xyxy,
    uncrop_masks,
    uncrop_points,
)

def normalize(input: np.ndarray, p: float = 2.0, dim: int = 1, eps: float = 1e-12, out: Optional[np.ndarray] = None) -> np.ndarray:
    """
    Perform L_p normalization of inputs over the specified dimension.

    Args:
        input (np.ndarray): Input array of any shape.
        p (float): The exponent value in the norm formulation. Default: 2.
        dim (int): The dimension to reduce. Default: 1.
        eps (float): Small value to avoid division by zero. Default: 1e-12.
        out (np.ndarray, optional): The output array. If provided, the result will be stored in this array.

    Returns:
        np.ndarray: The normalized array.
    """
    norm = np.linalg.norm(input, ord=p, axis=dim, keepdims=True)
    norm = np.maximum(norm, eps)
    
    if out is None:
        return input / norm
    else:
        np.divide(input, norm, out=out)
        return out

def nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float) -> np.ndarray:
    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]

    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]

    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        w = np.maximum(0, xx2 - xx1)
        h = np.maximum(0, yy2 - yy1)
        inter = w * h
        iou = inter / (areas[i] + areas[order[1:]] - inter)

        inds = np.where(iou <= iou_threshold)[0]
        order = order[inds + 1]

    return np.array(keep)

def batched_nms(
    boxes: np.ndarray,
    scores: np.ndarray,
    idxs: np.ndarray,
    iou_threshold: float,
) -> np.ndarray:
    unique_classes = np.unique(idxs)
    keep_mask = np.zeros_like(scores, dtype=bool)

    for cls in unique_classes:
        cls_indices = np.where(idxs == cls)[0]
        cls_keep_indices = nms(boxes[cls_indices], scores[cls_indices], iou_threshold)
        keep_mask[cls_indices[cls_keep_indices]] = True

    keep_indices = np.where(keep_mask)[0]
    return keep_indices[scores[keep_indices].argsort()[::-1]]

def box_area(boxes: np.ndarray) -> np.ndarray:
    return (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])

class SamAutomaticMaskGeneratorOnnx:
    def __init__(
        self,
        encoder_onnx: ort.InferenceSession,
        decoder_onnx: ort.InferenceSession,
        points_per_side: Optional[int] = 32,
        points_per_batch: int = 64,
        pred_iou_thresh: float = 0.88,
        stability_score_thresh: float = 0.95,
        stability_score_offset: float = 1.0,
        box_nms_thresh: float = 0.7,
        crop_n_layers: int = 0,
        crop_nms_thresh: float = 0.7,
        crop_overlap_ratio: float = 512 / 1500,
        crop_n_points_downscale_factor: int = 1,
        point_grids: Optional[List[np.ndarray]] = None,
        min_mask_region_area: int = 0,
        output_mode: str = "binary_mask",
    ) -> None:
        assert (points_per_side is None) != (point_grids is None), \
            "Exactly one of points_per_side or point_grid must be provided."
        if points_per_side is not None:
            self.point_grids = build_all_layer_point_grids(
                points_per_side,
                crop_n_layers,
                crop_n_points_downscale_factor,
            )
        elif point_grids is not None:
            self.point_grids = point_grids
        else:
            raise ValueError("Can't have both points_per_side and point_grid be None.")

        assert output_mode in ["binary_mask", "uncompressed_rle", "coco_rle"], \
            f"Unknown output_mode {output_mode}."

        self.points_per_batch = points_per_batch
        self.pred_iou_thresh = pred_iou_thresh
        self.stability_score_thresh = stability_score_thresh
        self.stability_score_offset = stability_score_offset
        self.box_nms_thresh = box_nms_thresh
        self.crop_n_layers = crop_n_layers
        self.crop_nms_thresh = crop_nms_thresh
        self.crop_overlap_ratio = crop_overlap_ratio
        self.crop_n_points_downscale_factor = crop_n_points_downscale_factor
        self.min_mask_region_area = min_mask_region_area
        self.output_mode = output_mode

        self.encoder_onnx = encoder_onnx    
        self.decoder_onnx = decoder_onnx
        self.mask_threshold = 0.0

    def generate(self, image: np.ndarray) -> List[Dict[str, Any]]:
        mask_data = self._generate_masks(image)

        if self.min_mask_region_area > 0:
            mask_data = self.postprocess_small_regions(
                mask_data,
                self.min_mask_region_area,
                max(self.box_nms_thresh, self.crop_nms_thresh),
            )

        if self.output_mode == "coco_rle":
            mask_data["segmentations"] = [coco_encode_rle(rle) for rle in mask_data["rles"]]
        elif self.output_mode == "binary_mask":
            mask_data["segmentations"] = [rle_to_mask(rle) for rle in mask_data["rles"]]
        else:
            mask_data["segmentations"] = mask_data["rles"]

        curr_anns = []
        for idx in range(len(mask_data["segmentations"])):
            ann = {
                "segmentation": mask_data["segmentations"][idx],
                "area": area_from_rle(mask_data["rles"][idx]),
                "bbox": box_xyxy_to_xywh(mask_data["boxes"][idx]).tolist(),
                "predicted_iou": float(mask_data["iou_preds"][idx]),
                "point_coords": [mask_data["points"][idx].tolist()],
                "stability_score": float(mask_data["stability_score"][idx]),
                "crop_box": box_xyxy_to_xywh(mask_data["crop_boxes"][idx]).tolist(),
            }
            curr_anns.append(ann)

        return curr_anns

    def _generate_masks(self, image: np.ndarray) -> MaskData:
        orig_size = image.shape[:2]
        crop_boxes, layer_idxs = generate_crop_boxes(
            orig_size, self.crop_n_layers, self.crop_overlap_ratio
        )

        data = MaskData()
        for crop_box, layer_idx in zip(crop_boxes, layer_idxs):
            crop_data = self._process_crop(image, crop_box, layer_idx, orig_size)
            data.cat(crop_data)

        if len(crop_boxes) > 1:
            scores = 1 / box_area(data["crop_boxes"])
            keep_by_nms = nms(
                data["boxes"].astype(float),
                scores,
                iou_threshold=self.crop_nms_thresh,
            )
            data.filter(keep_by_nms)

        fc_features = normalize(data["fc_features"], dim=-1)
        similarity = np.dot(fc_features, fc_features.T)
        np.fill_diagonal(similarity, -np.inf)
        data["similarity"] = similarity
        data.to_numpy()
        return data

    def _process_crop(
        self,
        image: np.ndarray,
        crop_box: List[int],
        crop_layer_idx: int,
        orig_size: Tuple[int, ...],
    ) -> MaskData:
        x0, y0, x1, y1 = crop_box
        cropped_im = image[y0:y1, x0:x1, :]
        cropped_im_size = cropped_im.shape[:2]

        points_scale = np.array(cropped_im_size)[None, ::-1]
        points_for_image = self.point_grids[crop_layer_idx] * points_scale


        data = MaskData()
        for (points,) in batch_iterator(self.points_per_batch, points_for_image):
            batch_data = self._process_batch(cropped_im, points, cropped_im_size, crop_box, orig_size)
            data.cat(batch_data)
            del batch_data

        keep_by_nms = nms(
            data["boxes"].astype(float),
            data["iou_preds"],
            iou_threshold=self.box_nms_thresh,
        )
        data.filter(keep_by_nms)

        data["boxes"] = uncrop_boxes_xyxy(data["boxes"], crop_box)
        data["points"] = uncrop_points(data["points"], crop_box)
        data["crop_boxes"] = np.array([crop_box for _ in range(len(data["rles"]))])
        return data

    def _process_batch(
        self,
        image: np.ndarray,
        points: np.ndarray,
        im_size: Tuple[int, ...],
        crop_box: List[int],
        orig_size: Tuple[int, ...],
    ) -> MaskData:
        orig_h, orig_w = orig_size

        image = Image.fromarray(image)
        input_image_width, input_image_height = image.size
        input_tensor = preprocess_image(image)
        resized_width, resized_height = input_tensor.shape[3], input_tensor.shape[2]

        outputs = self.encoder_onnx.run(None, {"images": input_tensor})
        embeddings = outputs[0]

        bs = points.shape[0]
        onnx_coord_batch = preprocess_point(points, input_image_width, input_image_height, resized_width, resized_height)
        onnx_label_batch = np.ones(len(points), dtype=np.int32)
        onnx_label_batch = preprocess_labels(onnx_label_batch)

        onnx_mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
        onnx_has_mask_input = np.zeros(1, dtype=np.float32)

        masks = np.zeros((bs, input_image_height, input_image_width), dtype=np.float32)
        iou_preds = np.zeros((bs), dtype=np.float32)
        cate_preds = np.zeros((bs), dtype=np.float32)
        fc_features = np.zeros((bs, 256), dtype=np.float32)

        # Process the point one by one
        for i in range(bs):
            onnx_coord = onnx_coord_batch[:, i, :][:, None, :]
            onnx_label = onnx_label_batch[:, i][None, :]

            mask, iou_pred, _, cate_pred, fc_feature = self.decoder_onnx.run(None, {
                "image_embeddings": embeddings,
                "point_coords": onnx_coord,
                "point_labels": onnx_label,
                "mask_input": onnx_mask_input,
                "has_mask_input": onnx_has_mask_input,
                "orig_im_size": np.array([input_image_height, input_image_width], dtype=np.float32)
            })

            cate_pred = np.argmax(cate_pred, axis=2)[0]
            masks[i] = mask
            iou_preds[i] = iou_pred
            cate_preds[i] = cate_pred
            fc_features[i] = fc_feature

        data = MaskData(
            masks=masks,
            iou_preds=iou_preds,
            cate_preds=cate_preds,
            fc_features=fc_features,
            points=points,
        )

        del masks
        del fc_features

        keep_mask = data["cate_preds"] > 0
        print(f"number of masks filtered by cate_preds: {np.sum(~keep_mask)}")
        data.filter(keep_mask)

        if self.pred_iou_thresh > 0.0:
            keep_mask = data["iou_preds"] > self.pred_iou_thresh
            print(f"number of masks filtered by iou_preds: {np.sum(~keep_mask)}")
            data.filter(keep_mask)

        data["stability_score"] = calculate_stability_score(
            data["masks"], self.mask_threshold, self.stability_score_offset
        )
        if self.stability_score_thresh > 0.0:
            keep_mask = data["stability_score"] >= self.stability_score_thresh
            print(f"number of masks filtered by stability_score: {np.sum(~keep_mask)}")
            data.filter(keep_mask)

        data["masks"] = data["masks"] > self.mask_threshold
        data["boxes"] = batched_mask_to_box(data["masks"])

        keep_mask = ~is_box_near_crop_edge(data["boxes"], crop_box, [0, 0, orig_w, orig_h])
        if not np.all(keep_mask):
            print(f"number of masks filtered by crop edge: {np.sum(~keep_mask)}")
            data.filter(keep_mask)

        data["masks"] = uncrop_masks(data["masks"], crop_box, orig_h, orig_w)
        data["rles"] = mask_to_rle_numpy(data["masks"])

        print(f"num of masks: {data['masks'].shape[0]}")
        del data["masks"]

        return data

    @staticmethod
    def postprocess_small_regions(
        mask_data: MaskData, min_area: int, nms_thresh: float
    ) -> MaskData:
        if len(mask_data["rles"]) == 0:
            return mask_data

        new_masks = []
        scores = []
        for rle in mask_data["rles"]:
            mask = rle_to_mask(rle)

            mask, changed = remove_small_regions(mask, min_area, mode="holes")
            unchanged = not changed
            mask, changed = remove_small_regions(mask, min_area, mode="islands")
            unchanged = unchanged and not changed

            new_masks.append(mask[np.newaxis, ...])
            scores.append(float(unchanged))

        masks = np.concatenate(new_masks, axis=0)
        boxes = batched_mask_to_box(masks)
        keep_by_nms = nms(
            boxes.astype(float),
            np.array(scores),
            iou_threshold=nms_thresh,
        )

        for i_mask in keep_by_nms:
            if scores[i_mask] == 0.0:
                mask_data["rles"][i_mask] = mask_to_rle_numpy(masks[i_mask:i_mask + 1])[0]
                mask_data["boxes"][i_mask] = boxes[i_mask]
        mask_data.filter(keep_by_nms)

        return mask_data
    

