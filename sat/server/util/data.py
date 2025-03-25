import zipfile
import os


def zip_file(folder_path: str, output_file: str):
    with zipfile.ZipFile(output_file, "w") as zipf:
        for root, _, files in os.walk(folder_path):
            for file in files:
                zipf.write(
                    os.path.join(root, file),
                    os.path.relpath(os.path.join(root, file), folder_path),
                )


def unzip_file(zip_file: str, output_folder: str):
    with zipfile.ZipFile(zip_file, "r") as zipf:
        zipf.extractall(output_folder)
