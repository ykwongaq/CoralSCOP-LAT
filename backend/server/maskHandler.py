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


def _fill_polygons(
    h: int, w: int, polygons: List[List[List[float]]]
) -> np.ndarray:
    """Rasterize the union of the given polygons into an (H, W) bool mask."""
    canvas = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(canvas)
    for polygon in polygons:
        if len(polygon) < 3:
            continue
        pts = [(float(p[0]), float(p[1])) for p in polygon]
        draw.polygon(pts, fill=255)
    return np.asarray(canvas) > 0


def _rasterize_geometry(
    size: List[int],
    polygons: List[List[List[float]]],
    strokes: List[Dict],
    stroke_width: Optional[float] = None,
    base: Optional[Dict] = None,
    base_polygons: Optional[List[List[List[float]]]] = None,
) -> np.ndarray:
    """
    Rasterize polygon and brush-stroke geometry into a binary mask.

    Args:
        size: [height, width] of the output mask in image pixel space.
        polygons: list of polygons, each a list of [x, y] vertices.
        strokes: list of brush strokes, each
            {"points": [[x, y], ...], "width": optional, "erase": optional}.
            Strokes are applied in order; erase strokes clear pixels.
        stroke_width: default brush stroke width in image px (used when a
            stroke has no "width").
        base: optional existing mask (COCO RLE) to edit. When given, the
            polygons are treated as an edit of `base_polygons`: pixels inside
            the new polygons but not the old ones are added, pixels inside the
            old polygons but not the new ones are removed, and everything else
            keeps its value from `base` (so holes, other pieces and fine
            detail are preserved).
        base_polygons: the polygons as they were before editing (used with
            `base`).

    Returns:
        (H, W) uint8 binary mask (0/1): the polygon result, then strokes
        added or erased in order.
    """
    h, w = int(size[0]), int(size[1])
    if h <= 0 or w <= 0:
        raise ValueError(f"Invalid mask size: {size}")

    new_fill = _fill_polygons(h, w, polygons)
    if base is not None:
        mask = decode_mask(base).astype(bool)
        if mask.shape != (h, w):
            raise ValueError(
                f"Base mask size {list(mask.shape)} does not match size {size}"
            )
        old_fill = _fill_polygons(h, w, base_polygons or [])
        mask = (mask | (new_fill & ~old_fill)) & ~(old_fill & ~new_fill)
    else:
        mask = new_fill

    canvas = Image.fromarray(mask.astype(np.uint8) * 255, mode="L")
    draw = ImageDraw.Draw(canvas)

    if strokes:
        default_width = stroke_width if stroke_width is not None else 20
        for stroke in strokes:
            points = stroke["points"] if isinstance(stroke, dict) else stroke
            if not points:
                continue
            w = (
                stroke.get("width", default_width)
                if isinstance(stroke, dict)
                else default_width
            )
            width = max(1, int(round(w if w is not None else 20)))
            # Erase strokes paint background (0); strokes apply in order, so
            # a later add stroke can repaint an erased area and vice versa.
            erase = isinstance(stroke, dict) and bool(stroke.get("erase"))
            fill = 0 if erase else 255
            pts = [(float(p[0]), float(p[1])) for p in points]
            r = width / 2.0
            if len(pts) == 1:
                # A single tap: draw a filled disc of the stroke width.
                x, y = pts[0]
                draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)
            else:
                draw.line(pts, fill=fill, width=width, joint="curve")
                # Round end caps so strokes match the frontend preview.
                for x, y in (pts[0], pts[-1]):
                    draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)

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
        strokes: List[Dict],
        stroke_width: Optional[float] = None,
        base: Optional[Dict] = None,
        base_polygons: Optional[List[List[List[float]]]] = None,
    ) -> Dict:
        """
        Rasterize polygon/brush geometry into a binary mask and encode it
        as an uncompressed COCO RLE dict (same format as /api/sam/predict/).
        See _rasterize_geometry for how `base` / `base_polygons` are used.
        """
        mask = _rasterize_geometry(
            size, polygons, strokes, stroke_width, base, base_polygons
        )
        return encode_masks(mask)
