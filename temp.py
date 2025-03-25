import tempfile
import os

print(os.path.join(
        tempfile.gettempdir(), "SAT", "temp_project.sat"
    ))