import logging
import time
import os
import numpy as np
import copy
import shutil

from tkinter import Tk, filedialog, messagebox
from .embedding import EmbeddingGenerator
from .segmentation import CoralSegmentation

# from .maskEiditor import MaskEidtor
from .mask import MaskCreator, Prompt
from .util.general import get_resource_path
from .project import (
    ProjectCreator,
    ProjectLoader,
    ProjectExportor,
    ProjectSaver,
)
from .jsonFormat import AnnotationJson
from .dataset import Dataset, Data
from .util.coco import to_coco_annotation, rle_mask_to_rle_vis_encoding
from .util.requests import FileDialogRequest, ProjectCreateRequest
from .util.data import unzip_file
from PIL import Image
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

    # CoralSCOP
    CORALSCOP_PATH = "models/vit_b_coralscop.pth"
    CORALSCOP_MODEL_TYPE = "vit_b"

    def __init__(self, model_type: str = "vit_b"):
        self.logger = logging.getLogger(self.__class__.__name__)

        self.model_type = model_type
        # Embedding Encoder Model
        self.logger.info("Loading embedding encoder model ...")
        start_time = time.time()

        if model_type == "vit_h":
            self.encoder_model_path = get_resource_path(Server.SAM_ENCODER_PATH)
            self.decoder_model_path = get_resource_path(Server.SAM_DECODER_PATH)
        elif model_type == "vit_l":
            self.encoder_model_path = get_resource_path(
                os.path.join("models", "vit_l_encoder.onnx")
            )
            self.decoder_model_path = get_resource_path(
                os.path.join("models", "vit_l_decoder.onnx")
            )
        elif model_type == "vit_b":
            self.encoder_model_path = get_resource_path(
                os.path.join("models", "vit_b_encoder_quantized.onnx")
            )
            self.decoder_model_path = get_resource_path(
                os.path.join("models", "vit_b_decoder_quantized.onnx")
            )

        model_path = get_resource_path(self.encoder_model_path)
        # model_path = get_resource_path(Server.CORALSCOP_PATH)
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
        # model_path = get_resource_path(Server.CORALSCOP_PATH)
        model_path = get_resource_path(Server.SAM_DECODER_PATH)
        self.mask_creator = MaskCreator(self.decoder_model_path)
        self.logger.info(
            f"Mask Creator initialized in {time.time() - start_time} seconds"
        )

        # Project creation
        self.project_creator = ProjectCreator(
            self.embeddings_generator, self.coral_segmentation
        )

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

                # if os.path.exists(file_path):
                #     confirm = messagebox.askyesno(
                #         "File Exists",
                #         f"The file '{os.path.basename(file_path)}' already exists. Do you want to overwrite it?",
                #     )

                #     if not confirm:
                #         continue

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

        status_info = self.dataset.get_status_info()
        if status_info is None:
            self.logger.error(f"Status info not found")
            return None

        response = data.to_json()
        response["category_info"] = category_info
        response["status_info"] = status_info

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
        self.dataset.set_status_info(data["status_info"])

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
        annotation["predicted_iou"] = 1.0

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
    def export_excel(self, output_dir: str):
        self.logger.info(f"Exporting Excel dataset to {output_dir} ...")
        project_export = ProjectExportor(self.project_path)
        project_export.export_excel(output_dir, self.get_dataset())

    @time_it
    def export_charts(self, output_dir: str, requests: List[Dict]):
        self.logger.info(f"Exporting charts to {output_dir} ...")
        project_export = ProjectExportor(self.project_path)
        project_export.export_charts(output_dir, requests)

    @time_it
    def detect_coral(self, request: Dict) -> Data:
        self.logger.info(f"Detecting coral ...")

        # Reuse create project to store the configuration
        create_project_request = ProjectCreateRequest(request)

        data = self.get_data(self.get_current_image_idx())

        # Unzip the project folder to get the image
        temp_folder = os.path.join(os.path.dirname(self.project_path), "temp")
        if os.path.exists(temp_folder):
            shutil.rmtree(temp_folder)
        os.makedirs(temp_folder, exist_ok=True)
        unzip_file(self.project_path, temp_folder)

        image_folder = os.path.join(temp_folder, "images")
        image_paths = []
        for file in os.listdir(image_folder):
            image_paths.append(os.path.join(image_folder, file))

        assert len(image_paths) == 1, "Only one image is expected"
        image_path = image_paths[0]

        image = Image.open(image_path)
        image = np.array(image)

        # Remove the temporary folder
        shutil.rmtree(temp_folder)

        masks = self.coral_segmentation.generate_masks_json(image)
        if len(masks) == 0:
            self.logger.info(f"No coral detected")
            return

        # Add detected coral into the annotation list
        min_area = create_project_request.get_min_area()
        min_confidence = create_project_request.get_min_confidence()
        max_iou = create_project_request.get_max_iou()

        masks = self.coral_segmentation.filter(masks, min_area, min_confidence, max_iou)

        data_idx = data.get_idx()
        annotation_list = []
        for idx, mask in enumerate(masks):
            annotation_json = AnnotationJson()
            annotation_json.set_segmentation(mask["segmentation"])
            annotation_json.set_bbox(mask["bbox"])
            annotation_json.set_area(mask["area"])
            annotation_json.set_category_id(mask["category_id"])
            annotation_json.set_id(idx)
            annotation_json.set_image_id(data_idx)
            annotation_json.set_iscrowd(mask["iscrowd"])
            annotation_json.set_predicted_iou(mask["predicted_iou"])
            annotation_list.append(annotation_json.to_json())

        segmentation = data.get_segmentation()
        segmentation = copy.deepcopy(segmentation)
        segmentation["annotations"] = annotation_list

        new_data = Data()
        new_data.set_idx(data_idx)
        new_data.set_image_name(data.get_image_name())
        new_data.set_image_path(data.get_image_path())
        new_data.set_segmentation(segmentation)
        new_data.set_embedding(data.get_embedding())

        return new_data
