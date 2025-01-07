import numpy as np
import copy

from typing import Dict, List
from .util.coco import coco_mask_to_rle


class Data:

    def __init__(self):
        self.image_name = None
        self.image_path = None
        self.idx = -1
        self.embedding = None
        self.segmentation = None

    def set_image_name(self, image_name: str):
        self.image_name = image_name

    def get_image_name(self) -> str:
        return self.image_name

    def set_image_path(self, image_path: str):
        self.image_path = image_path

    def get_image_path(self) -> str:
        return self.image_path

    def set_idx(self, idx: int):
        self.idx = idx

    def get_idx(self) -> int:
        return self.idx

    def set_embedding(self, embedding: np.ndarray):
        self.embedding = embedding

    def get_embedding(self) -> np.ndarray:
        return self.embedding

    def set_segmentation(self, segmentation: Dict):
        self.segmentation = segmentation

    def get_segmentation(self) -> Dict:
        return self.segmentation

    def to_json(self) -> Dict:

        # Convert the segmentation mask encoding to RLE for front end visualization
        segmentation = copy.deepcopy(self.segmentation)
        for annotation in segmentation["annotations"]:
            annotation["rle"] = coco_mask_to_rle(annotation["segmentation"])

        return {
            "image_name": self.image_name,
            "image_path": self.image_path,
            "idx": self.idx,
            "segmentation": segmentation,
        }

    def to_image_json(self) -> Dict:
        return {
            "image_name": self.image_name,
            "image_path": self.image_path,
            "idx": self.idx,
        }


class Dataset:

    def __init__(self):

        # Key is the image idx, and the value is the Data object
        self.data = {}
        self.category_info = None

    def add_data(self, data: Data):
        """
        Add data to the dataset.
        Need to verify the data is valid
        """
        assert data.get_image_name() is not None, "Data has no image name"
        assert data.get_image_path() is not None, "Data has no image path"
        assert (
            data.get_embedding() is not None
        ), f"Data {data.get_image_name()} has no embedding"
        assert (
            data.get_segmentation() is not None
        ), f"Data {data.get_image_name()} has no segmentation"
        assert data.get_idx() != -1, f"Data {data.get_image_name()} has no index"

        self.data[data.get_idx()] = data

    def get_data(self, idx: int) -> Data:
        """
        Get the data at the given index
        """
        return self.data[idx]

    def get_size(self) -> int:
        """
        Get the size of the dataset
        """
        return len(self.data)

    def get_data_list(self) -> List[Data]:
        """
        Get the data list, sorted by image idx
        """
        return [self.data[idx] for idx in sorted(self.data.keys())]

    def get_category_info(self) -> Dict:
        return self.category_info

    def set_category_info(self, category_info: Dict):
        self.category_info = category_info
