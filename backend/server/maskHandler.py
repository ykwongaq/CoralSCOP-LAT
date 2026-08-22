import base64
from concurrent.futures import ProcessPoolExecutor
from typing import Dict, List, Optional

import numpy as np
from PIL import Image, ImageDraw
from pycocotools import mask as maskUtils

from .utils.logger import get_logger
from .utils.masks import decode_mask, encode_masks

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


def _rasterize_geometry(
    size: List[int],
    polygons: List[List[List[float]]],
    strokes: List[List[List[float]]],
    stroke_width: Optional[float] = None,
) -> np.ndarray:
    """
    Rasterize polygon and brush-stroke geometry into a binary mask.

    Args:
        size: [height, width] of the output mask in image pixel space.
        polygons: list of polygons, each a list of [x, y] vertices.
        strokes: list of brush polylines, each a list of [x, y] points.
        stroke_width: brush stroke width in image px (default 20).

    Returns:
        (H, W) uint8 binary mask (0/1) with all geometry unioned.
    """
    h, w = int(size[0]), int(size[1])
    if h <= 0 or w <= 0:
        raise ValueError(f"Invalid mask size: {size}")

    canvas = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(canvas)

    for polygon in polygons:
        if len(polygon) < 3:
            continue
        pts = [(float(p[0]), float(p[1])) for p in polygon]
        draw.polygon(pts, fill=255)

    if strokes:
        width = max(1, int(round(stroke_width if stroke_width is not None else 20)))
        for stroke in strokes:
            if len(stroke) == 0:
                continue
            pts = [(float(p[0]), float(p[1])) for p in stroke]
            if len(pts) == 1:
                # A single tap: draw a filled disc of the stroke width.
                x, y = pts[0]
                r = width / 2.0
                draw.ellipse([x - r, y - r, x + r, y + r], fill=255)
            else:
                draw.line(pts, fill=255, width=width, joint="curve")

    return (np.asarray(canvas) > 0).astype(np.uint8)


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

    def rasterize_masks(
        self,
        size: List[int],
        polygons: List[List[List[float]]],
        strokes: List[List[List[float]]],
        stroke_width: Optional[float] = None,
    ) -> Dict:
        """
        Rasterize polygon/brush geometry into a binary mask and encode it
        as an uncompressed COCO RLE dict (same format as /api/sam/predict/).
        """
        mask = _rasterize_geometry(size, polygons, strokes, stroke_width)
        return encode_masks(mask)
