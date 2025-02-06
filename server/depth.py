from .depth_anything_v2.dpt import DepthAnythingV2

import torch
import logging
import numpy as np
import time


class DepthEstimation:

    model_configs = {
        "vits": {"encoder": "vits", "features": 64, "out_channels": [48, 96, 192, 384]},
        "vitb": {
            "encoder": "vitb",
            "features": 128,
            "out_channels": [96, 192, 384, 768],
        },
        "vitl": {
            "encoder": "vitl",
            "features": 256,
            "out_channels": [256, 512, 1024, 1024],
        },
        "vitg": {
            "encoder": "vitg",
            "features": 384,
            "out_channels": [1536, 1536, 1536, 1536],
        },
    }

    def __init__(self, model_path: str, model_type: str):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.model_path = model_path
        self.model_type = model_type

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.depth_anything = DepthAnythingV2(
            **DepthEstimation.model_configs[model_type]
        )
        self.depth_anything.load_state_dict(torch.load(model_path, map_location=device))
        self.depth_anything.to(device)
        self.depth_anything.eval()

    def infer(self, image: np.ndarray, input_size: int = 518) -> np.ndarray:
        self.logger.info(f"Estimating depth for image of shape {image.shape}")
        start_time = time.time()
        depth: np.ndarray = self.depth_anything.infer_image(
            image, input_size=input_size
        )
        self.logger.info(
            f"Depth estimation took {time.time() - start_time:.2f} seconds"
        )

        if depth.max() == depth.min():
            return np.zeros_like(depth)

        # Normalize the depth map between 0 and 1
        depth = (depth - depth.min()) / (depth.max() - depth.min())

        return depth
