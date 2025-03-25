from typing import Dict, List


class AnnotationJson:
    """
    It is the class help to ensure that all the required data
    is set before converting to json.
    """

    def __init__(self):
        self.segmentation = None
        self.bbox = None
        self.area = None
        self.category_id = None
        self.id = None
        self.image_id = None
        self.iscrowd = None
        self.predicted_iou = None

    def set_segmentation(self, segmentation: Dict):
        self.segmentation = segmentation

    def set_bbox(self, bbox: List[int]):
        self.bbox = bbox

    def set_area(self, area: int):
        self.area = area

    def set_category_id(self, category_id: int):
        self.category_id = category_id

    def set_id(self, id: int):
        self.id = id

    def set_image_id(self, image_id: int):
        self.image_id = image_id

    def set_iscrowd(self, iscrowd: int):
        self.iscrowd = iscrowd

    def to_json(self):
        assert self.segmentation is not None, "segmentation is not set"
        assert self.bbox is not None, "bbox is not set"
        assert self.area is not None, "area is not set"
        assert self.category_id is not None, "category_id is not set"
        assert self.id is not None, "id is not set"
        assert self.image_id is not None, "image_id is not set"
        assert self.iscrowd is not None, "iscrowd is not set"
        return {
            "segmentation": self.segmentation,
            "bbox": self.bbox,
            "area": self.area,
            "category_id": self.category_id,
            "id": self.id,
            "image_id": self.image_id,
            "iscrowd": self.iscrowd,
        }
