import logging
import eel

from server.server import Server
from typing import List, Dict


# Initialize logging
def setup_logging():
    # Define a custom format for the log messages
    log_format = "[%(levelname)s][%(asctime)s][%(name)s] %(message)s"
    date_format = "%Y-%m-%d|%H:%M:%S"

    # Create console handler and set level to debug
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)

    # Create formatter and add it to the handlers
    formatter = logging.Formatter(fmt=log_format, datefmt=date_format)
    console_handler.setFormatter(formatter)

    # Get the root logger and set level to debug
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)

    # Add the handlers to the root logger
    root_logger.addHandler(console_handler)


@eel.expose
def select_folder():
    return server.select_folder()


@eel.expose
def select_file():
    return server.select_file()


@eel.expose
def create_project(project_create_request: Dict):
    server.create_project(project_create_request)


@eel.expose
def load_project(project_path: str) -> List[Dict]:
    server.load_project(project_path)
    return server.get_gallery_data_list()


@eel.expose
def terminate_create_project_process():
    server.terminate_create_project_process()


@eel.expose
def get_current_data() -> Dict:
    return server.get_current_data_dict()


@eel.expose
def get_next_data() -> Dict:
    server.to_next_data()
    return server.get_current_data_dict()


@eel.expose
def get_prev_data() -> Dict:
    server.to_prev_data()
    return server.get_current_data_dict()


@eel.expose
def get_data_by_idx(idx: int) -> Dict:
    server.set_current_image_idx(idx)
    return server.get_current_data_dict()


@eel.expose
def get_data_list() -> List[Dict]:
    data_list = server.get_data_list()
    return [data.to_json() for data in data_list]


@eel.expose
def save_data(data: Dict):
    server.save_data(data)


@eel.expose
def save_dataset(output_dir: str):
    server.save_dataset(output_dir)


@eel.expose
def create_mask(prompts: List[Dict]) -> Dict:
    return server.create_mask(prompts)


@eel.expose
def get_data_ids_by_category_id(category_id: int) -> List[int]:
    return server.get_data_ids_by_category_id(category_id)


@eel.expose
def export_images(output_dir: str):
    server.export_images(output_dir)


@eel.expose
def export_annotated_images(output_dir: str, data_list: List[Dict]):
    server.export_annotated_images(output_dir, data_list)
    pass


if __name__ == "__main__":
    setup_logging()
    print("Please wait for the tool to be ready ...")
    eel.init("web")
    print(f"About to start the server ...")
    server = Server()
    print(f"Server initialized ...")
    eel.start("main_page.html", size=(1200, 800), port=0)
    print(f"Server started ...")
