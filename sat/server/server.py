import logging
import time
import os

from tkinter import Tk, filedialog, messagebox
from .embedding import EmbeddingGenerator

# from .maskEiditor import MaskEidtor
from .mask.maskCreator import MaskCreator
from .mask.prompt import Prompt
from .util.general import get_resource_path

from .project import (
    ProjectCreator,
    ProjectLoader,
    ProjectExportor,
    JsonImportor,
    ProjectSaver,
)
from .util.requests import ProjectCreateRequest
from .dataset import Dataset, Data
from .util.coco import to_coco_annotation, rle_mask_to_rle_vis_encoding
from .util.requests import FileDialogRequest

from typing import Dict, List, Tuple

from functools import wraps


def time_it(func):
    @wraps(func)
    def wrapper(self: "Server", *args, **kwargs):
        start_time = time.time()
        result = func(self, *args, **kwargs)
        self.logger.info(
            f"{func.__name__} executed in {time.time() - start_time} seconds"
        )
        return result

    return wrapper


class Server:
    """
    This class handle all the requests from teh client sides
    """

    # Embedding models
    SAM_ENCODER_PATH = "models/vit_h_encoder_quantized.onnx"
    SAM_DECODER_PATH = "models/vit_h_decoder_quantized.onnx"
    SAM_MODEL_TYPE = "vit_b"

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

        # Mask Editor
        self.logger.info("Mask Editor initialized ...")
        start_time = time.time()
        model_path = get_resource_path(Server.SAM_DECODER_PATH)
        self.mask_creator = MaskCreator(model_path)
        self.logger.info(
            f"Mask Creator initialized in {time.time() - start_time} seconds"
        )

        # Project creation
        self.project_creator = ProjectCreator(self.embeddings_generator)

        # Dataset
        self.dataset: Dataset = None
        self.current_image_idx: int = 0
        self.project_path: str = None

    def select_folder(self, file_dialog_request: FileDialogRequest):
        """
        Open a dialog to select a folder
        """
        try:
            root = Tk()
            root.withdraw()
            root.wm_attributes("-topmost", 1)

            # On macOS, explicitly lift the window and force focus
            root.lift()
            root.update()  # Ensure the dialog is updated and visible

            folder_path = filedialog.askdirectory(title=file_dialog_request.get_title())
            root.destroy()

            if folder_path:
                self.logger.info(f"Selected folder: {folder_path}")
                return folder_path
            else:
                self.logger.info(f"Folder selection cancelled")
                return None
        except Exception as e:
            self.logger.error(f"Error selecting folder: {e}")
            return None

    def select_file(self, file_dialog_request: FileDialogRequest):
        """
        Open a dialog to select a file
        """
        try:

            # Create a hidden Tkinter root window
            root = Tk()
            root.withdraw()  # Hide the root window
            root.wm_attributes(
                "-topmost", 1
            )  # Make the dialog appear on top of other windows

            # On macOS, explicitly lift the window and force focus
            root.lift()
            root.update()  # Ensure the dialog is updated and visible

            # Open the file selection dialog
            file_path = filedialog.askopenfilename(
                title=file_dialog_request.get_title(),
                filetypes=file_dialog_request.get_filetypes(),
            )
            # Destroy the root window after use
            root.destroy()

            if file_path:
                self.logger.info(f"Selected file: {file_path}")
                return file_path
            else:
                self.logger.info(f"File selection cancelled")
                return None
        except Exception as e:
            self.logger.error(f"Error selecting file: {e}")
            return None

    def select_save_file(self, file_dialog_request: FileDialogRequest):
        try:
            root = Tk()
            root.withdraw()

            root.wm_attributes("-topmost", 1)
            root.lift()
            root.update()

            while True:
                self.logger.info(
                    f"defualtextension: {file_dialog_request.get_defaultextension()}"
                )
                file_path = filedialog.asksaveasfilename(
                    title=file_dialog_request.get_title(),
                    defaultextension=file_dialog_request.get_defaultextension(),
                    filetypes=file_dialog_request.get_filetypes(),
                )

                if not file_path:
                    self.logger.info(f"No file selected. Operation canceled.")
                    return None

                if os.path.basename(file_path) == "":
                    messagebox.showerror(
                        "Invalid File Name", "You must provide a valid file name."
                    )
                    continue

                self.logger.info(f"Selected save file: {file_path}")
                return file_path
        except Exception as e:
            self.logger.error(f"Error selecting save file: {e}")
            return None

    def create_project(self, project_create_request: Dict):
        self.logger.info(f"Creating project ...")
        project_create_request = ProjectCreateRequest(project_create_request)
        self.project_creator.create(project_create_request)

    @time_it
    def load_project(self, project_path: str):
        if project_path is None:
            project_path = ProjectCreator.TEMP_PROJECT_FILE

        self.logger.info(f"Loading project from {project_path} ...")
        project_loader = ProjectLoader()

        dataset, last_image_idx = project_loader.load(project_path)
        self.logger.info(f"Project loaded with last image idx: {last_image_idx}")

        self.set_dataset(dataset)
        self.set_current_image_idx(last_image_idx)

        self.set_project_path(project_path)
        self.logger.info(f"Project path set to {self.project_path}")

    def get_current_data_dict(self) -> Dict:
        return self.get_data_dict(self.get_current_image_idx())

    @time_it
    def get_gallery_data_list(self) -> List[Dict]:
        """
        Get the list of data for the gallery view
        """
        data_list = self.dataset.get_data_list()
        return [data.to_image_json() for data in data_list]

    @time_it
    def get_data_dict(self, image_idx: int) -> Dict:
        """
        Get data information:
        {
            "image_name": str,
            "image_path": str,
            "idx": int,
            "segmentation": List[Dict] - Annotation in coco format,
            "category_info": List[Dict] - Category information,
            "status_info": List[Dict] - Status information
        }
        """

        data = self.get_data(image_idx)

        category_info = self.dataset.get_category_info()
        if category_info is None:
            self.logger.error(f"Category info not found")
            return None

        response = data.to_json()
        response["category_info"] = category_info

        return response

    def get_data(self, image_idx: int) -> Data:
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

        return data

    @time_it
    def get_data_list(self) -> List[Data]:
        self.logger.info(f"Getting data list ...")
        return self.dataset.get_data_list()

    def to_next_data(self) -> None:
        """
        Move to the next data. If there are no next data,
        stay at the current data
        """
        current_image_idx = self.get_current_image_idx()
        next_image_idx = current_image_idx + 1

        self.logger.info(f"Moving to next data index: {next_image_idx}")
        if next_image_idx >= self.dataset.get_size():
            self.logger.info(f"No next data found. Returning current data ...")
            return

        self.set_current_image_idx(next_image_idx)

    def to_prev_data(self) -> None:
        """
        Move to the previous data. If there are no previous data,
        stay at the current data
        """
        current_image_idx = self.get_current_image_idx()
        previous_image_idx = current_image_idx - 1

        self.logger.info(f"Moving to previous data index: {previous_image_idx}")
        if previous_image_idx < 0:
            self.logger.info(f"No previous data found. Returning current data ...")
            return

        self.set_current_image_idx(previous_image_idx)

    def terminate_create_project_process(self):
        self.logger.info(f"Terminating project creation ...")
        self.project_creator.terminate()

    def set_dataset(self, dataset):
        self.dataset = dataset

    def get_dataset(self):
        return self.dataset

    def set_current_image_idx(self, image_idx: int):
        assert image_idx >= 0, "Image index must be greater than or equal to 0"
        assert image_idx < self.dataset.get_size(), "Image index out of range"

        self.current_image_idx = image_idx

        data = self.get_data(image_idx)
        self.mask_creator.set_image(
            data.get_embedding(),
            [
                data.get_image_height(),
                data.get_image_width(),
            ],
        )

    def get_current_image_idx(self):
        return self.current_image_idx

    def save_data(self, data: Dict):
        """
        Save the data to the dataset
        {
            "images": List[Dict],
            "annotations": List[Dict]
            "category_info": List[Dict]
        }
        """
        self.logger.info(f"Saving data ...")
        segmentation = {}
        segmentation["images"] = data["images"]
        segmentation["annotations"] = data["annotations"]

        data_idx = data["images"][0]["id"]
        self.dataset.update_data(data_idx, segmentation)
        self.dataset.set_category_info(data["category_info"])

    @time_it
    def save_dataset(self, output_path: str):

        if output_path is None:
            output_path = self.get_project_path()

        self.logger.info(f"Saving the dataset to {output_path} ...")

        project_saver = ProjectSaver()
        project_saver.save_dataset(self.dataset, self.get_project_path(), output_path)

    def get_project_path(self) -> str:
        return self.project_path

    def set_project_path(self, project_path: str):
        self.project_path = project_path

    def get_data_ids_by_category_id(self, category_id: int) -> List[int]:
        data_list = self.dataset.get_data_list_by_category_id(category_id)
        return [data.get_idx() for data in data_list]

    def create_mask(self, prompts: List[Dict]) -> Dict:
        """
        Create a mask based on the prompts

        Args:
            prompts: List of prompts

        Returns:
            A dictionary containing the mask annotation,
            which mainly follow the coco format
            {
                "id": int,
                "image_id": int,
                "category_id": int,
                "segmentation": List[List[float]],
                "area": int,
                "bbox": List[int],
                "iscrowd": int,
                "rle": rle-encoded mask, added for frontend visualization
            }
        """
        self.logger.info(f"Creating mask ...")

        prompts = [Prompt(prompt) for prompt in prompts]
        mask = self.mask_creator.create_mask(prompts)
        annotation = to_coco_annotation(mask)
        annotation["category_id"] = -2  # Category id for prompted mask
        annotation["rle"] = rle_mask_to_rle_vis_encoding(annotation["segmentation"])

        return annotation

    @time_it
    def export_images(self, output_dir: str):
        self.logger.info(f"Exporting images to {output_dir} ...")
        project_export = ProjectExportor(self.project_path)
        project_export.export_images(output_dir)

    @time_it
    def export_annotated_images(self, output_dir: str, data_list: List[Dict]):
        self.logger.info(f"Exporting annotated images to {output_dir} ...")
        project_export = ProjectExportor(self.project_path)
        project_export.export_annotated_images(output_dir, data_list)

    @time_it
    def export_coco(self, output_path: str):
        self.logger.info(f"Exporting COCO dataset to {output_path} ...")
        project_export = ProjectExportor(self.project_path)
        project_export.export_coco(output_path, self.get_dataset())

    @time_it
    def import_json(self, input_path: str):
        self.logger.info(f"Importing JSON from {input_path} ...")

        json_importor = JsonImportor()
        improted_dataset = json_importor.import_json(input_path)

        imported_data_dict: Dict[str, Data] = {}
        for imported_data in improted_dataset.get_data_list():
            imported_data_dict[imported_data.get_image_name()] = imported_data

        matched_count = 0
        for data in self.dataset.get_data_list():
            data_name = data.get_image_name()
            if data_name in imported_data_dict:
                self.logger.info(f"Matching data found for {data_name}")
                matched_count += 1

                # Update the segmentation json information
                imported_data = imported_data_dict[data_name]
                data_idx = data.get_idx()

                segmentation = imported_data.get_segmentation()
                segmentation["images"][0]["id"] = data_idx

                for annotation in segmentation["annotations"]:
                    annotation["image_id"] = data_idx
                data.set_segmentation(imported_data.get_segmentation())
            else:
                # If not matching found, then set the annotation to empty
                self.logger.error(f"Data not found for {data_name}")
                image_data = data.get_segmentation()["images"][0]
                data.set_segmentation({"images": [image_data], "annotations": []})

        self.logger.info(f"Matched {matched_count} data")
        self.dataset.set_category_info(improted_dataset.get_category_info())
