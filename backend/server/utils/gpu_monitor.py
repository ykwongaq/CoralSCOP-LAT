import functools
import torch
from .logger import get_logger

_logger = get_logger(__name__)


def get_gpu_memory_info() -> dict:
    """Get current GPU memory stats in MB."""
    if not torch.cuda.is_available():
        return {"available": 0, "allocated": 0, "reserved": 0, "total": 0}

    torch.cuda.synchronize()
    allocated = torch.cuda.memory_allocated() / 1024 / 1024  # MB
    reserved = torch.cuda.memory_reserved() / 1024 / 1024    # MB
    total = torch.cuda.get_device_properties(0).total_memory / 1024 / 1024

    return {
        "allocated_mb": int(allocated),
        "reserved_mb": int(reserved),
        "available_mb": int(total - reserved),
        "total_mb": int(total),
        "utilization_percent": int((reserved / total) * 100),
    }


def log_gpu_memory(label: str = ""):
    """Log current GPU memory usage with optional label."""
    info = get_gpu_memory_info()
    if label:
        _logger.info(
            f"GPU Memory [{label}]: {info['allocated_mb']}MB allocated, "
            f"{info['reserved_mb']}MB reserved, {info['utilization_percent']}% utilization"
        )
    else:
        _logger.info(
            f"GPU Memory: {info['allocated_mb']}MB allocated, "
            f"{info['reserved_mb']}MB reserved, {info['utilization_percent']}% utilization"
        )
    return info


def log_model_size(model_name: str, model) -> None:
    """Log the total parameter size of a model in MB."""
    if not hasattr(model, 'parameters'):
        return

    total_params = 0
    for param in model.parameters():
        total_params += param.data.element_size() * param.data.nelement()

    size_mb = total_params / 1024 / 1024
    _logger.info(f"Model [{model_name}] size: {size_mb:.1f}MB")


def track_gpu_memory(func):
    """
    Decorator that logs GPU memory before and after function execution.
    Shows delta and helps identify memory leaks.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        before = get_gpu_memory_info()
        func_name = func.__qualname__

        _logger.info(
            f"[GPU START] {func_name} — "
            f"{before['allocated_mb']}MB allocated, {before['utilization_percent']}% util"
        )

        result = func(*args, **kwargs)

        after = get_gpu_memory_info()
        delta_allocated = after['allocated_mb'] - before['allocated_mb']
        delta_reserved = after['reserved_mb'] - before['reserved_mb']

        _logger.info(
            f"[GPU END] {func_name} — "
            f"Δ allocated: {delta_allocated:+d}MB, Δ reserved: {delta_reserved:+d}MB, "
            f"now at {after['allocated_mb']}MB allocated, {after['utilization_percent']}% util"
        )

        return result

    return wrapper
