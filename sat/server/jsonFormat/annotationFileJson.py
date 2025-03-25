from .annotationJson import AnnotationJson
from .imageJson import ImageJson

from typing import List


class AnnotationFileJson:
    def __init__(self):
        self.images: List[ImageJson] = []
        self.annotations: List[AnnotationJson] = []

    def add_image(self, image: ImageJson):
        self.images.append(image)

    def add_annotation(self, annotation: AnnotationJson):
        self.annotations.append(annotation)

    def to_json(self):
        return {
            "images": [image.to_json() for image in self.images],
            "annotations": [annotation.to_json() for annotation in self.annotations],
        }
