import numpy as np
import torch
import logging
import onnxruntime as ort
import time
from PIL import Image
from .segment_anything import sam_model_registry, SamPredictor
from .util.onnx import preprocess_image


class EmbeddingGenerator:
    def __init__(self, model_path):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Initializing {self.__class__.__name__} ...")
        self.logger.info(f"Loading model from {model_path}")

        sam = sam_model_registry["vit_b"](checkpoint=model_path)
        device = ""
        if torch.cuda.is_available():
            device = "cuda"
        else:
            device = "cpu"

        device = torch.device(device)
        self.logger.info(f"Using device: {device}")
        sam.to(device=device)

        self.predictor = SamPredictor(sam)

    def generate_embedding(self, image: np.ndarray) -> np.ndarray:
        start_time = time.time()
        # input_tensor = preprocess_image(Image.fromarray(image))
        # outputs = self.predictor.predict(input_tensor)
        self.predictor.set_image(image)
        embedding = self.predictor.get_image_embedding()
        self.logger.info(
            f"Generate embedding time: {time.time() - start_time:.2f} seconds"
        )
        return embedding.detach().cpu().numpy()


# class EmbeddingGenerator:
#     def __init__(self, model_path):
#         self.logger = logging.getLogger(self.__class__.__name__)
#         self.logger.info(f"Initializing {self.__class__.__name__} ...")
#         self.logger.info(f"Loading model from {model_path}")

#         providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
#         self.logger.info(f"Available providers: {providers}")
#         self.encoder = ort.InferenceSession(model_path, providers=providers)

#     def generate_embedding(self, image: np.ndarray) -> np.ndarray:
#         start_time = time.time()
#         input_tensor = preprocess_image(Image.fromarray(image))
#         outputs = self.encoder.run(None, {"images": input_tensor})
#         self.logger.info(
#             f"Generate embedding time: {time.time() - start_time:.2f} seconds"
#         )
#         return outputs[0]
