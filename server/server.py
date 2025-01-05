import logging
import time

from tkinter import Tk, filedialog
from .embedding import EmbeddingGenerator
from .segmentation import CoralSegmentation
from .maskEiditor import MaskEidtor
from .util.general import get_resource_path
from .project import ProjectCreator, ProjectCreateRequest, ProjectLoader
from .dataset import Dataset, Data

from typing import Dict


class Server:
    """
    This class handle all the requests from teh client sides
    """

    # Embedding models
    SAM_ENCODER_PATH = "models/vit_h_encoder_quantized.onnx"
    SAM_DECODER_PATH = "models/vit_h_decoder_quantized.onnx"
    SAM_MODEL_TYPE = "vit_b"

    # CoralSCOP
    CORALSCOP_PATH = "models/vit_b_coralscop.pth"
    CORALSCOP_MODEL_TYPE = "vit_b"

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)

        # Embedding Encoder Model
        self.logger.info("Loading embedding encoder model ...")
        start_time = time.time()
        model_path = get_resource_path(Server.SAM_ENCODER_PATH)
        self.embeddings_generator = EmbeddingGenerator(model_path)
        self.logger.info(
            f"Embedding model loaded in {time.time() - start_time} seconds"
        )

        # Coral Segmentation Model
        self.logger.info("Loading segmentation model ...")
        start_time = time.time()
        model_path = get_resource_path(Server.CORALSCOP_PATH)
        self.coral_segmentation = CoralSegmentation(
            model_path, Server.CORALSCOP_MODEL_TYPE
        )
        self.logger.info(f"CoralSCOP loaded in {time.time() - start_time} seconds")

        # Mask Editor
        self.logger.info("Mask Editor initialized ...")
        start_time = time.time()
        model_path = get_resource_path(Server.SAM_DECODER_PATH)
        self.mask_editor = MaskEidtor(model_path)
        self.logger.info(
            f"Mask Editor initialized in {time.time() - start_time} seconds"
        )

        # Project creation
        self.project_creator = ProjectCreator(
            self.embeddings_generator, self.coral_segmentation
        )

        # Dataset
        self.dataset: Dataset = None
        self.current_image_idx: int = 0

    def select_folder(self):
        """
        Open a dialog to select a folder
        """
        root = Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        folder_path = filedialog.askdirectory(title="Please select a folder")
        root.destroy()
        self.logger.info(f"Selected folder: {folder_path}")
        return folder_path

    def select_file(self):
        """
        Open a dialog to select a file
        """

        # Create a hidden Tkinter root window
        root = Tk()
        root.withdraw()  # Hide the root window
        root.wm_attributes(
            "-topmost", 1
        )  # Make the dialog appear on top of other windows

        # Open the file selection dialog
        file_path = filedialog.askopenfilename(
            title="Select a File",
            filetypes=[
                ("All Files", "*.*"),
                ("Text Files", "*.txt"),
                ("Python Files", "*.py"),
            ],
        )
        # Destroy the root window after use
        root.destroy()
        self.logger.info(f"Selected file: {file_path}")
        return file_path

    def create_project(self, project_create_request: Dict):
        self.logger.info(f"Creating project ...")
        project_create_request = ProjectCreateRequest(project_create_request)
        self.project_creator.create(project_create_request)

    def load_project(self, project_path: str):
        self.logger.info(f"Loading project from {project_path} ...")
        project_loader = ProjectLoader()

        start_time = time.time()
        dataset, last_image_idx = project_loader.load(project_path)
        self.logger.info(f"Project loaded in {time.time() - start_time} seconds")
        self.logger.info(f"Project loaded with last image idx: {last_image_idx}")

        self.set_dataset(dataset)
        self.set_current_image_idx(last_image_idx)

    def get_current_data(self) -> Dict:
        return self.get_data(self.get_current_image_idx())

    def get_data(self, image_idx: int) -> Dict:
        """
        Get data information for the image idx.
        The data information include the category information.
        """

        self.logger.info(f"Getting data for image idx: {image_idx}")
        if self.dataset is None:
            self.logger.error(f"Dataset is not set")
            return None

        data = self.dataset.get_data(image_idx)
        if data is None:
            self.logger.error(f"Data not found for image idx: {image_idx}")
            return None

        category_info = self.dataset.get_category_info()
        if category_info is None:
            self.logger.error(f"Category info not found")
            return None

        response = data.to_json()
        response["category_info"] = category_info

        return response

    def get_next_data(self) -> Dict:
        """
        Get the next data. If there are not
        next data, return the current one
        """
        current_image_idx = self.get_current_image_idx()
        next_image_idx = current_image_idx + 1

        self.logger.info(f"Getting next data for image idx: {next_image_idx}")
        if next_image_idx >= self.dataset.get_size():
            self.logger.info(f"No next data found. Returning current data ...")
            return self.get_current_data()

        self.set_current_image_idx(next_image_idx)
        return self.get_current_data()

    def get_previous_data(self) -> Dict:
        """
        Get the previous data. If there are not
        previous data, return the current one
        """
        current_image_idx = self.get_current_image_idx()
        previous_image_idx = current_image_idx - 1

        self.logger.info(f"Getting previous data for image idx: {previous_image_idx}")
        if previous_image_idx < 0:
            self.logger.info(f"No previous data found. Returning current data ...")
            return self.get_current_data()

        self.set_current_image_idx(previous_image_idx)
        return self.get_current_data()

    def terminate_create_project_process(self):
        self.logger.info(f"Terminating project creation ...")
        self.project_creator.terminate()

    def set_dataset(self, dataset):
        self.dataset = dataset

    def get_dataset(self):
        return self.dataset

    def set_current_image_idx(self, image_idx):
        self.current_image_idx = image_idx

    def get_current_image_idx(self):
        return self.current_image_idx
