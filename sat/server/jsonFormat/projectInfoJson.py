from .categoryJson import CategoryJson
from typing import List


class ProjectInfoJson:
    def __init__(self):
        self.last_image_idx = None
        self.category_info: List[CategoryJson] = []

    def set_last_image_idx(self, last_image_idx: int):
        self.last_image_idx = last_image_idx

    def add_category_info(self, category_info: CategoryJson):
        self.category_info.append(category_info)

    def to_json(self):
        assert self.last_image_idx is not None, "last_image_idx is not set"
        return {
            "last_image_idx": self.last_image_idx,
            "category_info": [category.to_json() for category in self.category_info],
        }
