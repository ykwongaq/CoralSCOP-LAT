import logging
import os
import threading
import time
import eel
import numpy as np
import zipfile
import shutil
import tempfile

from ..util.general import decode_image_url
from ..util.json import save_json
from ..embedding import EmbeddingGenerator
from PIL import Image
from ..util.requests import ProjectCreateRequest

from ..jsonFormat import (
    ImageJson,
    ProjectInfoJson,
    AnnotationFileJson,
)

TEMP_CREATE_NAME = "__sat_temp"


class ProjectCreator:

    SAM_ENCODER_PATH = "models/vit_h_encoder_quantized.onnx"
    SAM_MODEL_TYPE = "vit_b"

    TEMP_PROJECT_FILE = os.path.join(
        tempfile.gettempdir(), "SAT", "temp_project.sat"
    )

    # Singleton
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(ProjectCreator, cls).__new__(cls)
        return cls._instance

    def __init__(self, embedding_generator: EmbeddingGenerator):
        if hasattr(self, "initialized"):
            # Prevent re-initialization
            return

        self.logger = logging.getLogger(self.__class__.__name__)
        self.embeddings_generator = embedding_generator

        # Threading
        self.stop_event = threading.Event()
        self.worker_thread = None

    def create_(
        self,
        request: ProjectCreateRequest,
        frontend_enabled: bool = True,
    ):
        """
        Create a proejct from the request. The project data will be stored in a zip file with .coral extension.
        """
        inputs = request.get_inputs()
        inputs = sorted(inputs, key=lambda x: x["image_file_name"])

        output_file = request.get_output_file()

        if output_file is None:
            output_file = ProjectCreator.TEMP_PROJECT_FILE
        self.logger.info(f"Creating project at {output_file}")

        if os.path.exists(output_file):
            os.remove(output_file)

        output_dir = os.path.dirname(output_file)

        # Temporary folders for storing images, embeddings, annotations, and project info
        output_temp_dir = os.path.join(output_dir, TEMP_CREATE_NAME)
        if os.path.exists(output_temp_dir):
            shutil.rmtree(output_temp_dir)
        os.makedirs(output_temp_dir, exist_ok=True)

        image_folder = os.path.join(output_temp_dir, "images")
        os.makedirs(image_folder, exist_ok=True)

        embedding_folder = os.path.join(output_temp_dir, "embeddings")
        os.makedirs(embedding_folder, exist_ok=True)

        annotation_folder = os.path.join(output_temp_dir, "annotations")
        os.makedirs(annotation_folder, exist_ok=True)

        project_info_path = os.path.join(output_temp_dir, "project_info.json")

        # Update process in the frontend

        if frontend_enabled:
            eel.updateProgressPercentage(0)

        terminated = False
        for idx, input in enumerate(inputs):
            image_filename = input["image_file_name"]
            filename = os.path.splitext(image_filename)[0]

            self.logger.info(f"Processing input {idx + 1} of {len(inputs)}")
            self.logger.info(f"Processing image: {image_filename}")

            start_time = time.time()
            self.logger.info(f"Processing image {image_filename} ...")

            # Create image
            if "image_path" in input:
                image_path = input["image_path"]
                image = Image.open(image_path)
                image = image.convert("RGB")
                image = np.array(image)
            else:
                image_url = input["image_url"]
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

            # Generate annotations
            annotation_file_json = AnnotationFileJson()

            image_json = ImageJson()
            image_json.set_id(idx)
            image_json.set_filename(image_filename)
            image_json.set_width(image.shape[1])
            image_json.set_height(image.shape[0])
            annotation_file_json.add_image(image_json)

            end_time = time.time()
            self.logger.info(f"Processed image in {end_time - start_time:.2f} seconds")

            # Check if the stop event is set
            if image is None or embedding is None:
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

            if frontend_enabled:
                eel.updateProgressPercentage(process_percentage)

        if terminated:
            # If the process is terminated, clear the temporary folder and return
            # self.clear_temp_folder(output_dir)
            shutil.rmtree(output_temp_dir)
            status = {}
            status["finished"] = False

            if frontend_enabled:
                eel.afterProjectCreation(status)
            return

        project_info_json = ProjectInfoJson()
        project_info_json.set_last_image_idx(0)
        save_json(project_info_json.to_json(), project_info_path)

        project_path = output_file
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

        if frontend_enabled:
            eel.afterProjectCreation(status)

    def create(
        self,
        request: ProjectCreateRequest,
        frontend_enabled: bool = True,
    ):
        """
        Create a project from the request. A threading process will be created to handle user termination.
        """
        if self.worker_thread is not None and self.worker_thread.is_alive():
            self.logger.info("Task is already running.")
            return

        self.stop_event.clear()
        self.worker_thread = threading.Thread(
            target=self.create_, args=(request, frontend_enabled)
        )
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
        project_name = "project.sat"
        i = 1
        while os.path.exists(os.path.join(output_dir, project_name)):
            project_name = f"project_{i}.sat"
            i += 1

            if i > 1000:
                raise Exception("Too many project files in the output directory")
        return project_name
