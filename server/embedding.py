import numpy as np
import torch
import logging
import onnxruntime as ort
import time
from PIL import Image
from segment_anything import sam_model_registry, SamPredictor
from .util.onnx import preprocess_image


class EmbeddingGenerator:
    def __init__(self, model_path):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Initializing {self.__class__.__name__} ...")
        self.logger.info(f"Loading model from {model_path}")

        execution_providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        self.encoder = ort.InferenceSession(model_path, providers=execution_providers)

    def generate_embedding(self, image: np.ndarray) -> np.ndarray:
        start_time = time.time()
        input_tensor = preprocess_image(Image.fromarray(image))
        outputs = self.encoder.run(None, {"images": input_tensor})
        self.logger.info(
            f"Generate embedding time: {time.time() - start_time:.2f} seconds"
        )
        return outputs[0]
