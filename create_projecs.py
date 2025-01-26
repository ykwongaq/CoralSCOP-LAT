import argparse
import os

from PIL import Image
from server.project import ProjectCreateRequest, ProjectCreator
from server.embedding import EmbeddingGenerator
from server.segmentation import CoralSegmentation
from typing import Dict, List, Generator


def is_image(file_path: str) -> bool:
    try:
        Image.open(file_path)
        return True
    except:
        return False


def batch_iterator(input_list: List, batch_size: int) -> Generator:
    for i in range(0, len(input_list), batch_size):
        yield input_list[i : i + batch_size]


def main(args):
    batch_size = args.batch_size
    assert batch_size > 0, "Batch size should be greater than 0"

    image_files = []
    if os.path.isdir(args.images):
        for image_name in os.listdir(args.images):
            image_files.append(os.path.join(args.images, image_name))
    else:
        image_files.append(args.images)

    # Verify if the image files are valid
    for image_file in image_files:
        if not is_image(image_file):
            raise ValueError(f"{image_file} is not a valid image file")

    output_dir = args.output
    os.makedirs(output_dir, exist_ok=True)

    min_area = args.min_area
    min_confidence = args.min_confidence
    max_iou = args.max_iou

    embedding_model_path = args.embedding_model

    segmentation_model_path = args.segmentation_model
    segmentation_model_type = args.segmentation_model_type

    print(f"Creating projects for {len(image_files)} images")
    print(f"Output directory: {output_dir}")
    print(f"Batch size: {batch_size}")
    print(f"Minimum area: {min_area}")
    print(f"Minimum confidence: {min_confidence}")
    print(f"Maximum IOU: {max_iou}")
    print(f"Embedding model: {embedding_model_path}")
    print(f"Segmentation model: {segmentation_model_path}")
    print(f"Segmentation model type: {segmentation_model_type}")

    project_requests = []
    for image_batch in batch_iterator(image_files, batch_size):
        request = {}

        inputs = []
        for image_file in image_batch:
            input = {
                "image_path": image_file,
                "image_file_name": os.path.basename(image_file),
            }
            inputs.append(input)

        config = {
            "minArea": min_area,
            "minConfidence": min_confidence,
            "maxIOU": max_iou,
        }

        request["inputs"] = inputs
        request["config"] = config
        request["output_dir"] = output_dir

        project_request = ProjectCreateRequest(request)
        project_requests.append(project_request)

    # Create embedding model
    embedding_generator = EmbeddingGenerator(embedding_model_path)

    # Create segmentation model
    segmentation_model = CoralSegmentation(
        model_path=segmentation_model_path, model_type=segmentation_model_type
    )

    project_creator = ProjectCreator(embedding_generator, segmentation_model)

    for idx, request in enumerate(project_requests):
        print(f"Creating project {idx + 1} ...")
        project_creator.create_(request, frontend_enabled=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Project Projects")
    parser.add_argument(
        "--images", type=str, required=True, help="Path to images or the image folder"
    )
    parser.add_argument(
        "--output", type=str, required=True, help="Path to output folder"
    )
    parser.add_argument(
        "--batch_size", type=int, default=100, help="Batch size for processing images"
    )
    parser.add_argument(
        "--min_area",
        type=float,
        default=0.001,
        help="Minimum area for a mask. This is the fraction of the image area",
    )
    parser.add_argument(
        "--min_confidence",
        type=float,
        default=0.5,
        help="Minimum confidence score for a mask",
    )
    parser.add_argument(
        "--max_iou",
        type=float,
        default=0.01,
        help="Maximum IOU for mask overlap",
    )
    parser.add_argument(
        "--embedding_model",
        type=str,
        default="models/vit_h_encoder_quantized.onnx",
        help="Path to the embedding model",
    )
    parser.add_argument(
        "--segmentation_model",
        type=str,
        default="models/vit_b_coralscop.pth",
        help="Path to the segmentation model",
    )
    parser.add_argument(
        "--segmentation_model_type",
        type=str,
        default="vit_b",
        help="Type of the segmentation model",
    )
    args = parser.parse_args()
    main(args)
