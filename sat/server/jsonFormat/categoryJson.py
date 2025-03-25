class CategoryJson:
    def __init__(self):
        self.id = None
        self.name = None
        self.supercategory = None

    def set_id(self, id: int):
        self.id = id

    def set_name(self, name: str):
        self.name = name

    def set_supercategory(self, supercategory: str):
        self.supercategory = supercategory

    def to_json(self):
        assert self.id is not None, "id is not set"
        assert self.name is not None, "name is not set"
        assert self.supercategory is not None, "supercategory is not set"
        return {
            "id": self.id,
            "name": self.name,
            "supercategory": self.supercategory,
        }
