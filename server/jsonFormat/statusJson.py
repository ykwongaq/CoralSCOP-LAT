class StatusJson:
    def __init__(self):
        self.id = None
        self.name = None

    def set_id(self, id: int):
        self.id = id

    def set_name(self, name: str):
        self.name = name

    def to_json(self):
        assert self.id is not None, "id is not set"
        assert self.name is not None, "name is not set"
        return {"id": self.id, "name": self.name}
