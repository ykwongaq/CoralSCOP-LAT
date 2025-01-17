import logging

import numpy as np
import onnxruntime as ort

from typing import Dict, List
from .segment_anything.utils.transforms import ResizeLongestSide


class Prompt:
    def __init__(self, prompt_info: Dict):
        self.x = prompt_info["imageX"]
        self.y = prompt_info["imageY"]
        self.label = prompt_info["label"]

    def get_x(self):
        return self.x

    def get_y(self):
        return self.y

    def get_label(self):
        return self.label


class MaskCreator:

    def __init__(self, onnx_path: str):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Loading ONNX model from {onnx_path}")

        self.ort_session = ort.InferenceSession(
            onnx_path, providers=["CPUExecutionProvider"]
        )
        self.image: np.ndarray = None
        self.image_embedding: np.ndarray = None
        self.image_size = None
        self.inputs: List = None

        self.onnx_mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
        self.onnx_has_mask_input = np.zeros(1, dtype=np.float32)
        self.transforms = ResizeLongestSide(1024)

    def set_image(self, image_embedding: np.ndarray, image_size: List[int]):
        self.image_embedding = image_embedding
        self.image_size = image_size

    def create_mask(self, prompts: List[Prompt]) -> np.ndarray:
        self.logger.info(f"Creating mask with {len(prompts)} prompts ...")
        if len(prompts) == 0:
            return np.zeros(self.image_size, dtype=np.uint8)

        input_points = []
        for prompt in prompts:
            input_points.append([prompt.get_x(), prompt.get_y()])

        input_labels = []
        for prompt in prompts:
            input_labels.append(prompt.get_label())

        onnx_coord = np.array(input_points, dtype=np.float32)[None, :, :]
        onnx_coord = self.transforms.apply_coords(onnx_coord, self.image_size).astype(
            np.float32
        )

        onnx_label = np.array(input_labels, dtype=np.float32)[None, :].astype(
            np.float32
        )

        ort_inputs = {
            "image_embeddings": self.image_embedding,
            "point_coords": onnx_coord,
            "point_labels": onnx_label,
            "mask_input": self.onnx_mask_input,
            "has_mask_input": self.onnx_has_mask_input,
            "orig_im_size": np.array(self.image_size, dtype=np.float32),
        }

        mask, _, _ = self.ort_session.run(None, ort_inputs)
        mask = mask > 0.0
        mask = mask.squeeze()

        return mask
