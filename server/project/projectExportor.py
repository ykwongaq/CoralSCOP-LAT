import logging
import os
import shutil

from ..util.general import decode_image_url
from ..util.json import save_json
from ..dataset import Dataset
from PIL import Image
from ..util.data import unzip_file
from ..util.excel import ExcelUtil
from ..jsonFormat import (
    ImageJson,
    AnnotationJson,
    COCOJson,
    CategoryJson,
)


from typing import Dict, List

TEMP_LOAD_NAME = "__coralscop_lat_temp_load"


class ProjectExportor:

    COCO_FILE_NAME = "coco"

    def __init__(self, project_path: str):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.project_path = project_path

    def export_images(self, output_dir: str):
        project_folder = os.path.dirname(self.project_path)

        # Extract the project files
        temp_dir = os.path.join(project_folder, TEMP_LOAD_NAME)
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        unzip_file(self.project_path, temp_dir)

        # Create images folder
        image_folder = os.path.join(output_dir, "images")
        os.makedirs(image_folder, exist_ok=True)

        # Copy the images to the images folder
        project_image_folder = os.path.join(temp_dir, "images")
        for image_name in os.listdir(project_image_folder):
            image_path = os.path.join(project_image_folder, image_name)
            shutil.copy(image_path, image_folder)

        # Remove the temporary folder
        shutil.rmtree(temp_dir)

    def export_annotated_images(self, output_dir: str, data_list: List[Dict]):
        """
        Params:
        - output_dir: The output directory
        - data: The list of data of the image, which is a dict
        {
            "image_name": str,
            "encoded_image": str,
        }
        """
        output_annotated_image_folder = os.path.join(output_dir, "annotated_images")
        os.makedirs(output_annotated_image_folder, exist_ok=True)
        for data in data_list:
            image = decode_image_url(data["encoded_image"])
            image = Image.fromarray(image)
            image.save(os.path.join(output_annotated_image_folder, data["image_name"]))

    def is_file_path(self, path):
        # Check if the path looks like a file (e.g., has an extension)
        return not path.endswith(os.sep) and os.path.splitext(path)[1] != ""

    def export_coco(self, output_path: str, dataset: Dataset):
        """
        the output_path can be a directory or a file path
        """

        if self.is_file_path(output_path):
            output_coco_file = output_path
            if os.path.exists(output_coco_file):
                os.remove(output_coco_file)
        else:
            output_dir = output_path
            output_coco_file = os.path.join(output_dir, "coco.json")

            # If the file already exist, append a number to the file name
            i = 1
            while os.path.exists(output_coco_file):
                output_coco_file = os.path.join(
                    output_dir, f"{ProjectExport.COCO_FILE_NAME}_{i}.json"
                )
                i += 1

                if i > 1000:
                    raise Exception("Too many COCO files in the output directory")

            os.makedirs(output_dir, exist_ok=True)

        coco_json = COCOJson()

        for data in dataset.get_data_list():
            image_json = ImageJson()
            image_json.set_id(data.get_idx())
            image_json.set_filename(data.get_image_name())
            image_json.set_width(data.get_image_width())
            image_json.set_height(data.get_image_height())
            coco_json.add_image(image_json)

            for mask in data.get_segmentation()["annotations"]:
                annotation_json = AnnotationJson()
                annotation_json.set_segmentation(mask["segmentation"])
                annotation_json.set_bbox(mask["bbox"])
                annotation_json.set_area(mask["area"])
                annotation_json.set_category_id(mask["category_id"])
                annotation_json.set_id(mask["id"])
                annotation_json.set_image_id(data.get_idx())
                annotation_json.set_iscrowd(mask["iscrowd"])
                annotation_json.set_predicted_iou(mask["predicted_iou"])
                coco_json.add_annotation(annotation_json)

        for category in dataset.get_category_info():
            category_json = CategoryJson()
            category_json.set_id(category["id"])
            category_json.set_name(category["name"])
            category_json.set_super_category(category["supercategory"])
            category_json.set_super_category_id(category["supercategory_id"])
            category_json.set_is_coral(category["is_coral"])
            category_json.set_status(category["status"])
            coco_json.add_category(category_json)

        save_json(coco_json.to_json(), output_coco_file)

    def export_excel(self, output_dir: str, dataset: Dataset):

        excel_output_dir = os.path.join(output_dir, "excel")
        os.makedirs(excel_output_dir, exist_ok=True)

        excel_util = ExcelUtil(dataset.get_category_info())

        data_list = dataset.get_data_list()
        for data in data_list:
            image_name = data.get_image_name()
            image_name_without_ext = os.path.splitext(image_name)[0]
            excel_output_path = os.path.join(
                excel_output_dir, f"{image_name_without_ext}.xlsx"
            )
            excel_util.export_excel(data, excel_output_path)

    def export_charts(self, output_dir: str, requests: List[Dict]):
        """
        Export the charts to the output directory

        Request format:
        {
            "encoded_chart": string,
            "chart_name": string,
        }
        """
        output_chart_dir = os.path.join(output_dir, "charts")
        os.makedirs(output_chart_dir, exist_ok=True)

        for request in requests:
            chart_name = request["chart_name"]
            encoded_chart = request["encoded_chart"]

            chart_path = os.path.join(output_chart_dir, f"{chart_name}.png")
            chart = decode_image_url(encoded_chart)
            Image.fromarray(chart).save(chart_path)
            self.logger.info(f"Exported chart: {chart_name} to {chart_path}")
