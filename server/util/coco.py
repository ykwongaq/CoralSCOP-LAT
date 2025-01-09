from pycocotools import mask as coco_mask
import numpy as np
from typing import Dict, List


def coco_mask_to_rle(segmentation: Dict) -> List[int]:
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


def encode_to_coco_mask(mask: np.ndarray) -> Dict:
    mask = mask.astype(np.uint8)
    mask = np.asfortranarray(mask)
    rle = coco_mask.encode(mask)

    # Make sure that the counts are in a string format
    rle["counts"] = rle["counts"].decode("utf-8")
    return rle


def decode_coco_mask(segmentation: Dict) -> np.ndarray:
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
