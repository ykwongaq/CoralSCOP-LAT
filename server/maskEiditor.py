import logging
from typing import Dict, List

import cv2
import matplotlib.pyplot as plt
import numpy as np
import onnxruntime as ort

from .segment_anything.utils.transforms import ResizeLongestSide


class MaskEidtor:

    def __init__(self, onnx_path: str):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Loading ONNX model from {onnx_path}")

        self.ort_session = ort.InferenceSession(
            onnx_path, providers=["CPUExecutionProvider"]
        )
        self.image = None
        self.image_embedding = None
        self.image_size = None
        self.transforms = None
        self.inputs = []

        self.onnx_mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
        self.onnx_has_mask_input = np.zeros(1, dtype=np.float32)
        self.transforms = ResizeLongestSide(1024)

    def set_image(self, image, image_embedding):
        self.logger.info("Setting image and image embedding")
        self.image = image
        self.image_embedding = image_embedding

        self.image_size = image.shape[:2]
        self.logger.info(f"Image size: {self.image_size}")

    def add_input(self, x, y, label):
        self.logger.info(f"Adding input point: ({x}, {y}, {label})")
        self.inputs.append([x, y, label])

    def undo_input(self):
        self.logger.info("Undoing input point")
        if len(self.inputs) > 0:
            self.inputs.pop()

    def clear_inputs(self):
        self.logger.info("Clearing input points")
        self.inputs = []

    def get_input_points(self):
        points = []
        for input in self.inputs:
            points.append(input[:2])
        return points

    def get_input_labels(self):
        labels = []
        for input in self.inputs:
            labels.append(input[2])
        return labels

    def infer_mask(self, prompts: List[Dict]) -> np.ndarray:
        if self.image is None:
            return None

        input_points = self.get_input_points()
        input_labels = self.get_input_labels()

        if len(input_points) == 0:
            return np.zeros((self.image_size[0], self.image_size[1]), dtype=np.bool_)

        onnx_coord = np.array(input_points, dtype=np.float32)[None, :, :]
        onnx_coord = self.transforms.apply_coords(
            onnx_coord, self.image.shape[:2]
        ).astype(np.float32)

        onnx_label = np.array(input_labels, dtype=np.float32)[None, :].astype(
            np.float32
        )

        ort_inputs = {
            "image_embeddings": self.image_embedding,
            "point_coords": onnx_coord,
            "point_labels": onnx_label,
            "mask_input": self.onnx_mask_input,
            "has_mask_input": self.onnx_has_mask_input,
            "orig_im_size": np.array(self.image.shape[:2], dtype=np.float32),
        }

        masks, _, _ = self.ort_session.run(None, ort_inputs)
        masks = masks > 0.0
        masks = masks.squeeze()

        return masks
