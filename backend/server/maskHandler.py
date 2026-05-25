import base64
from concurrent.futures import ProcessPoolExecutor
from typing import Dict, List

import numpy as np
from pycocotools import mask as maskUtils

from .utils.logger import get_logger
from .utils.masks import decode_mask

_logger = get_logger(__name__)


def _encode_single_rle(rle: Dict) -> Dict:
    """
    Convert an uncompressed COCO RLE dict (list counts) to a compressed COCO RLE dict
    (string counts) using pycocotools directly — no numpy decode/encode roundtrip.
    Module-level so it is picklable by ProcessPoolExecutor.
    """
    h, w = rle["size"][0], rle["size"][1]
    compressed = maskUtils.frPyObjects([rle], h, w)[0]
    counts = compressed["counts"]
    if isinstance(counts, bytes):
        counts = counts.decode("utf-8")
    return {"size": [h, w], "counts": counts}


def _decode_single_rle(rle: Dict) -> str:
    """
    Decode one COCO-RLE dict into a base64 flat row-major byte string.
    Module-level so it is picklable by ProcessPoolExecutor.
    """
    mask = decode_mask(rle)  # numpy (H, W), Fortran-order from pycocotools
    return base64.b64encode(mask.flatten().tobytes()).decode("utf-8")


class MaskHandler:
    """
    Handles encoding and decoding of COCO-format RLE masks.

    decode_masks parallelises work across a ProcessPoolExecutor so that
    CPU-bound pycocotools calls run concurrently for large batches.
    """

    # Only spawn a pool when the batch is large enough to offset fork overhead.
    _MULTIPROCESS_THRESHOLD = 4

    def decode_masks(self, masks: List[Dict]) -> List[str]:
        """
        Decode a list of COCO RLE dicts into base64 flat row-major byte strings.
        Uses multiprocessing for batches above the threshold.
        """
        if len(masks) < self._MULTIPROCESS_THRESHOLD:
            return [_decode_single_rle(m) for m in masks]

        with ProcessPoolExecutor() as executor:
            return list(executor.map(_decode_single_rle, masks))

    def encode_masks(self, masks: List[Dict]) -> List[Dict]:
        """
        Encode a list of RLE dicts (with "size" and "counts" as list of ints) into COCO RLE dicts with compressed counts string.
        Uses pycocotools directly (no numpy roundtrip) and multiprocessing for large batches.
        """
        if len(masks) < self._MULTIPROCESS_THRESHOLD:
            return [_encode_single_rle(m) for m in masks]

        with ProcessPoolExecutor() as executor:
            return list(executor.map(_encode_single_rle, masks))
