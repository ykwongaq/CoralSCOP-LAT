import logging

import numpy as np
import onnxruntime as ort
import torch

from typing import Dict, List
from .segment_anything.utils.transforms import ResizeLongestSide
from .segment_anything import sam_model_registry, SamPredictor


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
    def __init__(self, model_path: str):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Loading model from {model_path}")

        sam = sam_model_registry["vit_b"](checkpoint=model_path)
        device = ""
        if torch.cuda.is_available():
            device = "cuda"
        else:
            device = "cpu"

        device = torch.device(device)
        self.device = device
        self.logger.info(f"Using device: {device}")
        sam.to(device=device)

        self.predictor = SamPredictor(sam)

        self.image: np.ndarray = None
        self.image_embedding: np.ndarray = None
        self.image_size = None
        self.inputs: List = None

        self.default_mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
        self.default_has_mask_input = np.zeros(1, dtype=np.float32)
        # self.transforms = ResizeLongestSide(1024)
        self.transforms = ResizeLongestSide(sam.image_encoder.img_size)

        self.low_res_logits = None

    def set_image(self, image_embedding: np.ndarray, image_size: List[int]):
        self.image_embedding = torch.from_numpy(image_embedding).to(self.device)
        self.image_size = image_size
        self.low_res_logits = None
        self.input_size = self.transforms.get_preprocess_shape(
            image_size[0], image_size[1], self.transforms.target_length
        )

    def create_mask(self, prompts: List[Prompt]) -> np.ndarray:
        self.logger.info(f"Creating mask with {len(prompts)} prompts ...")
        if len(prompts) == 0:
            return np.zeros(self.image_size, dtype=np.uint8)

        input_points = []
        for prompt in prompts:
            input_points.append([prompt.get_x(), prompt.get_y()])
        input_points = np.array(input_points)

        input_labels = []
        for prompt in prompts:
            input_labels.append(prompt.get_label())
        input_labels = np.array(input_labels)

        if self.low_res_logits is not None:
            mask_input = self.low_res_logits
            has_mask_input = np.ones(1, dtype=np.float32)
        else:
            mask_input = None
            has_mask_input = self.default_has_mask_input

        mask, iou_scores, low_res_logits = self.predictor.predict_with_embedding(
            self.image_embedding,
            self.image_size,
            self.input_size,
            input_points,
            input_labels,
            mask_input=mask_input,
        )

        self.low_res_logits = low_res_logits
        self.logger.debug(f"mask shape: {mask.shape}")
        self.logger.debug(f"low_res_logits shape: {low_res_logits.shape}")
        self.logger.debug(f"logist: {low_res_logits}")
        mask = mask > 0.5
        mask = mask.squeeze()
        return mask


# class MaskCreator:

#     def __init__(self, onnx_path: str):
#         self.logger = logging.getLogger(self.__class__.__name__)
#         self.logger.info(f"Loading ONNX model from {onnx_path}")

#         providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
#         self.logger.info(f"Available providers: {providers}")
#         self.ort_session = ort.InferenceSession(onnx_path, providers=providers)
#         self.image: np.ndarray = None
#         self.image_embedding: np.ndarray = None
#         self.image_size = None
#         self.inputs: List = None

#         self.default_mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
#         self.default_has_mask_input = np.zeros(1, dtype=np.float32)
#         self.transforms = ResizeLongestSide(1024)

#         self.low_res_logits = None

#     def set_image(self, image_embedding: np.ndarray, image_size: List[int]):
#         self.image_embedding = image_embedding
#         self.image_size = image_size
#         self.low_res_logits = None

#     def create_mask(self, prompts: List[Prompt]) -> np.ndarray:
#         self.logger.info(f"Creating mask with {len(prompts)} prompts ...")
#         if len(prompts) == 0:
#             return np.zeros(self.image_size, dtype=np.uint8)

#         input_points = []
#         for prompt in prompts:
#             input_points.append([prompt.get_x(), prompt.get_y()])

#         input_labels = []
#         for prompt in prompts:
#             input_labels.append(prompt.get_label())

#         onnx_coord = np.array(input_points, dtype=np.float32)[None, :, :]
#         onnx_coord = self.transforms.apply_coords(onnx_coord, self.image_size).astype(
#             np.float32
#         )

#         onnx_label = np.array(input_labels, dtype=np.float32)[None, :].astype(
#             np.float32
#         )

#         if self.low_res_logits is not None:
#             mask_input = self.low_res_logits
#             has_mask_input = np.ones(1, dtype=np.float32)
#         else:
#             mask_input = self.default_mask_input
#             has_mask_input = self.default_has_mask_input

#         ort_inputs = {
#             "image_embeddings": self.image_embedding,
#             "point_coords": onnx_coord,
#             "point_labels": onnx_label,
#             "mask_input": mask_input,
#             "has_mask_input": has_mask_input,
#             "orig_im_size": np.array(self.image_size, dtype=np.float32),
#         }

#         mask, _, low_res_logits = self.ort_session.run(None, ort_inputs)
#         mask = mask > 0.5
#         mask = mask.squeeze()

#         self.low_res_logits = low_res_logits

#         return mask
