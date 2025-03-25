from pycocotools import mask as coco_mask
import numpy as np
from typing import Dict, List
import cv2


def is_rel_encoding(segmentation: Dict) -> bool:
    return "counts" in segmentation and "size" in segmentation


def is_polygon_encoding(segmentation: List) -> bool:
    return type(segmentation) == list


def rle_mask_to_rle_vis_encoding(segmentation: Dict) -> List[int]:
    arr = coco_mask.decode(segmentation)

    # Flatten the 2D array to a 1D array
    flat = arr.flatten()

    # Find the indices where the value changes
    diffs = np.diff(flat)
    change_indices = np.where(diffs != 0)[0] + 1

    # Include the start and end indices
    indices = np.concatenate(([0], change_indices, [len(flat)]))

    # Compute the run lengths
    run_lengths = np.diff(indices)

    # Ensure the encoding starts with zero
    if flat[0] == 0:
        return run_lengths.tolist()
    else:
        # Insert a zero at the beginning to start with zero
        return np.insert(run_lengths, 0, 0).tolist()


def numpy_mask_to_rle_mask(mask: np.ndarray) -> Dict:
    mask = mask.astype(np.uint8)
    mask = np.asfortranarray(mask)
    rle = coco_mask.encode(mask)

    # Make sure that the counts are in a string format
    rle["counts"] = rle["counts"].decode("utf-8")
    return rle


def decode_rle_mask(segmentation: Dict) -> np.ndarray:
    mask = coco_mask.decode(segmentation)
    return mask


def to_coco_annotation(mask: np.ndarray) -> Dict:
    """
    Convert the given mask into COCO annotation format

    Args:
        mask (np.ndarray): The mask to convert

    Returns:
        Dict: The COCO annotation format:
            {
                "id": int,
                "image_id": int,
                "category_id": int,
                "segmentation": Dict,
                "area": int,
                "bbox": List[int],
                "iscrowd": int,
            }
    """

    rle = coco_mask.encode(np.asfortranarray(mask.astype(np.uint8)))
    rle["counts"] = rle["counts"].decode("utf-8")

    bbox = coco_mask.toBbox(rle)
    bbox = bbox.tolist()
    bbox = [int(coord) for coord in bbox]

    area = int(coco_mask.area(rle))

    annotation = {
        "segmentation": rle,
        "bbox": bbox,
        "area": area,
        "category_id": -1,
        "id": -1,
        "image_id": -1,
        "iscrowd": 0,
    }
    return annotation


def rle_mask_to_poly_mask(rle: Dict) -> List[int]:
    mask = decode_rle_mask(rle)
    # Find contours using OpenCV
    contours, _ = cv2.findContours(
        mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    polygons = []
    for contour in contours:
        # Flatten the contour array and convert to a list
        polygon = contour.flatten().tolist()
        if (
            len(polygon) >= 6
        ):  # A valid polygon must have at least 3 points (6 coordinates)
            polygons.append(polygon)

    return polygons


def poly_mask_to_rle_mask(polygons: List[List[int]], height: int, width: int) -> Dict:
    mask = poly_mask_to_numpy_mask(polygons, height, width)
    return numpy_mask_to_rle_mask(mask)


def poly_mask_to_numpy_mask(
    polygons: List[List[int]], height: int, width: int
) -> np.ndarray:
    mask = np.zeros((height, width), dtype=np.uint8)
    for encoded_rle in coco_mask.frPyObjects(polygons, height, width):
        mask = np.maximum(mask, coco_mask.decode(encoded_rle))
    return mask
