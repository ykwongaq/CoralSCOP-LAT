import io
import json
import os
import shutil
import zipfile
from typing import Dict, Iterator, List, Optional

import numpy as np
import torch
from PIL import Image

from .models.CoralSCOPModel import CoralSCOPModel
from .models.CoralTankModel import CoralTankModel
from .models.SAM3Model import SAM3Model
from .utils.logger import get_logger

_logger = get_logger(__name__)


class ProjectHandler:

    def __init__(
        self,
        temp_folder: str,
        sam_model: SAM3Model,
        coralSCOP_model: CoralSCOPModel = None,
        coralTank_model: CoralTankModel = None,
        embedding_store=None,
    ):
        self.temp_folder = temp_folder
        self.sam3_model = sam_model
        self.coralSCOP_model = coralSCOP_model
        self.coralTank_model = coralTank_model
        self.embedding_store = embedding_store

    def clean_up(self, token: str) -> None:
        zip_path = os.path.join(self.temp_folder, f"project_{token}.coral")
        if os.path.exists(zip_path):
            os.remove(zip_path)

        temp_dir = os.path.join(self.temp_folder, f"project_{token}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

    def delete_project(self, token: str) -> None:
        self.clean_up(token)

    def get_zip_path(self, token: str) -> str:
        return os.path.join(self.temp_folder, f"project_{token}.coral")

    def run_coral_scop(self, image: Image.Image, config: Dict) -> Dict:
        image_npy = np.array(image)
        annotations = self.coralSCOP_model.gen_annotations(
            image_npy,
            min_area=config.get("min_area", 0.001),
            min_confidence=config.get("min_confidence", 0.5),
            max_iou=config.get("max_overlap", 0.001),
        )
        output_json = {
            "image": {
                "image_filename": "",
                "image_width": image.width,
                "image_height": image.height,
                "id": 0,
            },
            "annotations": annotations["annotations"],
            "categories": [{"id": 0, "name": "coral", "sub-categories": []}],
        }
        return output_json

    def run_coral_tank(self, image: Image.Image, config: Dict) -> Dict:
        masks, class_list = self.coralTank_model.predict(image)

        min_area = config.get("min_area", 0.001)
        image_area = image.width * image.height
        min_area_pixels = int(min_area * image_area)

        # Filter out masks that are smaller than the minimum area
        filtered_masks = []
        filtered_class_list = []
        for mask, cls in zip(masks, class_list):
            mask_area = mask["size"][0] * mask["size"][1]
            if mask_area >= min_area_pixels:
                filtered_masks.append(mask)
                filtered_class_list.append(cls)

        masks = filtered_masks
        class_list = filtered_class_list

        # Mask are the dictionary with keys "size" and "counts" for RLE
        output_json = {
            "image": {
                "image_filename": "",
                "image_width": image.width,
                "image_height": image.height,
                "id": 0,
            },
            "annotations": [
                {
                    "id": idx,
                    "category_id": class_list[idx],
                    "segmentation": mask,
                    "area": mask["size"][0] * mask["size"][1],
                    # Compute the bounding box
                    "bbox": [
                        0,
                        0,
                        mask["size"][1],
                        mask["size"][0],
                    ],  # [x, y, width, height]
                    "image_id": 0,
                }
                for idx, mask in enumerate(masks)
            ],
            "categories": [
                {"id": 0, "name": "coral", "sub-categories": []},
                {"id": 1, "name": "base", "sub-categories": []},
            ],
        }
        return output_json

    def create_project(
        self,
        token: str,
        images: List[Image.Image],
        image_filenames: List[str],
        config: Dict,
        sample_id: Optional[str] = None,
    ) -> List[Dict]:
        """
        Non stream version of create_project
        """

        temp_dir = os.path.join(self.temp_folder, f"project_{token}")
        zip_output_path = os.path.join(self.temp_folder, f"project_{token}.coral")

        os.makedirs(temp_dir, exist_ok=True)
        image_folder = os.path.join(temp_dir, "images")
        annotations_folder = os.path.join(temp_dir, "annotations")
        os.makedirs(image_folder, exist_ok=True)
        os.makedirs(annotations_folder, exist_ok=True)

        try:
            sorted_indexes = np.argsort(image_filenames)
            images = [images[i] for i in sorted_indexes]
            filenames = [image_filenames[i] for i in sorted_indexes]
            n = len(images)

            for idx, (image, filename) in enumerate(zip(images, filenames)):
                state = self.sam3_model.gen_embeddings(image)

                if config.get("model") == "CoralSCOP":
                    output_json = self.run_coral_scop(image, config)
                elif config.get("model") == "CoralTank":
                    output_json = self.run_coral_tank(image, config)
                else:
                    output_json = {
                        "image": {
                            "image_filename": filename,
                            "image_width": image.width,
                            "image_height": image.height,
                            "id": idx,
                        },
                        "annotations": [],
                        "categories": [],
                    }

                filename_without_ext = os.path.splitext(filename)[0]

                # Save image
                image_output_path = os.path.join(image_folder, filename)
                image.save(image_output_path)

                # Save annotations
                with open(
                    os.path.join(annotations_folder, f"{filename_without_ext}.json"),
                    "w",
                ) as f:
                    json.dump(output_json, f, indent=4)

                if self.embedding_store is not None:
                    buf = io.BytesIO()
                    torch.save(state, buf)
                    embedding_session_id = sample_id if sample_id else token
                    self.embedding_store.save(
                        embedding_session_id, filename_without_ext, buf.getvalue()
                    )

            project_info = {
                "project_id": token,
                "last_idx": 0,
                "creation_time": token,
                "config": config,
            }
            if sample_id:
                project_info["sample_id"] = sample_id

            with open(os.path.join(temp_dir, "project_info.json"), "w") as f:
                json.dump(project_info, f, indent=4)

            with zipfile.ZipFile(
                zip_output_path, "w", compression=zipfile.ZIP_DEFLATED
            ) as zf:
                for folder_name in ["images", "annotations"]:
                    folder_path = os.path.join(temp_dir, folder_name)
                    for root, _, files in os.walk(folder_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            zf.write(file_path, os.path.relpath(file_path, temp_dir))
                project_info_path = os.path.join(temp_dir, "project_info.json")
                zf.write(
                    project_info_path, os.path.relpath(project_info_path, temp_dir)
                )
            shutil.rmtree(temp_dir, ignore_errors=True)

        except Exception as e:
            self.clean_up(token)
            raise e

    def stream_create_project(
        self,
        token: str,
        images: List[Image.Image],
        image_filenames: List[str],
        config: Dict,
        sample_id: Optional[str] = None,
    ) -> Iterator[Dict]:
        """
        Generator that processes images and yields progress events.

        Embeddings are stored persistently in the EmbeddingStore. For regular projects,
        embeddings use the token as the session_id. For sample images, embeddings use
        the sample_id as the session_id, allowing embeddings to be shared across users.

        The .coral ZIP contains only images, annotations, and project_info.json — no
        embeddings — keeping the download size small.

        Args:
            token: Externally-generated UUID used for temp file naming and download token.
            sample_id: Optional identifier for sample images. If provided, embeddings
                      are stored under sample_id instead of token, enabling reuse across users.

        Yields:
            {"type": "progress", "value": <0-95>, "message": <str>}
            {"type": "done", "token": <token>}

        Raises the original exception (after cleaning up temp files) on failure.
        """
        temp_dir = os.path.join(self.temp_folder, f"project_{token}")
        zip_output_path = os.path.join(self.temp_folder, f"project_{token}.coral")

        os.makedirs(temp_dir, exist_ok=True)
        image_folder = os.path.join(temp_dir, "images")
        annotations_folder = os.path.join(temp_dir, "annotations")
        os.makedirs(image_folder, exist_ok=True)
        os.makedirs(annotations_folder, exist_ok=True)

        _logger.info(f"Config for project {token}: {config}")

        try:
            sorted_indexes = np.argsort(image_filenames)
            images = [images[i] for i in sorted_indexes]
            filenames = [image_filenames[i] for i in sorted_indexes]
            n = len(images)

            for idx, (image, filename) in enumerate(zip(images, filenames)):
                yield {
                    "type": "progress",
                    "value": int(idx / n * 90),
                    "message": f"Processing {filename} ({idx + 1}/{n})",
                }

                state = self.sam3_model.gen_embeddings(image)

                if config.get("model") == "CoralSCOP":
                    output_json = self.run_coral_scop(image, config)
                elif config.get("model") == "CoralTank":
                    output_json = self.run_coral_tank(image, config)
                else:
                    output_json = {
                        "image": {
                            "image_filename": filename,
                            "image_width": image.width,
                            "image_height": image.height,
                            "id": idx,
                        },
                        "annotations": [],
                        "categories": [],
                    }

                filename_without_ext = os.path.splitext(filename)[0]

                # Save image
                image_output_path = os.path.join(image_folder, filename)
                image.save(image_output_path)

                # Save annotations
                with open(
                    os.path.join(annotations_folder, f"{filename_without_ext}.json"),
                    "w",
                ) as f:
                    json.dump(output_json, f, indent=4)

                # Save embedding to persistent store
                # For sample images, use sample_id as session_id (shared across users)
                # For regular projects, use token as session_id
                if self.embedding_store is not None:
                    buf = io.BytesIO()
                    torch.save(state, buf)
                    embedding_session_id = sample_id if sample_id else token
                    self.embedding_store.save(
                        embedding_session_id, filename_without_ext, buf.getvalue()
                    )

                yield {
                    "type": "progress",
                    "value": int((idx + 1) / n * 80),
                    "message": f"Finished processing {filename}",
                }

            yield {"type": "progress", "value": 85, "message": "Packaging project file"}

            # For sample images, sample_id is the SAM session_id (shared embeddings)
            # For regular projects, token is the SAM session_id
            project_info = {
                "project_id": token,
                "last_idx": 0,
                "creation_time": token,
                "config": config,
            }
            if sample_id:
                project_info["sample_id"] = sample_id
            with open(os.path.join(temp_dir, "project_info.json"), "w") as f:
                json.dump(project_info, f, indent=4)

            # Embeddings are stored server-side; ZIP contains only images + annotations
            with zipfile.ZipFile(
                zip_output_path, "w", compression=zipfile.ZIP_DEFLATED
            ) as zf:
                for folder_name in ["images", "annotations"]:
                    folder_path = os.path.join(temp_dir, folder_name)
                    for root, _, files in os.walk(folder_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            zf.write(file_path, os.path.relpath(file_path, temp_dir))
                project_info_path = os.path.join(temp_dir, "project_info.json")
                zf.write(
                    project_info_path, os.path.relpath(project_info_path, temp_dir)
                )
            # Remove the temp directory after zipping (but keep the zip file for download)
            shutil.rmtree(temp_dir, ignore_errors=True)

            yield {"type": "done", "token": token}

        except Exception:
            _logger.exception("Project creation failed (token=%s)", token)
            self.clean_up(token)
            raise
