import logging
import time


# Initialize logging
def setup_logging(log_file="log.log"):
    # Define a custom format for the log messages
    log_format = "[%(levelname)s][%(asctime)s][%(name)s] %(message)s"
    date_format = "%Y-%m-%d|%H:%M:%S"

    # Create console handler and set level to debug
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)

    # Create file handler and set level to debug
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)

    # Create formatter and add it to the handlers
    formatter = logging.Formatter(fmt=log_format, datefmt=date_format)
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)

    # Get the root logger and set level to debug
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)

    # Add the handlers to the root logger
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)


# Initialize logging
setup_logging()

import copy
import os
import time
from tkinter import Tk, filedialog

import eel
import numpy as np
from PIL import Image
from server.dataset import Data, DataFilter, Dataset, calculate_iou_matrix
from server.embedding import EmbeddingGenerator
from server.maskEiditor import MaskEidtor
from server.segmentation import CoralSegmentation
from server.util.coco import coco_mask_to_rle, encode_to_coco_mask, decode_coco_mask
from server.util.general import (
    decode_image_url,
    get_resource_path,
    remove_image_url_header,
)
from server.util.json import gen_image_json, gen_mask_json, save_json
from server.statistic import StatisticGraph


class PreprocessServer:
    DEFAULT_CONFIG = {
        "output_dir": ".",
    }

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Initializing {self.__class__.__name__} ...")

        # Initialize the EmbeddingGenerator
        model_path = get_resource_path("models/vit_h_encoder_quantized.onnx")
        model_type = "vit_b"
        self.embedding_generator = EmbeddingGenerator(model_path, model_type)

        # Initialize the CoralSegmentation
        coral_model_path = get_resource_path("models/vit_b_coralscop.pth")
        self.coral_segmentation = CoralSegmentation(coral_model_path, "vit_b")

        self.config = PreprocessServer.DEFAULT_CONFIG

        self.data_filter = DataFilter()

    def update_config(self, config):
        self.config.update(config)
        self.logger.info(f"Updated configuration: {self.config}")

    def check_valid_folder(self, path):
        # Get the parent directory of the given path
        parent_dir = os.path.dirname(path)

        # Check if the parent directory exists
        if not os.path.exists(parent_dir):
            error_message = f"Parent directory does not exist: {parent_dir}"
            self.logger.debug(error_message)
            return False, error_message

        # Check if you have write permission in the parent directory
        if not os.access(parent_dir, os.W_OK):
            error_message = f"No write permission in the parent directory: {parent_dir}"
            self.logger.debug(error_message)
            return False, error_message

        try:
            os.makedirs(path, exist_ok=True)
            return True, ""
        except Exception as e:
            self.logger.error(f"Error creating directory: {e}")
            return False, str(e)

    def preprocess(self, image_url: str, image_file: str, projectPath: str):
        self.logger.info(f"Preprocessing image: {image_file}")

        output_folder = projectPath
        output_folder = os.path.normpath(output_folder)
        os.makedirs(output_folder, exist_ok=True)

        image = decode_image_url(image_url)
        self.logger.debug(f"image shape: {image.shape}")

        # Save the image
        image_folder = os.path.join(output_folder, "images")
        image_path = os.path.join(image_folder, image_file)
        os.makedirs(image_folder, exist_ok=True)
        self.save_image(image, image_path)

        # Generate the image embedding
        start_time = time.time()
        embedding = self.embedding_generator.generate_embedding(image)
        filename = os.path.splitext(image_file)[0]
        embedding_folder = os.path.join(output_folder, "embeddings")
        os.makedirs(embedding_folder, exist_ok=True)
        embedding_output_file = os.path.join(embedding_folder, f"{filename}.npy")
        self.save_embedding(embedding, embedding_output_file)
        end_time = time.time()
        self.logger.info(f"Time taken to generate embedding: {end_time - start_time}")

        # Generate coral segmentation masks
        start_time = time.time()
        annotation_folder = os.path.join(output_folder, "annotations")
        os.makedirs(annotation_folder, exist_ok=True)
        annotation_output_file = os.path.join(annotation_folder, f"{filename}.json")
        annotations = self.coral_segmentation.generate_masks_json(image)
        image_json = gen_image_json(image, filename=image_file)
        end_time = time.time()
        self.logger.info(f"Time taken to generate masks: {end_time - start_time}")

        image_id = 0
        image_json["image_id"] = image_id
        for annotation in annotations:
            annotation["image_id"] = image_id

        output_json = {}
        output_json["image"] = image_json
        output_json["annotations"] = annotations

        # Initialize the iou matrix
        start_time = time.time()
        masks = []
        for annotation in annotations:
            mask = decode_coco_mask(annotation["segmentation"])
            masks.append(mask)
        iou_matrix = calculate_iou_matrix(masks)
        output_json["iou_matrix"] = iou_matrix.tolist()
        self.save_json(output_json, annotation_output_file)
        end_time = time.time()
        self.logger.info(f"Time taken to generate iou matrix: {end_time - start_time}")

        # Geenrate project file
        project_file = os.path.join(output_folder, "project.json")
        project_info = {}
        project_info["project_path"] = os.path.abspath(projectPath)
        project_info["labels"] = {0: "Dead Coral"}
        # Set the first image to default filter config
        project_info["filter_config"] = {0: self.data_filter.export_config()}

        self.save_json(project_info, project_file)

        return image, embedding, output_json, project_info

    def save_image(self, image, output_path):
        self.logger.info(f"Saving image to {output_path}")
        image_ = Image.fromarray(image)
        image_.save(output_path)

    def save_embedding(self, embedding, output_path):
        self.logger.info(f"Saving embedding to {output_path}")
        np.save(output_path, embedding)

    def save_json(self, json, output_path):
        self.logger.info(f"Saving json to {output_path}")
        save_json(json, output_path)


class LabelServe:

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Initializing {self.__class__.__name__} ...")

        onnx_path = get_resource_path("models/vit_h_decoder_quantized.onnx")
        # onnx_path = get_resource_path("models/sam_vit_b.onnx")
        self.mask_editor = MaskEidtor(onnx_path)

    def add_edit_mask_input_point(self, x, y, label):
        self.logger.info(f"Adding point to mask editor: ({x}, {y}, {label})")

        self.mask_editor.add_input(x, y, label)
        mask = self.mask_editor.infer_mask()
        annotation = gen_mask_json(mask)
        rle = coco_mask_to_rle(annotation["segmentation"])
        annotation["segmentation"]["counts_number"] = rle

        return_item = {}
        return_item["annotation"] = annotation
        return_item["selected_points"] = self.mask_editor.get_input_points()
        return_item["labels"] = self.mask_editor.get_input_labels()
        return return_item

    def undo_edit_mask_input_point(self):
        self.logger.info("Undoing input point")
        self.mask_editor.undo_input()
        mask = self.mask_editor.infer_mask()
        annotation = gen_mask_json(mask)
        rle = coco_mask_to_rle(annotation["segmentation"])
        annotation["segmentation"]["counts_number"] = rle

        return_item = {}
        return_item["annotation"] = annotation
        return_item["selected_points"] = self.mask_editor.get_input_points()
        return_item["labels"] = self.mask_editor.get_input_labels()
        return return_item

    def clear_edit_mask_input_points(self):
        self.logger.info("Clearing input points")
        self.mask_editor.clear_inputs()

    def confirm_edit_mask_input(self):
        self.logger.info("Confirming mask input")
        self.mask_editor.clear_inputs()

    def set_editting_image_by_idx(self, idx: int, data: Data):
        self.logger.info(f"Setting editting image for index {idx} ...")
        image = data.get_image()
        embedding = data.get_embedding()
        self.mask_editor.set_image(image, embedding)


class Server:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Initializing {self.__class__.__name__} ...")

        self.preprocess_server = PreprocessServer()
        self.label_server = LabelServe()
        self.dataset = Dataset()
        self.data_filter = DataFilter()

    def get_preprocess_server(self):
        return self.preprocess_server

    def get_label_server(self):
        return self.label_server

    def get_dataset(self):
        return self.dataset

    def get_data_filter(self) -> DataFilter:
        return self.data_filter

    def preprocess(self, image_url: str, image_file: str, projectPath: str):
        image, embedding, json_item, project_info = self.preprocess_server.preprocess(
            image_url, image_file, projectPath
        )

        filename_wihthout_ext = os.path.splitext(image_file)[0]
        data = Data(filename_wihthout_ext, image, embedding, json_item)

        self.dataset.add_data(data)
        self.dataset.setProjectInfo(project_info)


@eel.expose
def preprocess(image_url: str, image_file: str, projectPath: str):
    """
    Preprocess the data:
    1. Save the image to the image folder
    2. Generate the image embedding
    3. Generate coral segmentation masks
    """
    server.preprocess(image_url, image_file, projectPath)


@eel.expose
def update_preprocess_config(config):
    """
    Update the preprocess configuration
    """
    preprocess_server = server.get_preprocess_server()
    preprocess_server.update_config(config)


@eel.expose
def clear_dataset():
    """
    Clear the dataset
    """
    dataset = server.get_dataset()
    dataset.clear()


@eel.expose
def receive_file(file_content: str, relative_path: str):
    """
    Store the file to the dataset for later operation
    """
    dataset = server.get_dataset()
    dataset.recieve_data(relative_path, file_content)


@eel.expose
def init_dataset():
    """
    Initialize the dataset
    """
    dataset = server.get_dataset()
    dataset.init_data()

    dataset_size = dataset.get_size()
    current_idx = dataset.get_current_data_idx()

    return_json = {}
    return_json["size"] = dataset_size
    return_json["current_data_idx"] = current_idx
    return return_json


@eel.expose
def get_dataset_size():
    """
    Get the size of the dataset
    """
    dataset = server.get_dataset()
    return dataset.get_size()


@eel.expose
def get_data(idx: int):
    """
    Get the data at the given index
    """

    start_time = time.time()
    dataset = server.get_dataset()
    a = time.time()
    print(f"a time taken: {a - start_time}")
    data = dataset.get_data(idx)
    b = time.time()
    print(f"b time taken: {b - a}")
    data_filter = server.get_data_filter()
    c = time.time()
    print(f"c time taken: {c - b}")

    image_content = data.get_image_content()
    d = time.time()
    print(f"d time taken: {d - c}")

    json_item = data.get_json_item()
    e = time.time()
    print(f"e time taken: {e - d}")

    filenname = data.get_filename()
    f = time.time()
    print(f"f time taken: {f - e}")

    project_info = dataset.get_project_info()
    g = time.time()
    print(f"g time taken: {g - f}")
    return_item = {}

    end_time = time.time()
    print(f"Time taken to prepare: {end_time - start_time}")

    if "filter_config" in project_info:
        start_time = time.time()
        config = project_info["filter_config"]
        if str(idx) in config:
            filter_config = config[str(idx)]
            dataset.upate_filter_config_in_project_info(filter_config)
            data_filter.update_filter(filter_config)
            return_item["filter_config"] = filter_config
            print(f"Filter config: {filter_config}")
        end_time = time.time()
        print(f"Time taken to update filter config: {end_time - start_time}")

    start_time = time.time()
    copied_json_item = copy.deepcopy(json_item)
    annotations = copied_json_item["annotations"]
    # Add the counts_number of the javaside
    for annotation in annotations:
        mask = coco_mask_to_rle(annotation["segmentation"])
        annotation["segmentation"]["counts_number"] = mask
    copied_json_item["annotations"] = annotations

    filtered_indices = data_filter.filter_annotations(data)

    return_item["image"] = image_content
    return_item["json_item"] = copied_json_item
    return_item["filename"] = filenname
    return_item["filtered_indices"] = filtered_indices
    end_time = time.time()
    print(f"Time taken to get data: {end_time - start_time}")

    return return_item


@eel.expose
def get_data_without_annotation(idx: int) -> Data:
    """
    Get the data at the given index without annotations
    """
    dataset = server.get_dataset()
    data = dataset.get_data(idx)

    return_item = {}
    return_item["image"] = data.get_image_content()
    return_item["filename"] = data.get_filename()
    return return_item


@eel.expose
def set_editting_image_by_idx(idx):
    """
    Set the editting image by index
    """
    dataset = server.get_dataset()
    data = dataset.get_data(idx)
    label_server = server.get_label_server()
    label_server.set_editting_image_by_idx(idx, data)


@eel.expose
def add_edit_mask_input_point(x, y, label):
    """
    Add a point to the mask editor
    """
    label_server = server.get_label_server()
    return label_server.add_edit_mask_input_point(x, y, label)


@eel.expose
def undo_edit_mask_input_point():
    """
    Undo the last point in the mask editor
    """
    label_server = server.get_label_server()
    return label_server.undo_edit_mask_input_point()


@eel.expose
def clear_edit_mask_input_points():
    """
    Clear all the points in the mask editor
    """
    label_server = server.get_label_server()
    label_server.clear_edit_mask_input_points()


@eel.expose
def confirm_edit_mask_input():
    """
    Confirm the mask editing
    """
    label_server = server.get_label_server()
    label_server.confirm_edit_mask_input()


@eel.expose
def save_data(json_item, idx, labels_list):
    """
    Save the data to the dataset
    """
    dataset = server.get_dataset()
    dataset.save_annotation(idx, json_item, labels_list)


@eel.expose
def update_filter_config(config):
    """
    Update the data filter configurationjnikml
    """
    data_filter = server.get_data_filter()
    data_filter.update_filter(config)

    dataset = server.get_dataset()
    dataset.upate_filter_config_in_project_info(config)


@eel.expose
def check_valid_folder(path):
    """
    Check if the path is valid
    """
    PreprocessServer = server.get_preprocess_server()
    success, message = PreprocessServer.check_valid_folder(path)

    return_item = {}
    return_item["success"] = success
    return_item["error_message"] = message

    return return_item


@eel.expose
def select_folder():
    root = Tk()
    root.withdraw()
    root.wm_attributes("-topmost", 1)
    folder = filedialog.askdirectory()
    return folder


@eel.expose
def load_project(project_path: str):
    print(f"Loading project: {project_path}")
    dataset = server.get_dataset()
    error_message = dataset.load_project(project_path)
    return error_message


@eel.expose
def get_data_size():
    dataset = server.get_dataset()
    return dataset.get_size()


@eel.expose
def get_current_image_idx():
    dataset = server.get_dataset()
    print(f"get_current_image_idx: {dataset}")
    return dataset.get_current_data_idx()


@eel.expose
def get_label_list():
    dataset = server.get_dataset()
    return dataset.get_label_list()


@eel.expose
def have_mask_belong_to_category(category_idx):
    dataset = server.get_dataset()
    has_mask_belong_to_category, image_idx = dataset.have_mask_belong_to_category(
        category_idx
    )

    response = {}
    response["has_mask_belong_to_category"] = has_mask_belong_to_category
    response["image_idx"] = image_idx
    return response


@eel.expose
def is_valid_project_folder(project_folder):
    dataset = server.get_dataset()
    sucess, error_message = dataset.is_valid_project_folder(project_folder)

    response = {}
    response["success"] = sucess
    response["error_message"] = error_message
    return response


@eel.expose
def update_annotation_id(new_labels):
    dataset = server.get_dataset()
    dataset.update_annotation_id(new_labels)


@eel.expose
def get_all_data():
    dataset = server.get_dataset()
    return_list = []
    for idx in range(dataset.get_size()):
        data = get_data(idx)
        return_list.append(data)
    return return_list


@eel.expose
def get_all_data_without_annotations():
    dataset = server.get_dataset()
    return_list = []
    start_time = time.time()
    for idx in range(dataset.get_size()):
        data = get_data_without_annotation(idx)
        return_list.append(data)
    end_time = time.time()
    print(f"Time taken: {end_time - start_time}")
    return return_list


@eel.expose
def export_json(output_path):
    dataset = server.get_dataset()
    dataset.export_json(output_path)


@eel.expose
def gen_iou_matrix():
    print(f"Generating all iou matrix ...")
    dataset = server.get_dataset()
    idx = 0
    for data in dataset.get_data_list():
        print(f"Generating iou matrix for index {idx} ...")
        data.update_iou_matrix()
        idx += 1


@eel.expose
def gen_iou_matrix_by_id(idx):
    dataset = server.get_dataset()
    data = dataset.get_data(idx)
    data.update_iou_matrix()


@eel.expose
def export_graph(path, label_colors):
    dataset = server.get_dataset()

    output_folder = os.path.join(path, "statistics")
    os.makedirs(output_folder, exist_ok=True)

    for data in dataset.get_data_list():
        coco_json = dataset.process_json_to_coco_json(data)
        if coco_json is None:
            continue
        statistic_graph = StatisticGraph(coco_json, label_colors)
        filename = data.get_filename()
        data_output_folder = os.path.join(output_folder, filename)
        os.makedirs(data_output_folder, exist_ok=True)

        output_path = os.path.join(data_output_folder, "coral_colony_distribution.png")
        statistic_graph.plot_coral_colony_distribution(output_path)

        output_path = os.path.join(data_output_folder, "coral_coverage.png")
        statistic_graph.plot_coral_coverage(output_path)

        output_path = os.path.join(data_output_folder, "coral_species_distribution.png")
        statistic_graph.plot_coral_species_distribution(output_path)

        output_path = os.path.join(
            data_output_folder, "coral_condition_distribution.png"
        )
        statistic_graph.plot_coral_condition_distribution(output_path)

        statistic_graph.plot_coral_all_species_condition_distribution(
            data_output_folder
        )


@eel.expose
def export_excel(path):
    dataset = server.get_dataset()

    output_folder = os.path.join(path, "excel")
    os.makedirs(output_folder, exist_ok=True)

    for data in dataset.get_data_list():
        coco_json = dataset.process_json_to_coco_json(data)
        if coco_json is None:
            continue

        statistic_graph = StatisticGraph(coco_json, None)
        output_path = os.path.join(output_folder, f"{data.get_filename()}.xlsx")
        statistic_graph.export_excel(output_path)


if __name__ == "__main__":
    print("Please wait for the tool to be ready ...")
    eel.init("web")
    print(f"About to start the server ...")
    server = Server()
    print(f"Server initialized ...")
    eel.start("main_page.html", size=(1200, 800), port=8081)
    print(f"Server started ...")
