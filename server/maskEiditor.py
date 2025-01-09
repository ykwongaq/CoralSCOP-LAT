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


# def show_mask(mask, ax):
#     color = np.array([30/255, 144/255, 255/255, 0.6])
#     h, w = mask.shape[-2:]
#     mask_image = mask.reshape(h, w, 1) * color.reshape(1, 1, -1)
#     ax.imshow(mask_image)

# def show_points(coords, labels, ax, marker_size=375):
#     pos_points = coords[labels==1]
#     neg_points = coords[labels==0]
#     ax.scatter(pos_points[:, 0], pos_points[:, 1], color='green', marker='*', s=marker_size, edgecolor='white', linewidth=1.25)
#     ax.scatter(neg_points[:, 0], neg_points[:, 1], color='red', marker='*', s=marker_size, edgecolor='white', linewidth=1.25)

# def show_box(box, ax):
#     x0, y0 = box[0], box[1]
#     w, h = box[2] - box[0], box[3] - box[1]
#     ax.add_patch(plt.Rectangle((x0, y0), w, h, edgecolor='green', facecolor=(0,0,0,0), lw=2))


# if __name__ == "__main__":
#     image_path = "C://Users//WYK//Desktop//project//data//images//coral_4.jpeg"
#     image_embedding_path = "C://Users//WYK//Desktop//project//data//embeddings//coral_4.npy"
#     onnx_path = "C://Users//WYK//OneDrive - HKUST Connect//Mphil//Research//MarineVOS//ImageAnnotator//CoralSpecies_eel//models//sam_vit_b.onnx"

#     ort_session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])

#     image = cv2.imread(image_path)
#     image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
#     image_embedding = np.load(image_embedding_path)

#     input_point = np.array([[500, 375]])
#     input_label = np.array([1])

#     onnx_coord = np.concatenate([input_point, np.array([[0.0, 0.0]])], axis=0)[None, :, :]
#     onnx_label = np.concatenate([input_label, np.array([-1])], axis=0)[None, :].astype(
#         np.float32
#     )

#     transforms = ResizeLongestSide()
#     onnx_coord = transforms.apply_coords(onnx_coord, image.shape[:2]).astype(
#         np.float32
#     )

#     onnx_mask_input = np.zeros((1, 1, 256, 256), dtype=np.float32)
#     onnx_has_mask_input = np.zeros(1, dtype=np.float32)

#     ort_inputs = {
#         "image_embeddings": image_embedding,
#         "point_coords": onnx_coord,
#         "point_labels": onnx_label,
#         "mask_input": onnx_mask_input,
#         "has_mask_input": onnx_has_mask_input,
#         "orig_im_size": np.array(image.shape[:2], dtype=np.float32),
#     }

#     masks, _, low_res_logits = ort_session.run(None, ort_inputs)
#     masks = masks > 0.0

#     plt.figure(figsize=(10, 10))
#     plt.imshow(image)
#     show_mask(masks, plt.gca())
#     show_points(input_point, input_label, plt.gca())
#     plt.axis("off")
#     plt.show()
