from typing import Dict


class Prompt:
    def __init__(self, prompt_info: Dict):
        self.x = prompt_info["imageX"]
        self.y = prompt_info["imageY"]
        self.label = prompt_info["label"]

    def get_x(self):
        return self.x

    def get_y(self):
        return self.y

    def get_label(self):
        return self.label
