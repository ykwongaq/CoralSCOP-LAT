import logging
import os
import zipfile
import shutil

from ..util.json import save_json
from ..dataset import Dataset
from ..jsonFormat import (
    ImageJson,
    AnnotationFileJson,
    AnnotationJson,
    ProjectInfoJson,
    StatusJson,
    CategoryJson,
)


TEMP_CREATE_NAME = "__coralscop_lat_temp"
TEMP_CREATE_NAME_2 = "__coralscop_lat_temp_2"


class ProjectSaver:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def save_dataset(
        self, dataset: Dataset, project_path_origin: str, project_path_new: str
    ):
        # Unzip the original project to temp folder
        temp_folder_origin = os.path.join(
            os.path.dirname(project_path_origin), TEMP_CREATE_NAME
        )
        if os.path.exists(temp_folder_origin):
            shutil.rmtree(temp_folder_origin)

        os.makedirs(temp_folder_origin, exist_ok=True)
        with zipfile.ZipFile(project_path_origin, "r") as archive:
            archive.extractall(temp_folder_origin)

        # Create temp folder for the new project
        temp_folder_new = os.path.join(
            os.path.dirname(project_path_new), TEMP_CREATE_NAME_2
        )
        if os.path.exists(temp_folder_new):
            shutil.rmtree(temp_folder_new)
        os.makedirs(temp_folder_new, exist_ok=True)

        # Copy the images to the new project folder
        image_folder_origin = os.path.join(temp_folder_origin, "images")
        image_folder_new = os.path.join(temp_folder_new, "images")
        os.makedirs(image_folder_new, exist_ok=True)
        for image_name in os.listdir(image_folder_origin):
            image_path_origin = os.path.join(image_folder_origin, image_name)
            image_path_new = os.path.join(image_folder_new, image_name)
            shutil.copy(image_path_origin, image_path_new)

        # Copy the embeddings to the new project folder
        embedding_folder_origin = os.path.join(temp_folder_origin, "embeddings")
        embedding_folder_new = os.path.join(temp_folder_new, "embeddings")
        os.makedirs(embedding_folder_new, exist_ok=True)
        for embedding_name in os.listdir(embedding_folder_origin):
            embedding_path_origin = os.path.join(
                embedding_folder_origin, embedding_name
            )
            embedding_path_new = os.path.join(embedding_folder_new, embedding_name)
            shutil.copy(embedding_path_origin, embedding_path_new)

        # Generate annotation to the new project folder
        annotation_folder_new = os.path.join(temp_folder_new, "annotations")
        os.makedirs(annotation_folder_new, exist_ok=True)
        for data in dataset.get_data_list():
            filename = os.path.splitext(data.get_image_name())[0]
            annotation_path = os.path.join(annotation_folder_new, f"{filename}.json")

            annotation_file_json = AnnotationFileJson()

            image_json = ImageJson()
            image_json.set_id(data.get_idx())
            image_json.set_filename(data.get_image_name())
            image_json.set_width(data.get_image_width())
            image_json.set_height(data.get_image_height())
            annotation_file_json.add_image(image_json)

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
                annotation_file_json.add_annotation(annotation_json)

            save_json(annotation_file_json.to_json(), annotation_path)

        # Generate the project info file to the new project folder
        project_info_path = os.path.join(temp_folder_new, "project_info.json")

        project_info_json = ProjectInfoJson()
        project_info_json.set_last_image_idx(dataset.get_last_saved_id())
        for category in dataset.get_category_info():
            category_json = CategoryJson()
            category_json.set_id(category["id"])
            category_json.set_name(category["name"])
            category_json.set_super_category(category["supercategory"])
            category_json.set_super_category_id(category["supercategory_id"])
            category_json.set_is_coral(category["is_coral"])
            category_json.set_status(category["status"])
            project_info_json.add_category_info(category_json)

        for status in dataset.get_status_info():
            status_json = StatusJson()
            status_json.set_id(status["id"])
            status_json.set_name(status["name"])
            project_info_json.add_status_info(status_json)
        project_info_json.set_last_image_idx(dataset.get_last_saved_id())

        save_json(project_info_json.to_json(), project_info_path)

        # Remove the temp folder for original project
        shutil.rmtree(temp_folder_origin)

        # Zip the new project folder to the new project path
        if os.path.exists(project_path_new):
            os.remove(project_path_new)

        with zipfile.ZipFile(project_path_new, "w") as archive:
            for root, _, files in os.walk(temp_folder_new):
                for file in files:
                    archive.write(
                        os.path.join(root, file),
                        os.path.relpath(os.path.join(root, file), temp_folder_new),
                    )

        # Remove the temp folder for the new project
        shutil.rmtree(temp_folder_new)
