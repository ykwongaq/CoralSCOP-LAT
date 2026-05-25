import argparse
import json
import os
import shutil
import uuid

from PIL import Image
from server.embeddingStore import EmbeddingStore
from server.models.CoralSCOPModel import CoralSCOPModel
from server.models.CoralTankModel import CoralTankModel
from server.models.SAM3Model import SAM3Model
from server.projectHandler import ProjectHandler
from server.utils.path import resolve_path


def main(args):
    image_folder = args.image_folder
    output_embedding_folder = args.output_embedding_folder
    config_path = args.config_path

    os.makedirs(output_embedding_folder, exist_ok=True)

    with open(config_path, "r") as f:
        config = json.load(f)

    config["data_dir"] = output_embedding_folder
    embeddings_dir = os.path.join(output_embedding_folder, "embeddings")
    os.makedirs(embeddings_dir, exist_ok=True)

    embedding_store = EmbeddingStore(base_dir=embeddings_dir)

    sam3 = SAM3Model(resolve_path(config["sam_model_path"]))
    coralSCOP = CoralSCOPModel(
        model_path=resolve_path(config["CoralSCOP"]["coralSCOP_model_path"]),
        model_type=config["CoralSCOP"]["model_type"],
        iou_threshold=config["CoralSCOP"]["iou_threshold"],
        sta_threshold=config["CoralSCOP"]["sta_threshold"],
        max_masks_num=config["CoralSCOP"]["max_masks_num"],
        point_number=config["CoralSCOP"]["point_number"],
    )

    coral_tank_path = resolve_path(config["coral_tank_model_path"])
    coral_tank_model = CoralTankModel(coral_tank_path)

    project_handler = ProjectHandler(
        os.path.join(output_embedding_folder, "projects"),
        sam3,
        coralSCOP,
        coral_tank_model,
        embedding_store,
    )

    token = str(uuid.uuid4())

    project_config = {
        "min_area": 0.001,
        "max_confidence": 0.5,
        "max_overlap": 0.001,
    }

    if args.use_coralscop:
        project_config["model"] = "CoralSCOP"

    if args.use_coral_tank:
        project_config["model"] = "CoralTank"

    image_filenames = []
    images = []

    for image_filename in os.listdir(image_folder):
        if image_filename.lower().endswith((".jpg", ".jpeg", ".png")):
            image_filenames.append(image_filename)
            images.append(
                Image.open(os.path.join(image_folder, image_filename)).convert("RGB")
            )

    project_handler.create_project(token, images, image_filenames, project_config)
    generated_coral_path = project_handler.get_zip_path(token)

    if args.output_coral:
        output_coral_path = os.path.abspath(args.output_coral)
        os.makedirs(os.path.dirname(output_coral_path), exist_ok=True)
        shutil.move(generated_coral_path, output_coral_path)
        print(f"Project created with token: {token}")
        print(f".coral file saved to: {output_coral_path}")
    else:
        print(f"Project created with token: {token}")
        print(f".coral file saved to: {generated_coral_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create project programmatically")
    parser.add_argument(
        "--image_folder",
        type=str,
        help="Project image folder path (e.g., /path/to/images)",
        required=True,
    )
    parser.add_argument(
        "--output_embedding_folder",
        type=str,
        help="Folder where the project will be created",
        required=True,
    )
    parser.add_argument(
        "--config_path",
        type=str,
        help="Path to the project configuration file",
        default="config.json",
    )
    parser.add_argument(
        "--use_coralscop",
        help="Whether to use Coralscop for embedding generation",
        action="store_true",
    )
    parser.add_argument(
        "--use_coral_tank",
        help="Whether to use Coral Tank for embedding generation",
        action="store_true",
    )
    parser.add_argument(
        "--output_coral",
        type=str,
        help="Optional: direct file path for the output .coral file (e.g., /path/to/output.coral). If omitted, the file is kept inside --output_folder/projects/",
    )
    args = parser.parse_args()

    main(args)
