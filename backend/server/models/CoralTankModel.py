import numpy as np
from PIL import Image
from ultralytics import YOLO

from ..utils.gpu_monitor import track_gpu_memory
from ..utils.logger import get_logger
from ..utils.masks import encode_masks
from .modelQueue import ModelQueue

_logger = get_logger(__name__)

from typing import Any, Dict, List, Tuple


class CoralTankModel:
    def __init__(self, checkpoint_path: str):
        _logger.info("Loading CoralTankModel from %s", checkpoint_path)
        self.model = YOLO(checkpoint_path)
        self._model_queue = ModelQueue(self.model)
        _logger.info("CoralTankModel loaded")

    @track_gpu_memory
    def predict(self, image: Image.Image) -> Tuple[List[Dict[str, Any]], List[int]]:
        with self._model_queue as model:
            result = model.predict(image, retina_masks=True)[0]
            result = result.cpu().numpy()

            masks = []

            if result.masks is None:
                return [], []

            for mask in result.masks.data:
                masks.append(encode_masks(mask))

            class_list = result.boxes.cls.astype(int).tolist()
            return masks, class_list
