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


from typing import Dict, Tuple, List, Union

TEMP_CREATE_NAME = "__coralscop_lat_temp"
TEMP_LOAD_NAME = "__coralscop_lat_temp_load"


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

            image, embedding, annotations = self.process_one_input(
                image_url, image_filename, min_area, min_confidence, max_iou
            )

            # Check if the stop event is set
            if image is None or embedding is None or annotations is None:
                terminated = True
                break

            image_path = os.path.join(image_folder, image_filename)
            embedding_path = os.path.join(embedding_folder, f"{filename}.npy")
            annotation_path = os.path.join(annotation_folder, f"{filename}.json")

            np.save(embedding_path, embedding)
            save_json(annotations, annotation_path)
            Image.fromarray(image).save(image_path)

            process_percentage = (idx + 1) / len(inputs) * 100
            process_percentage = int(process_percentage)
            eel.updateProgressPercentage(process_percentage)

        if terminated:
            # If the process is terminated, clear the temporary folder and return
            self.clear_temp_folder(output_dir)
            status = {}
            status["finished"] = False
            eel.afterProjectCreation(status)
            return

        project_info = {}
        project_info["last_image_idx"] = 0
        project_info["category_info"] = [
            {
                "id": -1,
                "name": "Detected Coral",
                "supercategory": "Detected Coral",
                "supercategory_id": -1,
                "is_coral": True,
                "status": -1,
            },
            {
                "id": 0,
                "name": "Dead Coral",
                "supercategory": "Dead Coral",
                "supercategory_id": 0,
                "is_coral": True,
                "status": 2,
            },
        ]
        save_json(project_info, project_info_path)

        self.save(output_dir)

        status = {}
        status["finished"] = True
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

    def process_one_input(
        self,
        image_url: str,
        image_name: str,
        min_area: float,
        min_confidence: float,
        max_iou: float,
    ) -> Tuple[np.ndarray, np.ndarray, Dict]:
        """
        Process one input item
        1. Decode image_url to image
        2. Generate embedding
        3. Generate coral segmentation

        Returns:
        image: np.ndarray
        embedding: np.ndarray
        output_json: Dict
        """
        # Convert image_url to image
        start_time = time.time()
        image = decode_image_url(image_url)
        self.logger.info(f"Decoded image in {time.time() - start_time:.2f} seconds")

        # Periodically check if the stop event is set
        if self.stop_event.is_set():
            self.logger.info("Project creation stopped.")
            return None, None, None

        # Generate embedding
        embedding = self.embeddings_generator.generate_embedding(image)

        # Periodically check if the stop event is set
        if self.stop_event.is_set():
            self.logger.info("Project creation stopped.")
            return None, None, None

        # Generate coral segmentation
        annotations = self.segmentation.generate_masks_json(image)
        annotations = self.segmentation.filter(
            annotations, min_area, min_confidence, max_iou
        )
        image_json = gen_image_json(image, image_name)

        image_id = 0
        image_json["image_id"] = image_id
        for annotation in annotations:
            annotation["image_id"] = image_id

        output_json = {}
        output_json["images"] = image_json
        output_json["annotations"] = annotations

        return image, embedding, output_json

    def save(self, output_dir: str):
        """
        Save the project data to a zip file with .coral extension.
        """
        output_temp_dir = os.path.join(output_dir, TEMP_CREATE_NAME)

        output_file = os.path.join(output_dir, "project.coral")

        # Detect is there is a project.coral file in the output_dir
        # If yes, change the output_file to project_1.coral and so on
        i = 1
        while os.path.exists(output_file):
            output_file = os.path.join(output_dir, f"project_{i}.coral")
            i += 1

            # Add exit case to prevent infinite loop
            if i > 1000:
                raise Exception("Too many project files in the output directory")

        with zipfile.ZipFile(output_file, "w") as archive:
            for root, _, files in os.walk(output_temp_dir):
                for file in files:
                    archive.write(
                        os.path.join(root, file),
                        os.path.relpath(os.path.join(root, file), output_temp_dir),
                    )

        # Delete the temporary folder
        self.clear_temp_folder(output_dir)

    def clear_temp_folder(self, output_dir: str) -> None:
        """
        Clear the temporary folder in the output directory.
        """
        temp_folder = os.path.join(output_dir, TEMP_CREATE_NAME)
        if os.path.exists(temp_folder):
            shutil.rmtree(temp_folder)


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
            data.set_idx(idx)

            embedding = np.load(embedding_path)
            data.set_embedding(embedding)

            annotations = load_json(annotation_path)
            data.set_segmentation(annotations)

            dataset.add_data(data)

        # Load project info
        project_info = load_json(project_info_path)
        last_image_idx = project_info["last_image_idx"]
        category_info = project_info["category_info"]
        dataset.set_category_info(category_info)

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
