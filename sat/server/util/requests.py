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
            "output_file": "/path/to/output"
        }

        If the image_path is provided, the image_url will be ignored.
        """
        self.request = request
        assert "inputs" in request, "Missing 'inputs' in request"
        assert "output_file" in request, "Missing 'output_dir' in request"

    def get_inputs(self) -> List[Dict]:
        return self.request["inputs"]

    def get_output_file(self) -> str:
        return self.request["output_file"]


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
