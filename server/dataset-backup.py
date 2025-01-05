import base64
import copy
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from typing import Dict, List, Set, Type, Set

import numpy as np
from PIL import Image

from .util.coco import decode_coco_mask
from .util.general import time_it
from .util.json import load_json, save_json


def calculate_iou_matrix(masks):
    n = len(masks)
    masks = np.array(masks)

    # Flatten masks for easier broadcasting
    masks_flat = masks.reshape(n, -1)

    intersection = np.dot(masks_flat, masks_flat.T)
    area = np.sum(masks_flat, axis=1)
    union = area[:, None] + area[None, :] - intersection

    # Avoid division by zero
    union[union == 0] = 1e-10

    iou_mat = intersection / union
    return iou_mat


class DataFilter:
    _instance = None

    default_area_limit = 0.001
    default_iou_limit = 0.1
    default_predict_iou_limit = 0.5

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DataFilter, cls).__new__(cls)
        return cls._instance

    def __init__(
        self,
        area_limit: int = default_area_limit,
        iou_limit: float = default_iou_limit,
        predict_iou_limit=default_predict_iou_limit,
    ):
        if not hasattr(self, "initialized"):
            self.logger = logging.getLogger(self.__class__.__name__)
            self.area_limit = area_limit
            self.iou_limit = iou_limit
            self.predict_iou_limit = predict_iou_limit
            self.initialized = True

    def update_filter(self, config):
        self.logger.info(f"Updating filter with config: {config}")
        self.set_area_limit(config["minArea"])
        self.set_iou_limit(config["maxIOU"])
        self.set_predict_iou_limit(config["minConfidence"])

    def set_area_limit(self, area_limit: int):
        self.area_limit = area_limit

    def set_iou_limit(self, iou_limit: float):
        self.iou_limit = iou_limit

    def set_predict_iou_limit(self, predict_iou_limit: float):
        self.predict_iou_limit = predict_iou_limit

    def export_config(self):
        return {
            "minArea": self.area_limit,
            "maxIOU": self.iou_limit,
            "minConfidence": self.predict_iou_limit,
        }

    @time_it
    def filter_by_area(self, annotations: List, area_limit: float) -> Set:
        if len(annotations) == 0:
            self.logger.info("No annotations to filter")
            return set()

        def decode_and_compute_area(annotation):
            mask = decode_coco_mask(annotation["segmentation"])
            area = np.sum(mask)
            return area

        image_size = annotations[0]["segmentation"]["size"]
        image_height = int(image_size[0])
        image_width = int(image_size[1])
        total_area = image_height * image_width
        min_area = total_area * area_limit

        filtered_index = set()
        for annotation in annotations:
            idx = annotation["id"]
            area = decode_and_compute_area(annotation)
            if area >= min_area:
                filtered_index.add(idx)

        self.logger.info(f"Filtered index: {filtered_index}")
        return filtered_index

    @time_it
    def filtered_by_predicted_iou(
        self, annotations: List, predicted_iou_limit: float
    ) -> Set:
        filtered_index = set()
        for annotation in annotations:
            if annotation["predicted_iou"] > predicted_iou_limit:
                filtered_index.add(annotation["id"])
        return filtered_index

    def filter_masks_by_iou(
        self, iou_matrix: np.ndarray, threshold: float, areas: List[int]
    ) -> List[int]:

        n = iou_matrix.shape[0]
        filtered_indices = set()

        # Create a list of all indices sorted by area in descending order
        sorted_indices = sorted(range(n), key=lambda idx: areas[idx], reverse=True)

        keep_mask = np.zeros(n, dtype=bool)

        for idx in sorted_indices:
            if not keep_mask[idx]:
                filtered_indices.add(idx)
                # Mark all masks with IoU > threshold as kept
                keep_mask[iou_matrix[idx] > threshold] = True

        return filtered_indices

    @time_it
    def filtered_by_iou(
        self, annotations: List, iou_limit: float, data: Type["Data"]
    ) -> Set:
        def decode_mask(annotation):
            return decode_coco_mask(annotation["segmentation"])

        # with ThreadPoolExecutor() as executor:
        #     masks = list(executor.map(decode_mask, annotations))

        iou_matrix = data.get_iou_matrix()
        if iou_matrix is None:
            data.update_iou_matrix()
            iou_matrix = data.get_iou_matrix()

        areas = [annotation["area"] for annotation in annotations]

        filtered_indices = self.filter_masks_by_iou(iou_matrix, iou_limit, areas)

        keep = set()
        for filtered_index in filtered_indices:
            keep.add(annotations[filtered_index]["id"])
        # M = np.array([mask.flatten() for mask in masks], dtype=np.int32)
        # areas = M.sum(axis=1)

        # intersection = M @ M.T
        # union = areas[:, None] + areas[None, :] - intersection

        # # Compute IoU matrix
        # iou_matrix = intersection / union

        # # Apply Non-Maximum Suppression (NMS)
        # indices = np.argsort(-areas)
        # suppressed = np.zeros(len(areas), dtype=bool)
        # keep = set()

        # for i in indices:
        #     if suppressed[i]:
        #         continue
        #     keep.add(i)
        #     # Suppress indices with IoU > limit, excluding index i
        #     suppressed |= (iou_matrix[i] > iou_limit) & (np.arange(len(areas)) != i)

        return keep

    @time_it
    def filter_annotations(self, data: Type["Data"]) -> List[Dict]:
        annotations = data.get_json_item()["annotations"]
        filtered_indices_by_area = self.filter_by_area(annotations, self.area_limit)
        filtered_indices_by_iou = self.filtered_by_predicted_iou(
            annotations, self.predict_iou_limit
        )
        filtered_indices_by_predicted_iou = self.filtered_by_iou(
            annotations, self.iou_limit, data
        )
        filtered_indices = (
            filtered_indices_by_area
            & filtered_indices_by_iou
            & filtered_indices_by_predicted_iou
        )

        self.logger.info(
            f"all indices: {set([annotation['id'] for annotation in annotations])}"
        )
        self.logger.info(f"filtered by area: {filtered_indices_by_area}")
        self.logger.info(f"filtered by iou: {filtered_indices_by_iou}")
        self.logger.info(
            f"filtered by predicted iou: {filtered_indices_by_predicted_iou}"
        )

        filtered_indices = list(filtered_indices)
        filtered_indices = [int(idx) for idx in filtered_indices]
        return filtered_indices


class Data:
    def __init__(
        self, filename: str, image: np.ndarray, embedding: np.ndarray, json_item: Dict
    ):
        self.image = image
        self.embedding = embedding
        self.json_item = json_item
        self.filename = filename

        self.iou_matrix = np.array(json_item["iou_matrix"], dtype=np.float32)

    @time_it
    def update_iou_matrix(self):
        masks = []
        for annotation in self.json_item["annotations"]:
            mask = decode_coco_mask(annotation["segmentation"])
            masks.append(mask)
        self.iou_matrix = calculate_iou_matrix(masks)

    def get_iou_matrix(self):
        return self.iou_matrix

    def get_image(self):
        return self.image

    def get_embedding(self):
        return self.embedding

    def get_json_item(self) -> Dict:
        return self.json_item

    def get_filename(self):
        return self.filename

    def update_json_item(self, json_item: Dict):
        original_mask_ids = self.extractMaskIds(self.json_item)
        self.json_item = json_item
        new_mask_ids = self.extractMaskIds(self.json_item)

        # The masks have changed, update the iou matrix
        print(f"Original mask ids: {original_mask_ids}")
        print(f"New mask ids: {new_mask_ids}")
        if original_mask_ids != new_mask_ids:
            print("Updating iou matrix")
            self.update_iou_matrix()

        self.json_item["iou_matrix"] = self.iou_matrix.tolist()

    def extractMaskIds(self, json_item: Dict) -> Set:
        mask_ids = set()
        for annotation in json_item["annotations"]:
            mask_ids.add(annotation["id"])
        return mask_ids

    def have_mask_belong_to_category(self, category_id):
        for annotation in self.json_item["annotations"]:
            if "category_id" not in annotation:
                continue
            if annotation["category_id"] == category_id:
                return True
        return False

    @time_it
    def get_image_content(self):
        # Ensure the imaeg is uint8
        if self.image.dtype != np.uint8:
            image_array = (255 * (self.image / np.max(self.image))).astype(np.uint8)
        else:
            image_array = self.image

        buffered = BytesIO()

        image_content = Image.fromarray(image_array)
        image_content.save(buffered, format="PNG")

        image_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        data_url = f"data:image/png;base64,{image_str}"
        return data_url

    def find_key_by_value(self, dict: Dict, value):
        for k, v in dict.items():
            if v == value:
                return k
        return None

    def update_annotation_id(self, new_labels: Dict):
        for annotation in self.json_item["annotations"]:
            if "category_name" in annotation:
                category_name = annotation["category_name"]
                new_category_id = self.find_key_by_value(new_labels, category_name)
                if new_category_id is not None:
                    annotation["category_id"] = new_category_id


class Dataset:
    def __init__(self, output_dir: str = "."):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info(f"Initializing {self.__class__.__name__} ...")

        self.recieved_images = {}
        self.recieved_embeddings = {}
        self.recieved_jsons = {}
        self.project_info = None
        self.project_info_content = None

        self.data_list = []

        self.output_dir = output_dir
        self.data_folder = "."
        self.image_folder = os.path.join(self.data_folder, "images")
        self.embedding_folder = os.path.join(self.data_folder, "embeddings")
        self.annotation_folder = os.path.join(self.data_folder, "annotations")

        self.current_data_idx = 0

    def have_mask_belong_to_category(self, category_id):
        for idx, data in enumerate(self.data_list):
            if idx == self.current_data_idx:
                continue
            if data.have_mask_belong_to_category(category_id):
                print(f"Found category_id: {category_id} in data index: {idx}")
                return True, idx
        return False, None

    def clear(self):
        self.logger.info("Clearing dataset ...")
        self.recieved_images = {}
        self.recieved_embeddings = {}
        self.recieved_jsons = {}
        self.project_info = None
        self.project_info_content = None

        self.data_list = []

    def add_data(self, data):
        self.data_list.append(data)

    def is_valid_project_folder(self, project_path):
        data_folder = project_path
        image_folder = os.path.join(data_folder, "images")
        embedding_folder = os.path.join(data_folder, "embeddings")
        annotation_folder = os.path.join(data_folder, "annotations")
        project_json_file = os.path.join(data_folder, "project.json")

        if not os.path.isdir(data_folder):
            error_message = f"Data folder not found: {data_folder}"
            return False, error_message

        if not os.path.isdir(image_folder):
            error_message = f"Image folder not found: {image_folder}"
            return False, error_message

        if not os.path.isdir(embedding_folder):
            error_message = f"Embedding folder not found: {embedding_folder}"
            return False, error_message

        if not os.path.isdir(annotation_folder):
            error_message = f"Annotation folder not found: {annotation_folder}"
            return False, error_message

        if not os.path.isfile(project_json_file):
            error_message = f"Project json file not found: {project_json_file}"
            return False

        # Check that all the corresponding files exist
        image_files = os.listdir(image_folder)

        if len(image_files) == 0:
            error_message = f"No image files found in {image_folder}"
            return False, error_message

        image_files.sort()

        filenames = [os.path.splitext(filename)[0] for filename in image_files]

        for filename in filenames:
            annotation_file = os.path.join(annotation_folder, f"{filename}.json")
            if not os.path.isfile(annotation_file):
                error_message = f"Annotation file not found: {annotation_file}"
                return False, error_message

            embedding_file = os.path.join(embedding_folder, f"{filename}.npy")
            if not os.path.isfile(embedding_file):
                error_message = f"Embedding file not found: {embedding_file}"
                return False, error_message

        return True, None

    def load_project(self, project_path):
        self.logger.info(f"Loading project from {project_path} ...")
        self.clear()

        data_folder = project_path
        image_folder = os.path.join(data_folder, "images")
        embedding_folder = os.path.join(data_folder, "embeddings")
        annotation_folder = os.path.join(data_folder, "annotations")
        project_json_file = os.path.join(data_folder, "project.json")

        self.project_info = load_json(project_json_file)
        self.current_data_idx = 0
        if "last_image_idx" in self.project_info:
            self.current_data_idx = self.project_info["last_image_idx"]

        image_files = os.listdir(image_folder)
        image_files.sort()

        filenames = [os.path.splitext(filename)[0] for filename in image_files]
        filenames.sort()

        annotation_files = []
        for filename in filenames:
            annotation_file = os.path.join(annotation_folder, f"{filename}.json")
            if not os.path.isfile(annotation_file):
                error_message = f"Annotation file not found: {annotation_file}"
                return error_message
            annotation_files.append(os.path.basename(annotation_file))

        embedding_files = []
        for filename in filenames:
            embedding_file = os.path.join(embedding_folder, f"{filename}.npy")
            if not os.path.isfile(embedding_file):
                error_message = f"Embedding file not found: {embedding_file}"
                return error_message
            embedding_files.append(os.path.basename(embedding_file))

        # Verify that the corresponding files are at the same order
        if len(filenames) != len(annotation_files) or len(filenames) != len(
            embedding_files
        ):
            self.logger.error(f"Number of files: {len(filenames)}")
            self.logger.error(f"Number of annotation files: {len(annotation_files)}")
            self.logger.error(f"Number of embedding files: {len(embedding_files)}")
            error_message = "Number of files do not match"
            return error_message

        # Set the project path
        self.project_info["project_path"] = project_path

        for imaeg_filename, embedding_filename, annotation_filename in zip(
            image_files, embedding_files, annotation_files
        ):
            # Verify that the filenames are the same
            image_filename_without_extension = os.path.splitext(imaeg_filename)[0]
            embedding_filename_without_extension = os.path.splitext(embedding_filename)[
                0
            ]
            annotation_filename_without_extension = os.path.splitext(
                annotation_filename
            )[0]

            if (
                image_filename_without_extension != embedding_filename_without_extension
                or image_filename_without_extension
                != annotation_filename_without_extension
            ):
                self.logger.error(f"Image filename: {image_filename_without_extension}")
                self.logger.error(
                    f"Embedding filename: {embedding_filename_without_extension}"
                )
                self.logger.error(
                    f"Annotation filename: {annotation_filename_without_extension}"
                )
                self.logger.error("Filenames do not match")
                error_message = "Filenames do not match"
                return error_message

            image_path = os.path.join(image_folder, imaeg_filename)
            embedding_path = os.path.join(embedding_folder, embedding_filename)
            annotation_path = os.path.join(annotation_folder, annotation_filename)

            image = Image.open(image_path)
            image = np.array(image)
            embedding = np.load(embedding_path)
            annotation = load_json(annotation_path)

            data = Data(image_filename_without_extension, image, embedding, annotation)
            self.data_list.append(data)

        return None

    def get_label_list(self):
        if self.project_info is None:
            return []
        if "labels" not in self.project_info:
            return []
        return self.project_info["labels"]

    def setProjectInfo(self, project_info):
        self.project_info = project_info

    def get_current_data_idx(self) -> int:
        return self.current_data_idx

    def get_data(self, idx: int) -> Data:
        if idx < 0 or idx >= len(self.data_list):
            self.logger.error(
                f"Invalid index: {idx} out of range [0, {len(self.data_list)})"
            )
            return None
        self.logger.info(f"Getting data for index {idx} ...")
        self.current_data_idx = idx
        return self.data_list[idx]

    def get_data_list(self) -> List[Type["Data"]]:
        return self.data_list

    def is_in_embedding_folder(self, file_path):
        normalized_path = os.path.normpath(file_path)
        return self.embedding_folder in normalized_path

    def is_in_image_folder(self, file_path):
        normalized_path = os.path.normpath(file_path)
        return self.image_folder in normalized_path

    def is_in_annotation_folder(self, file_path):
        normalized_path = os.path.normpath(file_path)
        return self.annotation_folder in normalized_path

    def is_project_file(self, file_path):
        filename = os.path.basename(file_path)
        return filename == "project.json"

    def get_size(self):
        return len(self.data_list)

    @time_it
    def recieve_data(self, file_path, file_content):
        self.logger.info(f"Received file: {file_path}")
        filename = os.path.basename(file_path)
        filename = os.path.splitext(filename)[0]
        if self.is_in_image_folder(file_path):
            self.recieved_images[filename] = file_content
        elif self.is_in_embedding_folder(file_path):
            self.recieved_embeddings[filename] = file_content
        elif self.is_in_annotation_folder(file_path):
            self.recieved_jsons[filename] = file_content
        elif self.is_project_file(file_path):
            self.project_info_content = file_content
        else:
            self.logger.error(f"Unknown file type: {file_path}")

    def get_project_info(self):
        return self.project_info

    def update_project_info(self, new_info):
        self.project_info.update(new_info)
        self.logger.info(f"Updated project info: {self.project_info}")

    def process_json_to_coco_json(self, data: Data) -> Dict:
        category_dict = {}

        data_filter = DataFilter()
        json_item = data.get_json_item()
        filtered_index = data_filter.filter_annotations(data)
        for annotation in json_item["annotations"]:
            if "category_id" not in annotation:
                continue

            if annotation["id"] not in filtered_index:
                continue

            category_id = annotation["category_id"]
            category_name = annotation["category_name"]
            if category_id is not None and category_name is not None:
                category_dict[category_id] = category_name

        if category_dict == {}:
            return None

        output_annotations = []
        for annotation in json_item["annotations"]:
            category_id = annotation["category_id"]

            if annotation["id"] not in filtered_index:
                continue

            if category_id is not None:
                annotation_copy = copy.deepcopy(annotation)
                del annotation_copy["category_name"]
                output_annotations.append(annotation_copy)

        json_copy = {}
        json_copy["images"] = [json_item["image"]]
        json_copy["annotations"] = output_annotations
        json_copy["categories"] = []
        for category_id, category_name in category_dict.items():
            supercategory = category_name
            if category_name.startswith("Bleached "):
                supercategory = category_name.replace("Bleached ", "")
            json_copy["categories"].append(
                {
                    "id": category_id,
                    "name": category_name,
                    "supercategory": supercategory,
                }
            )

        return json_copy

    def upate_filter_config_in_project_info(self, config):
        if "filter_config" not in self.project_info:
            self.project_info["filter_config"] = {}
        self.project_info["filter_config"][str(self.current_data_idx)] = config

    def save_annotation(self, idx, annotation, labels_list: List):
        self.logger.info(f"Saving annotation for index {idx} ...")
        data = self.get_data(idx)

        if data is None:
            self.logger.error(f"Data not found for index {idx}")
            return

        data.update_json_item(annotation)

        # Overwrite the annotation file
        project_path = self.project_info["project_path"]
        output_annotation_folder = os.path.join(project_path, self.annotation_folder)
        filename = data.get_filename()
        output_path = os.path.join(output_annotation_folder, f"{filename}.json")
        save_json(data.get_json_item(), output_path)

        # Save project info
        self.logger.info(f"Saving labels: {labels_list}")
        self.project_info["last_image_idx"] = idx
        if "filter_config" not in self.project_info:
            self.project_info["filter_config"] = {}
        self.project_info["filter_config"][str(idx)] = DataFilter().export_config()
        self.project_info["labels"] = labels_list
        data_folder = os.path.join(project_path, ".")
        project_path = os.path.join(data_folder, "project.json")
        save_json(self.project_info, project_path)

    def update_annotation_id(self, new_labels):
        self.logger.info("Update annotation id")
        for data in self.data_list:
            data.update_annotation_id(new_labels)

    def export_json(self, output_path):
        os.makedirs(output_path, exist_ok=True)

        json_folder = os.path.join(output_path, "jsons")
        os.makedirs(json_folder, exist_ok=True)

        self.logger.info(f"Exporting jsons to {json_folder} ...")

        coco_json_list = []
        for data in self.get_data_list():
            coco_json = self.process_json_to_coco_json(data)

            if coco_json is None:
                continue

            output_path = os.path.join(json_folder, f"{data.get_filename()}.json")
            save_json(coco_json, output_path)
            coco_json_list.append(coco_json)

        # Combine all the jsons into one
        combined_json = {"images": [], "annotations": [], "categories": []}
        for image_idx, coco_json in enumerate(coco_json_list):
            image = coco_json["images"][0]
            image["image_id"] = image_idx
            combined_json["images"].append(image)

            for annotation in coco_json["annotations"]:
                annotation["image_id"] = image_idx
                combined_json["annotations"].append(annotation)

            for category in coco_json["categories"]:
                if category not in combined_json["categories"]:
                    combined_json["categories"].append(category)

        combined_json_path = os.path.join(json_folder, "project.json")
        save_json(combined_json, combined_json_path)
