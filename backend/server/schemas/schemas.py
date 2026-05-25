"""
Pydantic models for API request/response schemas.
"""

from typing import Any, List, Optional

from pydantic import BaseModel

# ============================================================================
# Base Models (Pure Python Types)
# ============================================================================


class CompressedRLE(BaseModel):
    """Compressed RLE mask format used in COCO dataset."""

    size: List[int]  # [height, width]
    counts: str


class RLE(BaseModel):
    """RLE mask format with uncompressed counts."""

    size: List[int]  # [height, width]
    counts: List[int]  # RLE counts as list of integers


# ============================================================================
# /api/projects - Create Project
# ============================================================================


class CreateProjectConfig(BaseModel):
    """Configuration for project creation."""

    min_area: Optional[float] = None
    min_confidence: Optional[float] = None
    max_overlap: Optional[float] = None


class CreateProjectResponse(BaseModel):
    """Response for successful project creation."""

    downloadToken: str


class ProgressEvent(BaseModel):
    """Progress event during project creation."""

    type: str = "progress"
    value: int
    message: str


class CompleteEvent(BaseModel):
    """Complete event when project creation is done."""

    type: str = "complete"
    data: CreateProjectResponse


class ErrorEvent(BaseModel):
    """Error event during project creation."""

    type: str = "error"
    message: str


# ============================================================================
# /api/projects/download/{token} - Download Project
# ============================================================================

# No request/response models needed - uses path parameter and FileResponse


# ============================================================================
# /api/projects/delete/{token} - Delete Project
# ============================================================================

# No request/response models needed - uses path parameter and returns 204


# ============================================================================
# /api/masks/encode - Encode Masks
# ============================================================================


class RLEInput(BaseModel):
    """Input RLE mask data."""

    size: List[int]  # [height, width]
    counts: List[int]  # RLE counts


class EncodeMaskRequest(BaseModel):
    """Request to encode masks into compressed RLE format."""

    inputs: List[RLEInput]


class EncodeMaskResponse(BaseModel):
    """Response containing compressed RLE masks."""

    segmentation: List[CompressedRLE]


# ============================================================================
# /api/sam/sessions - SAM Session Management
# ============================================================================


class CreateSamSessionResponse(BaseModel):
    """Response for creating a new SAM embedding session."""

    session_id: str


# Upload embedding: /api/sam/sessions/{session_id}/embeddings/{stem}
# - Uses path parameters and UploadFile, no request body model needed
# - Returns 204 No Content

# Delete session: /api/sam/sessions/{session_id}
# - Uses path parameter, no request/response models needed
# - Returns 204 No Content


# ============================================================================
# /api/projects/quick-start - Quick Start Project
# ============================================================================


class QuickStartConfig(BaseModel):
    """Configuration for quick start project creation."""

    min_area: Optional[float] = None
    min_confidence: Optional[float] = None
    max_overlap: Optional[float] = None


# Returns FileResponse directly, no response model needed


# ============================================================================
# /api/sam/predict - SAM Interactive Prediction
# ============================================================================


class PredictInstRequest(BaseModel):
    """Request for SAM interactive instance segmentation."""

    session_id: str  # UUID returned by POST /api/sam/sessions
    stem: str  # image filename stem identifying which .pt to load
    input_points: List[List[float]]  # [[x1, y1], ...]
    input_labels: List[int]  # 1=foreground, 0=background per point
    mask_input: Optional[str] = None  # base64-encoded .npy bytes [1, 256, 256] float32


class PredictInstResponse(BaseModel):
    """Response for SAM interactive instance segmentation."""

    mask: RLE
    best_mask_logit: str  # base64-encoded .npy bytes, shape [1, 256, 256] float32


# ============================================================================
# /api/model/run - Run Model Inference
# ============================================================================


class RunModelConfig(BaseModel):
    """Configuration for model inference."""

    model: Optional[str] = None  # "CoralSCOP" | "CoralTank"
    min_area: Optional[float] = None
    min_confidence: Optional[float] = None
    max_overlap: Optional[float] = None


class Annotation(BaseModel):
    """Annotation result from model inference."""

    id: int
    category_id: int
    segmentation: RLE
    area: float
    bbox: List[float]  # [x, y, width, height]
    score: Optional[float] = None


class Category(BaseModel):
    """Category definition for annotations."""

    id: int
    name: str
    sub_categories: List[str] = []  # snake_case alias for "sub-categories"


class ImageInfo(BaseModel):
    """Image metadata in the response."""

    image_filename: str
    image_width: int
    image_height: int
    id: int


class RunModelResponse(BaseModel):
    """Response for model inference."""

    image: ImageInfo
    annotations: List[Annotation]
    categories: List[Category]
