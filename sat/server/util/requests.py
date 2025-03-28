from typing import Dict, List


class ProjectCreateRequest:
    def __init__(self, request: Dict):
        """
        Request should have the following structure:
        {
            "inputs": [
                {
                    "image_url": "http://example.com/image.jpg",
                    "image_file_name": "image.jpg",
                    "image_path": "/path/to/image.jpg"
                }
            ],
            "config": {
                "minArea": 0.1,
                "minConfidence": 0.1,
                "maxIOU": 0.5
            },
            "output_file": "/path/to/output"
            "need_segmentation": true
        }

        If the image_path is provided, the image_url will be ignored.
        """
        self.request = request
        assert "inputs" in request, "Missing 'inputs' in request"
        assert "output_file" in request, "Missing 'output_file' in request"
        assert "config" in request, "Missing 'config' in request"

        self.inputs = request["inputs"]
        self.output_file = request["output_file"]

        self.need_segmentation_ = request.get("need_segmentation", True)

    def get_inputs(self) -> List[Dict]:
        return self.inputs

    def get_output_file(self) -> str:
        return self.output_file

    def get_min_area(self) -> float:
        return float(self.request["config"]["minArea"])

    def get_min_confidence(self) -> float:
        return float(self.request["config"]["minConfidence"])

    def get_max_iou(self) -> float:
        return float(self.request["config"]["maxIOU"])

    def need_segmentation(self) -> bool:
        return self.need_segmentation_


class FileDialogRequest:

    def __init__(self, request: Dict):
        self.request = request
        assert "title" in request, "Missing 'title' in request"
        assert "defaultextension" in request, "Missing 'defaultextension' in request"
        assert "fileTypes" in request, "Missing 'fileTypes' in request"

        self.title = request["title"]
        self.defaultextension = request["defaultextension"]
        self.filetypes = [
            (filetype["description"], filetype["extensions"])
            for filetype in request["fileTypes"]
        ]

        if len(self.filetypes) == 0:
            self.filetypes = [("All Files", "*.*")]

    def get_title(self) -> str:
        return self.title

    def get_defaultextension(self) -> str:
        return self.defaultextension

    def get_filetypes(self) -> List[tuple]:
        return self.filetypes


class QuickStartRequest:
    def __init__(self, request: Dict):
        self.request = request
        assert "image_url" in request, "Missing 'image_url' in request"
        assert "image_file_name" in request, "Missing 'image_file_name' in request"

        self.image_url = request["image_url"]
        self.image_file_name = request["image_file_name"]

    def get_image_url(self) -> str:
        return self.image_url

    def get_image_file_name(self) -> str:
        return self.image_file_name
