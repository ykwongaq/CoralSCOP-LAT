import numpy as np
import copy

from typing import Dict, List
from .util.coco import rle_mask_to_rle_vis_encoding


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

    def get_image_width(self) -> int:
        return self.segmentation["images"][0]["width"]

    def get_image_height(self) -> int:
        return self.segmentation["images"][0]["height"]

    def to_json(self) -> Dict:
        """
        Convert the data to json format:
        {
            "image_name": "image_name",
            "image_path": "image_path",
            "idx": 0,
            "segmentation": Json information containing ["images" and "annotations"]. Also note that there is
            an additional key "rle" which is the RLE encoding for the segmentation mask for visualization.
        }
        """

        assert self.image_name is not None, "Data has no image name"
        assert self.image_path is not None, "Data has no image path"
        assert self.idx != -1, "Data has no index"
        assert self.segmentation is not None, "Data has no segmentation"

        # Convert the segmentation mask encoding to RLE for front end visualization
        segmentation = copy.deepcopy(self.segmentation)
        for annotation in segmentation["annotations"]:
            annotation["rle"] = rle_mask_to_rle_vis_encoding(annotation["segmentation"])

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
        self.data: Dict[int, Data] = {}
        self.category_info: List[Dict] = None
        self.last_saved_id = 0

    def add_data(self, data: Data):
        """
        Add data to the dataset.
        Need to verify the data is valid
        """
        self.data[data.get_idx()] = data

    def update_data(self, data_idx: int, segmentation: Dict):
        """
        Update the segmentation for the data at the given index
        """
        assert data_idx in self.data, f"Data at index {data_idx} not found"
        data = self.data[data_idx]
        data.set_segmentation(segmentation)
        self.last_saved_id = data_idx

    def get_last_saved_id(self) -> int:
        return self.last_saved_id

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

    def get_category_info(self) -> List[Dict]:
        """
        Get the category information.

        The information is a list of dictionaries:
        [
            {
                "id": -1,
                "name": "Detected Coral",
                "supercategory": "Detected Coral",
            },
        ]
        """
        return self.category_info

    def set_category_info(self, category_info: List[Dict]):
        self.category_info = category_info

    def get_data_list_by_category_id(self, category_id: int) -> List[Data]:
        """
        Get a list of data that containing the given category id
        """
        target_data = []
        for data in self.data.values():
            for annotation in data.get_segmentation()["annotations"]:
                if annotation["category_id"] == category_id:
                    target_data.append(data)
                    break
        return target_data
