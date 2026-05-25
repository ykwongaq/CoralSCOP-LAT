import os

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)


def resolve_path(path: str) -> str:
    """
    Check whether it is a absolute path or relative path.

    If relative path, then resolve it relative to the backend directory (not the current working directory).
    """
    if os.path.isabs(path):
        return path
    else:
        return os.path.join(_BACKEND_DIR, path)
