import logging
import os
import threading
import time
import eel
import numpy as np
import zipfile
import shutil

from .util.general import decode_image_url
from .util.json import gen_image_json, save_json, load_json
from .embedding import EmbeddingGenerator
from .segmentation import CoralSegmentation
from .dataset import Dataset, Data
from PIL import Image
from .util.data import zip_file, unzip_file


from typing import Dict, Tuple, List, Union

TEMP_CREATE_NAME = "__coralscop_lat_temp"
TEMP_LOAD_NAME = "__coralscop_lat_temp_load"


class ImageJson:
    """
    It is the class help to ensure that all the required data
    is set before converting to json.
    """

    def __init__(self):
        self.id = None
        self.filename = None
        self.width = None
        self.height = None

    def set_id(self, id: int):
        self.id = id

    def set_filename(self, filename: str):
        self.filename = filename

    def set_width(self, width: int):
        self.width = width

    def set_height(self, height: int):
        self.height = height

    def to_json(self):
        assert self.id is not None, "id is not set"
        assert self.filename is not None, "filename is not set"
        assert self.width is not None, "width is not set"
        assert self.height is not None, "height is not set"
        return {
            "id": self.id,
            "filename": self.filename,
            "width": self.width,
            "height": self.height,
        }


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

    def set_predicted_iou(self, predicted_iou: float):
        self.predicted_iou = predicted_iou

    def to_json(self):
        assert self.segmentation is not None, "segmentation is not set"
        assert self.bbox is not None, "bbox is not set"
        assert self.area is not None, "area is not set"
        assert self.category_id is not None, "category_id is not set"
        assert self.id is not None, "id is not set"
        assert self.image_id is not None, "image_id is not set"
        assert self.iscrowd is not None, "iscrowd is not set"
        assert self.predicted_iou is not None, "predicted_iou is not set"
        return {
            "segmentation": self.segmentation,
            "bbox": self.bbox,
            "area": self.area,
            "category_id": self.category_id,
            "id": self.id,
            "image_id": self.image_id,
            "iscrowd": self.iscrowd,
            "predicted_iou": self.predicted_iou,
        }


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


class CategoryJson:
    def __init__(self):
        self.id = None
        self.name = None
        self.super_category = None
        self.super_category_id = None
        self.is_coral = None
        self.status = None

    def set_id(self, id: int):
        self.id = id

    def set_name(self, name: str):
        self.name = name

    def set_super_category(self, super_category: str):
        self.super_category = super_category

    def set_super_category_id(self, super_category_id: int):
        self.super_category_id = super_category_id

    def set_is_coral(self, is_coral: bool):
        self.is_coral = is_coral

    def set_status(self, status: int):
        self.status = status

    def to_json(self):
        assert self.id is not None, "id is not set"
        assert self.name is not None, "name is not set"
        assert self.super_category is not None, "super_category is not set"
        assert self.super_category_id is not None, "super_category_id is not set"
        assert self.is_coral is not None, "is_coral is not set"
        assert self.status is not None, "status is not set"
        return {
            "id": self.id,
            "name": self.name,
            "supercategory": self.super_category,
            "supercategory_id": self.super_category_id,
            "is_coral": self.is_coral,
            "status": self.status,
        }


class StatusJson:
    def __init__(self):
        self.id = None
        self.name = None

    def set_id(self, id: int):
        self.id = id

    def set_name(self, name: str):
        self.name = name

    def to_json(self):
        assert self.id is not None, "id is not set"
        assert self.name is not None, "name is not set"
        return {"id": self.id, "name": self.name}


class ProjectInfoJson:
    def __init__(self):
        self.last_image_idx = None
        self.category_info: List[CategoryJson] = []
        self.status_info: List[StatusJson] = []

    def set_last_image_idx(self, last_image_idx: int):
        self.last_image_idx = last_image_idx

    def add_category_info(self, category_info: CategoryJson):
        self.category_info.append(category_info)

    def add_status_info(self, status_info: StatusJson):
        self.status_info.append(status_info)

    def to_json(self):
        assert self.last_image_idx is not None, "last_image_idx is not set"
        return {
            "last_image_idx": self.last_image_idx,
            "category_info": [category.to_json() for category in self.category_info],
            "status_info": [status.to_json() for status in self.status_info],
        }


class ProjectCreateRequest:
    def __init__(self, request: Dict):
        """
        Request should have the following structure:
        {
            "inputs": [
                {
                    "image_url": "http://example.com/image.jpg",
                    "image_name": "image.jpg"
                }
            ],
            "output_dir": "/path/to/output"
        }
        """
        self.request = request
        assert "inputs" in request, "Missing 'inputs' in request"
        assert "output_dir" in request, "Missing 'output_dir' in request"
        assert "config" in request, "Missing 'config' in request"

    def get_inputs(self) -> List[Dict]:
        return self.request["inputs"]

    def get_output_dir(self) -> str:
        return self.request["output_dir"]

    def get_min_area(self) -> float:
        return self.request["config"]["minArea"]

    def get_min_confidence(self) -> float:
        return self.request["config"]["minConfidence"]

    def get_max_iou(self) -> float:
        return self.request["config"]["maxIOU"]


class ProjectCreator:

    SAM_ENCODER_PATH = "models/vit_h_encoder_quantized.onnx"
    SAM_MODEL_TYPE = "vit_b"
    CORALSCOP_PATH = "models/vit_b_coralscop.pth"

    # Singleton
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(ProjectCreator, cls).__new__(cls)
        return cls._instance

    def __init__(
        self,
        embedding_generator: EmbeddingGenerator,
        segmentation: CoralSegmentation,
    ):
        if hasattr(self, "initialized"):
            # Prevent re-initialization
            return

        self.logger = logging.getLogger(self.__class__.__name__)
        self.embeddings_generator = embedding_generator
        self.segmentation = segmentation

        # Threading
        self.stop_event = threading.Event()
        self.worker_thread = None

    def create_(self, request: ProjectCreateRequest):
        """
        Create a proejct from the request. The project data will be stored in a zip file with .coral extension.
        """
        inputs = request.get_inputs()
        inputs = sorted(inputs, key=lambda x: x["image_file_name"])

        output_dir = request.get_output_dir()

        min_area = request.get_min_area()
        min_confidence = request.get_min_confidence()
        max_iou = request.get_max_iou()

        # Temporary folders for storing images, embeddings, annotations, and project info
        output_temp_dir = os.path.join(output_dir, TEMP_CREATE_NAME)
        os.makedirs(output_temp_dir, exist_ok=True)

        image_folder = os.path.join(output_temp_dir, "images")
        os.makedirs(image_folder, exist_ok=True)

        embedding_folder = os.path.join(output_temp_dir, "embeddings")
        os.makedirs(embedding_folder, exist_ok=True)

        annotation_folder = os.path.join(output_temp_dir, "annotations")
        os.makedirs(annotation_folder, exist_ok=True)

        project_info_path = os.path.join(output_temp_dir, "project_info.json")

        # Update process in the frontend
        eel.updateProgressPercentage(0)
        terminated = False
        for idx, input in enumerate(inputs):
            image_url = input["image_url"]
            image_filename = input["image_file_name"]
            filename = os.path.splitext(image_filename)[0]

            self.logger.info(f"Processing input {idx + 1} of {len(inputs)}")
            self.logger.info(f"Processing image: {image_filename}")

            # image, embedding, annotations = self.process_one_input(
            #     image_url, image_filename, min_area, min_confidence, max_iou
            # )

            start_time = time.time()
            self.logger.info(f"Processing image {image_filename} ...")

            # Create image
            image = decode_image_url(image_url)
            if self.stop_event.is_set():
                self.logger.info("Project creation stopped.")
                terminated = True
                break

            # Generate embedding
            embedding = self.embeddings_generator.generate_embedding(image)
            if self.stop_event.is_set():
                self.logger.info("Project creation stopped.")
                terminated = True
                break

            # Detect coral
            masks = self.segmentation.generate_masks_json(image)
            masks = self.segmentation.filter(masks, min_area, min_confidence, max_iou)
            for mask in masks:
                mask["image_id"] = idx

            annotation_file_json = AnnotationFileJson()

            image_json = ImageJson()
            image_json.set_id(idx)
            image_json.set_filename(image_filename)
            image_json.set_width(image.shape[1])
            image_json.set_height(image.shape[0])
            annotation_file_json.add_image(image_json)

            for mask in masks:
                annotation_json = AnnotationJson()
                annotation_json.set_segmentation(mask["segmentation"])
                annotation_json.set_bbox(mask["bbox"])
                annotation_json.set_area(mask["area"])
                annotation_json.set_category_id(mask["category_id"])
                annotation_json.set_id(mask["id"])
                annotation_json.set_image_id(idx)
                annotation_json.set_iscrowd(mask["iscrowd"])
                annotation_json.set_predicted_iou(mask["predicted_iou"])
                annotation_file_json.add_annotation(annotation_json)

            end_time = time.time()
            self.logger.info(f"Processed image in {end_time - start_time:.2f} seconds")

            # Check if the stop event is set
            if image is None or embedding is None or masks is None:
                terminated = True
                break

            image_path = os.path.join(image_folder, image_filename)
            embedding_path = os.path.join(embedding_folder, f"{filename}.npy")
            annotation_path = os.path.join(annotation_folder, f"{filename}.json")

            np.save(embedding_path, embedding)
            save_json(annotation_file_json.to_json(), annotation_path)
            Image.fromarray(image).save(image_path)

            process_percentage = (idx + 1) / len(inputs) * 100
            process_percentage = int(process_percentage)
            eel.updateProgressPercentage(process_percentage)

        if terminated:
            # If the process is terminated, clear the temporary folder and return
            # self.clear_temp_folder(output_dir)
            shutil.rmtree(output_temp_dir)
            status = {}
            status["finished"] = False
            eel.afterProjectCreation(status)
            return

        project_info_json = ProjectInfoJson()
        project_info_json.set_last_image_idx(0)

        detected_coral_category = CategoryJson()
        detected_coral_category.set_id(-1)
        detected_coral_category.set_name("Undefined Coral")
        detected_coral_category.set_super_category("Undefined Coral")
        detected_coral_category.set_super_category_id(-1)
        detected_coral_category.set_is_coral(True)
        detected_coral_category.set_status(-1)
        project_info_json.add_category_info(detected_coral_category)

        dead_coral_category = CategoryJson()
        dead_coral_category.set_id(0)
        dead_coral_category.set_name("Dead Coral")
        dead_coral_category.set_super_category("Dead Coral")
        dead_coral_category.set_super_category_id(0)
        dead_coral_category.set_is_coral(True)
        dead_coral_category.set_status(2)
        project_info_json.add_category_info(dead_coral_category)

        healty_status = StatusJson()
        healty_status.set_id(0)
        healty_status.set_name("Healthy")
        project_info_json.add_status_info(healty_status)

        bleached_status = StatusJson()
        bleached_status.set_id(1)
        bleached_status.set_name("Bleached")
        project_info_json.add_status_info(bleached_status)

        dead_status = StatusJson()
        dead_status.set_id(2)
        dead_status.set_name("Dead")
        project_info_json.add_status_info(dead_status)

        undefined_status = StatusJson()
        undefined_status.set_id(-1)
        undefined_status.set_name("Undefined")
        project_info_json.add_status_info(undefined_status)

        save_json(project_info_json.to_json(), project_info_path)

        project_name = self.find_available_project_name(output_dir)
        project_path = os.path.join(output_dir, project_name)
        with zipfile.ZipFile(project_path, "w") as archive:
            for root, _, files in os.walk(output_temp_dir):
                for file in files:
                    archive.write(
                        os.path.join(root, file),
                        os.path.relpath(os.path.join(root, file), output_temp_dir),
                    )

        if os.path.exists(output_temp_dir):
            shutil.rmtree(output_temp_dir)

        status = {}
        status["finished"] = True
        status["project_path"] = project_path
        eel.afterProjectCreation(status)

    def create(self, request: ProjectCreateRequest):
        """
        Create a project from the request. A threading process will be created to handle user termination.
        """
        if self.worker_thread is not None and self.worker_thread.is_alive():
            self.logger.info("Task is already running.")
            return

        self.stop_event.clear()
        self.worker_thread = threading.Thread(target=self.create_, args=(request,))
        self.worker_thread.start()

    def terminate(self):
        """
        Terminate the current project creation process.
        """
        if (self.worker_thread is None) or (not self.worker_thread.is_alive()):
            self.logger.info("No task running.")
            return
        self.stop_event.set()

    def find_available_project_name(self, output_dir: str) -> str:
        project_name = "project.coral"
        i = 1
        while os.path.exists(os.path.join(output_dir, project_name)):
            project_name = f"project_{i}.coral"
            i += 1

            if i > 1000:
                raise Exception("Too many project files in the output directory")
        return project_name

    def save_dataset(
        self, dataset: Dataset, original_project_path: str, new_project_dir: str
    ):
        os.makedirs(new_project_dir, exist_ok=True)

        # Unzip the original project
        temp_dir = os.path.join(
            os.path.dirname(original_project_path), TEMP_CREATE_NAME
        )
        with zipfile.ZipFile(original_project_path, "r") as archive:
            archive.extractall(temp_dir)

        # Create the new project folder
        new_temp_dir = os.path.join(new_project_dir, TEMP_CREATE_NAME)
        os.makedirs(new_temp_dir, exist_ok=True)

        original_image_dir = os.path.join(temp_dir, "images")
        new_image_dir = os.path.join(new_temp_dir, "images")
        os.makedirs(new_image_dir, exist_ok=True)

        original_embedding_dir = os.path.join(temp_dir, "embeddings")
        new_embedding_dir = os.path.join(new_temp_dir, "embeddings")
        os.makedirs(new_embedding_dir, exist_ok=True)

        original_annotation_dir = os.path.join(temp_dir, "annotations")
        new_annotation_dir = os.path.join(new_temp_dir, "annotations")
        os.makedirs(new_annotation_dir, exist_ok=True)

        # Remove all the outdated annotation files if exists in the new project
        for filename in os.listdir(new_annotation_dir):
            file_path = os.path.join(new_annotation_dir, filename)
            os.remove(file_path)

        # Save the new annotations
        for data in dataset.get_data_list():
            filename = os.path.splitext(data.get_image_name())[0]
            annotation_path = os.path.join(new_annotation_dir, f"{filename}.json")

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

        # Save the images if the new image folder is not
        # the same as the original image folder
        if original_image_dir != new_image_dir:
            for image_name in os.listdir(original_image_dir):
                image_path = os.path.join(original_image_dir, image_name)
                new_image_path = os.path.join(new_image_dir, image_name)
                shutil.copy(image_path, new_image_path)

        # Save the embeddings if the new embedding folder is not
        # the same as the original embedding folder
        if original_embedding_dir != new_embedding_dir:
            for embedding_name in os.listdir(original_embedding_dir):
                embedding_path = os.path.join(original_embedding_dir, embedding_name)
                new_embedding_path = os.path.join(new_embedding_dir, embedding_name)
                shutil.copy(embedding_path, new_embedding_path)

        # Save the project info
        new_project_info_path = os.path.join(new_temp_dir, "project_info.json")

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

        self.logger.debug(f"Status info: {dataset.get_status_info()}")
        for status in dataset.get_status_info():
            status_json = StatusJson()
            status_json.set_id(status["id"])
            status_json.set_name(status["name"])
            project_info_json.add_status_info(status_json)
        project_info_json.set_last_image_idx(dataset.get_last_saved_id())

        save_json(project_info_json.to_json(), new_project_info_path)

        # Zip the original project files back
        with zipfile.ZipFile(original_project_path, "w") as archive:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    archive.write(
                        os.path.join(root, file),
                        os.path.relpath(os.path.join(root, file), temp_dir),
                    )
        shutil.rmtree(temp_dir)

        # Zip the new project files if the new project path is different
        if os.path.dirname(original_project_path) != new_project_dir:
            new_project_name = self.find_available_project_name(new_project_dir)
            new_project_path = os.path.join(new_project_dir, new_project_name)
            with zipfile.ZipFile(new_project_path, "w") as archive:
                for root, _, files in os.walk(new_temp_dir):
                    for file in files:
                        archive.write(
                            os.path.join(root, file),
                            os.path.relpath(os.path.join(root, file), new_temp_dir),
                        )
            self.logger.info(f"Saving project to {new_project_path}")
            shutil.rmtree(new_temp_dir)


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


class ProjectExport:
    def __init__(self, project_path: str):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.project_path = project_path

    def export_images(self, output_dir: str):
        project_folder = os.path.dirname(self.project_path)

        # Extract the project files
        temp_dir = os.path.join(project_folder, TEMP_LOAD_NAME)
        unzip_file(self.project_path, temp_dir)

        # Create images folder
        image_folder = os.path.join(output_dir, "images")
        os.makedirs(image_folder, exist_ok=True)

        # Copy the images to the images folder
        project_image_folder = os.path.join(temp_dir, "images")
        for image_name in os.listdir(project_image_folder):
            image_path = os.path.join(project_image_folder, image_name)
            shutil.copy(image_path, image_folder)

        # Zip back the project files
        zip_file(temp_dir, self.project_path)

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
        output_annoted_image_folder = os.path.join(output_dir, "annoted_images")
        os.makedirs(output_annoted_image_folder, exist_ok=True)
        for data in data_list:
            image = decode_image_url(data["encoded_image"])
            image = Image.fromarray(image)
            image.save(os.path.join(output_annoted_image_folder, data["image_name"]))
