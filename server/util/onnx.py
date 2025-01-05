import numpy as np

from PIL import Image
from typing import Tuple, Dict, List, Union

def determine_sam_input_shape(image: Image) -> Tuple[int, int]:
    ori_width, ori_height = image.size

    resized_width, resized_height = image.size

    if ori_width > ori_height:
        resized_width = 1024
        resized_height = int(1024 / ori_width * ori_height)
    else:
        resized_height = 1024
        resized_width = int(1024 / ori_height * ori_width)

    return resized_width, resized_height

def preprocess_image(image: Image) -> np.ndarray:
    resized_width, resized_height = determine_sam_input_shape(image)

    image = image.resize((resized_width, resized_height), Image.Resampling.BILINEAR)

    input_tensor = np.array(image)

    mean = np.array([123.675, 116.28, 103.53])
    std = np.array([[58.395, 57.12, 57.375]])

    input_tensor = (input_tensor - mean) / std
    input_tensor = input_tensor.transpose(2,0,1)[None,:,:,:].astype(np.float32)

    if resized_height < resized_width:
        input_tensor = np.pad(input_tensor,((0,0),(0,0),(0,1024-resized_height),(0,0)))
    else:
        input_tensor = np.pad(input_tensor,((0,0),(0,0),(0,0),(0,1024-resized_width)))
    
    return input_tensor

def preprocess_point(input_point: Union[np.ndarray, List[List[int]]], ori_width: int, ori_height: int, resized_width: int, resized_height: int) -> np.ndarray:
    """
    input_point: (N, 2)
    input_label: (N,)
    """
    if isinstance(input_point, list):
        input_point = np.array(input_point)

    # Add a batch index 
    onnx_coord = input_point[None, :, :]
    coords = np.copy(onnx_coord).astype(float)
    coords[..., 0] = coords[..., 0] * (resized_width / ori_width)
    coords[..., 1] = coords[..., 1] * (resized_height / ori_height)

    return coords.astype("float32")

def preprocess_labels(labels: Union[np.ndarray, List[int]]) -> np.ndarray:
    if isinstance(labels, list):
        labels = np.array(labels)
    return labels[None, :].astype(np.float32)   