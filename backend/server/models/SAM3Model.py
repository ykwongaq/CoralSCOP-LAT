import threading
from typing import Tuple

import numpy as np
import torch
from PIL import Image
from sam3.model.sam3_image_processor import Sam3Processor
from sam3.model_builder import build_sam3_image_model

from ..utils.logger import get_logger
from .modelQueue import ModelQueue

_logger = get_logger(__name__)


class SAM3Model:

    def __init__(self, checkpoint_path: str):
        _logger.info("Loading SAM model from %s", checkpoint_path)
        self.model = build_sam3_image_model(
            checkpoint_path=checkpoint_path,
            enable_inst_interactivity=True,
        )
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.eval().to(self.device)
        self.processor = Sam3Processor(self.model)

        self._gpu_semaphore = threading.Semaphore(1)
        self._processor_queue = ModelQueue(
            self.processor, semaphore=self._gpu_semaphore
        )
        self._model_queue = ModelQueue(self.model, semaphore=self._gpu_semaphore)
        _logger.info("SAM model loaded (device=%s)", self.device)

    def gen_embeddings(self, image: Image.Image) -> torch.Tensor:
        with torch.autocast(self.device.type, dtype=torch.bfloat16):
            with self._processor_queue as processor:
                return processor.set_image(image)

    def predict_inst(
        self,
        state: torch.Tensor,
        input_points: np.ndarray,
        input_labels: np.ndarray,
        mask_input: np.ndarray = None,
        multimask_output: bool = False,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        input_points: [N, 2]
        input_labels: [N]
        mask_input: [1, H, W]
        """
        with torch.no_grad():
            with torch.autocast(self.device.type, dtype=torch.bfloat16):
                with self._model_queue as processor:
                    return processor.predict_inst(
                        state,
                        point_coords=input_points,
                        point_labels=input_labels,
                        mask_input=mask_input,
                        multimask_output=multimask_output,
                    )
