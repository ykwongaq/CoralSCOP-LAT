import threading
from typing import Generic, TypeVar

T = TypeVar("T")


class ModelQueue(Generic[T]):
    """
    Serializes access to a model instance across multiple threads.

    Only `max_concurrent` threads can use the model at a time; all others
    block until a slot is free.  Works as a context manager:

        with self._sam_queue as processor:
            state = processor.set_image(image)

    Each model should get its own ModelQueue instance.  Set max_concurrent
    based on available VRAM — for most single-GPU setups, 1 is the right value.
    """

    def __init__(self, model: T, max_concurrent: int = 1, semaphore: threading.Semaphore = None):
        self._model = model
        self._semaphore = semaphore if semaphore is not None else threading.Semaphore(max_concurrent)

    def __enter__(self) -> T:
        self._semaphore.acquire()
        return self._model

    def __exit__(self, *args) -> None:
        self._semaphore.release()
