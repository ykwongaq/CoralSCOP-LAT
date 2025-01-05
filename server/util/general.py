import base64
import numpy as np
import logging
import os
import sys
import json
import time

from PIL import Image
from io import BytesIO
from functools import wraps

logger = logging.getLogger("GeneralUtil")


def time_it(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        logger.debug(f"{func.__name__} took {end - start} seconds")
        return result

    return wrapper


def decode_image_url(image_url):
    encoded = remove_image_url_header(image_url)
    data = base64.b64decode(encoded)

    image = Image.open(BytesIO(data))
    
    if image.mode == "RGBA":
        image = image.convert("RGB") 
    image = np.array(image)
    return image


def remove_image_url_header(image_url):
    return image_url.split(",")[1]


def get_resource_path(relative_path):
    """Get the absolute path to a resource, works for dev and for PyInstaller"""
    try:
        # PyInstaller creates a temporary folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)


def load_image_from_content(content):
    try:
        image_data = base64.b64decode(content)
        image = Image.open(BytesIO(image_data))
        return np.array(image)
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return None


def load_json_from_content(content):
    try:
        decodes_bytes = base64.b64decode(content)
        json_str = decodes_bytes.decode("utf-8")
        return json.loads(json_str)
    except Exception as e:
        logger.error(f"Error processing json: {e}")
        return None


def load_numpy_from_content(content):
    try:
        numpy_data = base64.b64decode(content)
        return np.load(BytesIO(numpy_data))
    except Exception as e:
        logger.error(f"Error processing numpy: {e}")
        return None
