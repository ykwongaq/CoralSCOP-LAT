import logging
import os
import tempfile
from logging.handlers import RotatingFileHandler

# Logs are written to backend/logs/
_BACKEND_DIR = "logs"

if _BACKEND_DIR is None:
    # Force people to define the log folder
    raise RuntimeError(
        "BACKEND_DIR environment variable is not set. Please set it to the backend directory path."
    )

_LOG_DIR = os.path.join(_BACKEND_DIR, "logs")
_LOG_FILE = os.path.join(_LOG_DIR, "app.log")

_FORMATTER = logging.Formatter(
    fmt="[%(levelname)s | %(name)s |  %(asctime)s ] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

_initialized = False


def _initialize() -> None:
    global _initialized
    if _initialized:
        return

    os.makedirs(_LOG_DIR, exist_ok=True)

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)

    # File handler – rotates at 10 MB, keeps 5 backups
    file_handler = RotatingFileHandler(
        _LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(_FORMATTER)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(_FORMATTER)

    root.addHandler(file_handler)
    root.addHandler(console_handler)

    _initialized = True


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Call once per module/class, e.g. get_logger(__name__)."""
    _initialize()
    return logging.getLogger(name)
