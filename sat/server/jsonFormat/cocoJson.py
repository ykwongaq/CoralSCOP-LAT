from .imageJson import ImageJson
from .annotationJson import AnnotationJson
from .categoryJson import CategoryJson
from typing import List
from ..util.coco import rle_mask_to_poly_mask


class COCOJson:
    def __init__(self):
        self.images: List[ImageJson] = []
        self.annotations: List[AnnotationJson] = []
        self.categories: List[CategoryJson] = []

    def add_image(self, image: ImageJson):
        self.images.append(image)

    def add_annotation(self, annotation: AnnotationJson):
        self.annotations.append(annotation)

    def add_category(self, category: CategoryJson):
        self.categories.append(category)

    def to_json(self):
        images = [image.to_json() for image in self.images]
        annotations = [annotation.to_json() for annotation in self.annotations]
        categories = [category.to_json() for category in self.categories]

        # Remove the mask with category id -1
        annotations = [
            annotation for annotation in annotations if annotation["category_id"] != -1
        ]

        # Convert coco rle to coco poly
        for annotation in annotations:
            annotation["segmentation"] = rle_mask_to_poly_mask(
                annotation["segmentation"]
            )

        return {
            "images": images,
            "annotations": annotations,
            "categories": categories,
        }
