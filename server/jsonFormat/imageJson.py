class ImageJson:
    """
    It is the class help to ensure that all the required data
    is set before converting to json.
    """

    def __init__(self):
        self.id = None
        self.filename = None
        self.width = None
        self.height = None

    def set_id(self, id: int):
        self.id = id

    def set_filename(self, filename: str):
        self.filename = filename

    def set_width(self, width: int):
        self.width = width

    def set_height(self, height: int):
        self.height = height

    def to_json(self):
        assert self.id is not None, "id is not set"
        assert self.filename is not None, "filename is not set"
        assert self.width is not None, "width is not set"
        assert self.height is not None, "height is not set"
        return {
            "id": self.id,
            "filename": self.filename,
            "width": self.width,
            "height": self.height,
        }
