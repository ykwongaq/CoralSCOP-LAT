from pycocotools import mask as maskUtils
import numpy as np

from typing import Dict, List, Optional


def encode_masks(mask: np.ndarray) -> Dict:
    """
    Encode the binary mask into uncompressed COCO RLE format.
    Returns {"size": [H, W], "counts": [c0, c1, ...]} where counts are
    column-major run lengths starting with the background count.
    This format can be decoded directly on the frontend without a server round-trip.
    """
    h, w = mask.shape
    flat = mask.astype(bool).ravel(order="F")  # column-major (COCO RLE convention)

    if len(flat) == 0:
        return {"size": [h, w], "counts": []}

    changes = np.where(np.diff(flat))[0] + 1
    boundaries = np.concatenate(([0], changes, [len(flat)]))
    counts = np.diff(boundaries).tolist()

    # COCO RLE must start with background count; prepend 0 if mask starts with foreground
    if flat[0]:
        counts = [0] + counts

    return {"size": [h, w], "counts": [int(c) for c in counts]}


def decode_mask(encoded_mask, height: int = None, width: int = None) -> np.ndarray:
    """
    Decode the RLE-encoded mask back into a binary mask
    """
    if isinstance(encoded_mask, list):
        assert (
            height is not None and width is not None
        ), "Height and width must be provided for dict-encoded masks"
        rles = maskUtils.frPyObjects(encoded_mask, height, width)
        rle = maskUtils.merge(rles)
        return maskUtils.decode(rle).astype(np.uint8)
    elif isinstance(encoded_mask, dict):
        if isinstance(encoded_mask.get("counts"), list):
            # Uncompressed RLE (list counts): convert to compressed first
            h, w = encoded_mask["size"]
            rle = maskUtils.frPyObjects(encoded_mask, h, w)
            return maskUtils.decode(rle).astype(np.uint8)
        return maskUtils.decode(encoded_mask).astype(np.uint8)
    else:
        raise ValueError("Invalid encoded mask format")
