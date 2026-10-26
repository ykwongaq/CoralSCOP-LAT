import io
import threading
import uuid
from collections import OrderedDict
from typing import Any, Optional

import torch

from .utils.logger import get_logger

_logger = get_logger(__name__)


def _to_device(obj: Any, device: torch.device, copy: bool = False) -> Any:
    """Recursively move tensors in obj to *device* (always copying if *copy*)."""
    if isinstance(obj, torch.Tensor):
        return obj.to(device, copy=copy)
    if isinstance(obj, dict):
        return {k: _to_device(v, device, copy) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        moved = [_to_device(v, device, copy) for v in obj]
        return type(obj)(moved)
    return obj


class EmbeddingStore:
    """
    In-memory store for SAM embedding states, keyed by (session_id, stem).

    Nothing is written to disk. Embeddings are generated on demand and kept
    in CPU RAM in a bounded LRU cache (``max_entries`` items, ~200 MB each).
    When an entry is evicted, or the server restarts, the next prediction
    reports EMBEDDING_MISSING and the frontend asks the server to rebuild it.
    """

    def __init__(self, max_entries: int = 20):
        self._max_entries = max_entries
        self._lock = threading.Lock()
        self._cache: OrderedDict[tuple, Any] = OrderedDict()

        _logger.info(
            "EmbeddingStore ready (in-memory, max_entries=%d, ~%d GB RAM at 200 MB each)",
            max_entries,
            max_entries * 200 // 1024,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def create_session(self) -> str:
        """Return a new session UUID. Sessions need no server-side setup."""
        return str(uuid.uuid4())

    def put(self, session_id: str, stem: str, state: Any) -> None:
        """Store a state (moved to CPU) and evict the least-recently-used if full."""
        # Always copy: the model returns inference-mode tensors, and copying
        # outside inference mode turns them into normal tensors.
        state_cpu = _to_device(state, torch.device("cpu"), copy=True)
        key = (session_id, stem)
        with self._lock:
            self._cache[key] = state_cpu
            self._cache.move_to_end(key)
            _logger.info(
                "CPU cache: stored %s (now %d/%d entries)",
                key,
                len(self._cache),
                self._max_entries,
            )
            while len(self._cache) > self._max_entries:
                evicted_key, _ = self._cache.popitem(last=False)
                _logger.info(
                    "CPU cache: LRU evicted %s (now %d/%d entries)",
                    evicted_key,
                    len(self._cache),
                    self._max_entries,
                )

    def save(self, session_id: str, stem: str, data: bytes) -> None:
        """Store a state from raw ``torch.save`` bytes."""
        state = torch.load(io.BytesIO(data), map_location="cpu", weights_only=False)
        self.put(session_id, stem, state)

    def get(self, session_id: str, stem: str) -> Optional[Any]:
        """Return the CPU state for (session_id, stem), or None if not cached."""
        key = (session_id, stem)
        with self._lock:
            state = self._cache.get(key)
            if state is not None:
                self._cache.move_to_end(key)
            return state

    def delete_session(self, session_id: str) -> None:
        """Drop every embedding belonging to a session."""
        with self._lock:
            stale = [k for k in self._cache if k[0] == session_id]
            for k in stale:
                del self._cache[k]
        _logger.debug(
            "Deleted %d embeddings for session %s", len(stale), session_id
        )
