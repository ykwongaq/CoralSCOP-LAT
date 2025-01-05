import argparse
import os
from PIL import Image
from tqdm import tqdm


def is_image(image_path: str) -> bool:
    try:
        Image.open(image_path)
        return True
    except:
        return False


def resize_image(image: Image, reduce_ratio: float) -> Image:
    height = image.height
    width = image.width

    new_height = int(height * reduce_ratio)
    new_width = int(width * reduce_ratio)

    return image.resize((new_width, new_height))


def main(args):
    reduce_ratio = args.reduce_ratio
    assert (
        0 < reduce_ratio < 1
    ), f"Reduce ratio must be between 0 and 1, but got {reduce_ratio}"

    input_path = args.image_file

    # Collect image files
    is_file = True
    image_files = []  # List of image files to be resized
    if os.path.isdir(input_path):
        image_files = [
            os.path.join(input_path, f)
            for f in os.listdir(input_path)
            if is_image(os.path.join(input_path, f))
        ]
        is_file = False
    else:
        image_files = [input_path]

    # Prepare output directory
    output_path = args.output_dir
    os.makedirs(output_path, exist_ok=True)
    if output_path is None:
        if is_file:
            output_dir = os.path.dirname(input_path)
            filename, ext = os.path.splitext(os.path.basename(input_path))
            output_path = os.path.join(output_dir, filename + "_reduced" + ext)
        else:
            output_path = input_path + "_reduced"
            os.makedirs(output_path, exist_ok=True)
    print(f"Reduced image are saved into {output_path}")

    # Resize images
    for image_file in tqdm(image_files, desc="Resizing images"):
        image = Image.open(image_file)
        image.load()
        reduced_image = resize_image(image, args.reduce_ratio)
        output_file = os.path.join(output_path, os.path.basename(image_file))
        reduced_image.save(output_file)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reduce image size")
    parser.add_argument(
        "--image_file",
        type=str,
        required=True,
        help="Path to the image file or directory",
    )
    parser.add_argument(
        "--output_dir", type=str, default=None, help="Path to the output directory"
    )
    parser.add_argument(
        "--reduce_ratio",
        type=float,
        default=0.5,
        help="Ratio to reduce the image size",
    )

    args = parser.parse_args()
    main(args)
