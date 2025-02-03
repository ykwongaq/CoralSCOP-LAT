import logging
import os
import threading
import time
import eel
import numpy as np
import zipfile
import shutil

from ..util.json import load_json
from ..dataset import Dataset, Data
from PIL import Image


from typing import List, Union

TEMP_LOAD_NAME = "__coralscop_lat_temp_load"


class ProjectLoader:

    WEB_FOLDER_NAME = "web"
    ASSET_FOLDER = "assets/images"

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

    def load(self, project_path: str) -> Union[Dataset, int]:
        """
        Load a project from the given project path.

        Returns:
        - Dataset: The loaded dataset
        - int: Last image index
        """
        # Unzip the project file
        start_time = time.time()
        temp_output_dir = os.path.join(os.path.dirname(project_path), TEMP_LOAD_NAME)
        with zipfile.ZipFile(project_path, "r") as archive:
            archive.extractall(temp_output_dir)
        self.logger.info(f"Unzipped project in {time.time() - start_time} seconds")

        # Load data from the project folder
        start_time = time.time()
        dataset = Dataset()

        image_folder = os.path.join(temp_output_dir, "images")
        embedding_folder = os.path.join(temp_output_dir, "embeddings")
        annotation_folder = os.path.join(temp_output_dir, "annotations")
        project_info_path = os.path.join(temp_output_dir, "project_info.json")

        image_filenames = os.listdir(image_folder)
        image_filenames = sorted(image_filenames)
        filenames = [os.path.splitext(filename)[0] for filename in image_filenames]

        # Move the images files to the assets folder
        image_files = [
            os.path.join(image_folder, filename)
            for filename in os.listdir(image_folder)
        ]
        asset_image_paths = self.store_image(image_files)
        asset_image_paths = sorted(asset_image_paths)

        # Construct dataset
        dataset = Dataset()
        for idx, filename in enumerate(filenames):
            embedding_path = os.path.join(embedding_folder, f"{filename}.npy")
            annotation_path = os.path.join(annotation_folder, f"{filename}.json")

            data = Data()
            data.set_image_name(image_filenames[idx])
            data.set_image_path(asset_image_paths[idx])

            embedding = np.load(embedding_path)
            data.set_embedding(embedding)

            annotations = load_json(annotation_path)
            data.set_segmentation(annotations)

            # Data index is the image idx
            image_id = annotations["images"][0]["id"]
            data.set_idx(image_id)

            dataset.add_data(data)

        # Load project info
        project_info = load_json(project_info_path)
        last_image_idx = project_info["last_image_idx"]
        category_info = project_info["category_info"]
        status_info = project_info["status_info"]
        dataset.set_category_info(category_info)
        dataset.set_status_info(status_info)

        # Delete the temporary folder
        shutil.rmtree(temp_output_dir)

        self.logger.info(f"Project loaded in {time.time() - start_time} seconds")

        return dataset, last_image_idx

    def store_image(self, image_paths: List[str]) -> List[str]:
        """
        Store images to the assest folder for front end to access.

        Returns:
        - List[str]: List of relative image paths in the asset folder
        """
        self.clear_asset_folder()
        asset_folder = os.path.join(
            ProjectLoader.WEB_FOLDER_NAME, ProjectLoader.ASSET_FOLDER
        )
        os.makedirs(asset_folder, exist_ok=True)

        assset_image_paths = []
        for image_path in image_paths:
            image = Image.open(image_path)
            image.save(os.path.join(asset_folder, os.path.basename(image_path)))

            asset_image_path = os.path.join(
                ProjectLoader.ASSET_FOLDER, os.path.basename(image_path)
            )
            assset_image_paths.append(asset_image_path)

        return assset_image_paths

    def clear_asset_folder(self):
        """
        Clear the asset folder
        """
        asset_folder = os.path.join(
            ProjectLoader.WEB_FOLDER_NAME, ProjectLoader.ASSET_FOLDER
        )
        if os.path.exists(asset_folder):
            # Delete all the files in the folder
            for filename in os.listdir(asset_folder):
                file_path = os.path.join(asset_folder, filename)
                os.remove(file_path)
