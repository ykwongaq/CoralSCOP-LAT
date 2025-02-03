class CategoryJson:
    def __init__(self):
        self.id = None
        self.name = None
        self.super_category = None
        self.super_category_id = None
        self.is_coral = None
        self.status = None

    def set_id(self, id: int):
        self.id = id

    def set_name(self, name: str):
        self.name = name

    def set_super_category(self, super_category: str):
        self.super_category = super_category

    def set_super_category_id(self, super_category_id: int):
        self.super_category_id = super_category_id

    def set_is_coral(self, is_coral: bool):
        self.is_coral = is_coral

    def set_status(self, status: int):
        self.status = status

    def to_json(self):
        assert self.id is not None, "id is not set"
        assert self.name is not None, "name is not set"
        assert self.super_category is not None, "super_category is not set"
        assert self.super_category_id is not None, "super_category_id is not set"
        assert self.is_coral is not None, "is_coral is not set"
        assert self.status is not None, "status is not set"
        return {
            "id": self.id,
            "name": self.name,
            "supercategory": self.super_category,
            "supercategory_id": self.super_category_id,
            "is_coral": self.is_coral,
            "status": self.status,
        }
