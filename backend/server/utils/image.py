"""Image utility functions for handling uploaded files."""

import io
from typing import Union

from fastapi import UploadFile
from PIL import Image


async def read_uploaded_image(
    upload: Union[UploadFile, bytes],
    mode: str = "RGB",
) -> Image.Image:
    """
    Convert an uploaded file or raw bytes into a PIL Image.

    Args:
        upload: Either a FastAPI UploadFile or raw bytes containing image data.
        mode: The desired color mode for the output image. Defaults to "RGB".
              Common modes: "RGB", "RGBA", "L" (grayscale), "P" (palette).

    Returns:
        A PIL Image object in the specified color mode.

    Raises:
        ValueError: If the file cannot be read or is not a valid image.
        IOError: If the image data is corrupted or unsupported.

    Examples:
        # Using with FastAPI UploadFile
        @app.post("/upload")
        async def upload_image(file: UploadFile = File(...)):
            image = await read_uploaded_image(file)
            # Process image...

        # Using with raw bytes
        raw_bytes = b'...'  # image data
        image = await read_uploaded_image(raw_bytes)
    """
    try:
        if hasattr(upload, "read"):
            contents = await upload.read()
        else:
            contents = upload

        image = Image.open(io.BytesIO(contents))

        # Convert to desired mode if specified and different from current
        if mode and image.mode != mode:
            image = image.convert(mode)

        return image

    except Exception as exc:
        filename = getattr(upload, "filename", "<bytes>")
        raise ValueError(f"Failed to read image '{filename}': {exc}") from exc
