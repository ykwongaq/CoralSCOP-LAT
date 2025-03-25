from ..util.json import load_json
from ..util.coco import (
    is_polygon_encoding,
    poly_mask_to_rle_mask,
)
from ..dataset import Dataset, Data
from typing import Dict, List
from pycocotools import mask as coco_mask

import logging


class JsonImportor:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        pass

    def import_json(self, json_path: str) -> Dataset:
        """
        Import the json file and convert it to a dataset.
        """

        json_data = load_json(json_path)
        self.verify_json(json_data)

        dataset = Dataset()

        image_id_to_annotation: Dict[int, List] = {}
        for annotation in json_data["annotations"]:
            image_id = int(annotation["image_id"])
            if image_id not in image_id_to_annotation:
                image_id_to_annotation[image_id] = []
            image_id_to_annotation[image_id].append(annotation)

        for image_data in json_data["images"]:
            data = Data()
            data.set_image_name(image_data["file_name"])
            data.set_idx(image_data["id"])

            annotations = image_id_to_annotation.get(image_data["id"], [])
            for annotation in annotations:
                # Ensure that the encoded segmentation is in rle format
                segmentation = annotation["segmentation"]
                if is_polygon_encoding(segmentation):
                    image_height = image_data["height"]
                    image_width = image_data["width"]
                    rle = poly_mask_to_rle_mask(segmentation, image_height, image_width)
                    annotation["segmentation"] = rle

                # Ensure that annotation have area
                rle = annotation["segmentation"]
                area = coco_mask.area(rle)
                annotation["area"] = int(area)

                # Ensure that annotation have bbox
                bbox = coco_mask.toBbox(rle)
                annotation["bbox"] = bbox.tolist()

            segmentation = {"images": [image_data], "annotations": annotations}
            data.set_segmentation(segmentation)
            dataset.add_data(data)

        category_info = []
        for category_data in json_data["categories"]:
            category_info.append(
                {
                    "id": category_data["id"],
                    "name": category_data["name"],
                    "supercategory": category_data["supercategory"],
                }
            )
        dataset.set_category_info(category_info)

        return dataset

    def verify_json(self, json_data: Dict):
        """
        Verify the json data.
        """
        assert "images" in json_data, "The json data should contain the images."
        assert (
            "annotations" in json_data
        ), "The json data should contain the annotations."
        assert "categories" in json_data, "The json data should contain the categories."

        assert len(json_data["images"]) > 0, "The images should not be empty."

        for image_data in json_data["images"]:
            assert (
                "file_name" in image_data
            ), "The image data should contain the file name."
            assert "id" in image_data, "The image data should contain the id."
            assert "width" in image_data, "The image data should contain the width."
            assert "height" in image_data, "The image data should contain the height."

        for annotation_data in json_data["annotations"]:
            assert (
                "image_id" in annotation_data
            ), "The annotation data should contain the image id."
            assert (
                "category_id" in annotation_data
            ), "The annotation data should contain the category id."
            assert (
                "segmentation" in annotation_data
            ), "The annotation data should contain the segmentation."

        for category_data in json_data["categories"]:
            assert "id" in category_data, "The category data should contain the id."
            assert "name" in category_data, "The category data should contain the name."
            assert (
                "supercategory" in category_data
            ), "The category data should contain the supercategory."

        return
