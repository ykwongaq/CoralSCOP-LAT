import argparse
import json
import os
import shutil


def main(args):
    project_ids = args.project_ids
    config_file = args.config_file

    with open(config_file, "r") as f:
        config = json.load(f)

    embeddings_folder = os.path.join(config["data_dir"], "embeddings")

    for project_id in project_ids:
        project_folder = os.path.join(embeddings_folder, project_id)
        if os.path.exists(project_folder):
            shutil.rmtree(project_folder)
            print(f"Cleared embeddings for project ID: {project_id}")
        else:
            print(f"No embeddings found for project ID: {project_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clear embeddings for projects")
    parser.add_argument(
        "--config_file",
        type=str,
        default="config.json",
        help="Path to the configuration file",
    )
    parser.add_argument(
        "--project_ids",
        type=str,
        nargs="+",
        help="List of project IDs to clear embeddings for",
    )
    args = parser.parse_args()
    main(args)
