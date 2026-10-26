"""CLAHE (Contrast Limited Adaptive Histogram Equalization) image enhancement."""

import io

import cv2
import numpy as np
from PIL import Image

# Settings used everywhere, so every enhanced image in a project is comparable.
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID_SIZE = 8

# Enhanced copies are stored as high-quality JPEG to keep .coral files small.
ENHANCED_IMAGE_EXT = ".jpg"
ENHANCED_JPEG_QUALITY = 95


def clahe_settings() -> dict:
    """Settings recorded in project_info.json so the result can be reproduced."""
    return {
        "method": "CLAHE",
        "clip_limit": CLAHE_CLIP_LIMIT,
        "tile_grid_size": CLAHE_TILE_GRID_SIZE,
        "color_space": "LAB (L channel only)",
    }


def apply_clahe(image: Image.Image) -> Image.Image:
    """
    Return a CLAHE-enhanced copy of an RGB image.

    Only the lightness channel (L in LAB) is equalized, so hues are mostly
    preserved. Width and height are unchanged, so masks drawn on the
    enhanced image line up exactly with the original.
    """
    rgb = np.asarray(image.convert("RGB"))
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(
        clipLimit=CLAHE_CLIP_LIMIT,
        tileGridSize=(CLAHE_TILE_GRID_SIZE, CLAHE_TILE_GRID_SIZE),
    )
    l_enhanced = clahe.apply(l_channel)

    enhanced_lab = cv2.merge((l_enhanced, a_channel, b_channel))
    enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)
    return Image.fromarray(enhanced_rgb)


def save_enhanced_image(image: Image.Image, path: str) -> None:
    """Save an enhanced image in the format used inside .coral files."""
    image.save(path, format="JPEG", quality=ENHANCED_JPEG_QUALITY)


def encode_enhanced_image(image: Image.Image) -> bytes:
    """Encode an enhanced image to bytes, in the same format as save_enhanced_image."""
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=ENHANCED_JPEG_QUALITY)
    return buf.getvalue()
