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

        self.encoder = ort.InferenceSession(model_path)
        # self.model_path = model_path
        # self.model_type = model_type
        # self.model = sam_model_registry[model_type](checkpoint=model_path)

        # device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # self.logger.info(f"Using device: {device}")
        # self.model = self.model.to(device)
        # self.predictor = SamPredictor(self.model)

    def generate_embedding(self, image: np.ndarray) -> np.ndarray:
        start_time = time.time()
        input_tensor = preprocess_image(Image.fromarray(image))
        outputs = self.encoder.run(None, {"images": input_tensor})
        self.logger.info(
            f"Generate embedding time: {time.time() - start_time:.2f} seconds"
        )
        return outputs[0]
        # self.predictor.set_image(image)
        # return self.predictor.get_image_embedding().cpu().numpy()
