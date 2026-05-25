import asyncio
import json
import os
import threading
from typing import Annotated, Any, List, Optional

import numpy as np
from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image
from server import server
from server.schemas import (
    CreateProjectConfig,
    CreateSamSessionResponse,
    EncodeMaskRequest,
    EncodeMaskResponse,
    PredictInstRequest,
    PredictInstResponse,
    QuickStartConfig,
    RunModelConfig,
    RunModelResponse,
)
from server.utils.image import read_uploaded_image
from server.utils.logger import get_logger

# Get the directory where this script is located
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(_SCRIPT_DIR, "config.json")

_logger = get_logger(__name__)

with open(config_path, "r") as f:
    config = json.load(f)

_logger.info("Loaded config from %s", config_path)

_server = server.Server(config)
app = FastAPI(title="CoralSCOP-LAT API")

# CORS must be added first (outermost middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Streaming helpers (private to this module)
# ============================================================================


def _sse_line(payload: dict) -> str:
    """Encode a dict as a single SSE data line."""
    return f"data: {json.dumps(payload)}\n\n"


async def _drain_and_cleanup(q: asyncio.Queue) -> None:
    """
    Consume remaining queue events after the SSE generator is abandoned
    (e.g. client disconnected mid-stream). Calls delete_project if the
    worker eventually finishes successfully so no temp files are left behind.
    """
    while True:
        event = await q.get()
        if event is None:
            break
        if event.get("type") == "done":
            _server.delete_project(event["token"])
            break


async def _stream_project(
    pil_images: list[Image.Image],
    filenames: list[str],
    config_data: dict,
):
    """
    Run the sync project-creation generator in a background thread and
    re-emit its events as SSE-formatted strings.

    The sync generator is CPU-bound (ML inference), so it must not run on
    the event loop thread.  An asyncio.Queue bridges the worker → async generator.
    """
    loop = asyncio.get_running_loop()
    q: asyncio.Queue = asyncio.Queue()

    def worker() -> None:
        try:
            for event in _server.stream_create_project(
                pil_images, filenames, config_data
            ):
                asyncio.run_coroutine_threadsafe(q.put(event), loop)
        except Exception as exc:
            asyncio.run_coroutine_threadsafe(
                q.put({"type": "error", "message": str(exc)}), loop
            )
        finally:
            asyncio.run_coroutine_threadsafe(q.put(None), loop)  # sentinel

    threading.Thread(target=worker, daemon=True).start()

    ownership_transferred = False
    last_event: dict = {}

    try:
        while True:
            last_event = await q.get()
            if last_event is None:
                break

            if last_event["type"] == "error":
                yield _sse_line({"type": "error", "message": last_event["message"]})
                break

            if last_event["type"] == "done":
                ownership_transferred = True
                yield _sse_line(
                    {"type": "complete", "data": {"downloadToken": last_event["token"]}}
                )
                break

            yield _sse_line(last_event)

    finally:
        if not ownership_transferred:
            loop.create_task(_drain_and_cleanup(q))


# ============================================================================
# Routes
# ============================================================================


@app.post("/api/projects")
async def create_project(
    images: Annotated[list[UploadFile], File()],
    config: Annotated[str, Form()],
    model: Annotated[str | None, Form()] = None,
):
    """
    Create a new project.

    Accepts multipart/form-data:
      - images  : one or more image files
      - config  : JSON string  { min_area, min_confidence, max_overlap }
      - model   : optional model identifier (CoralSCOP | CoralTank)

    Streams SSE lines:
      data: {"type":"progress","value":25,"message":"Processing img.jpg (1/4)"}
      data: {"type":"progress","value":95,"message":"Packaging project file"}
      data: {"type":"complete","data":{"downloadToken":"<token>"}}
      data: {"type":"error","message":"<reason>"}   (on failure)
    """
    try:
        config_obj = CreateProjectConfig.model_validate_json(config)
        config_data = config_obj.model_dump(exclude_none=True)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="config must be valid JSON")

    pil_images: list[Image.Image] = []
    filenames: list[str] = []
    for idx, upload in enumerate(images):
        try:
            image = await read_uploaded_image(upload, mode="RGB")
            pil_images.append(image)
            filenames.append(upload.filename or f"image_{idx}.jpg")
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))

    config_data["model"] = model

    return StreamingResponse(
        _stream_project(pil_images, filenames, config_data),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering if behind a proxy
        },
    )


@app.get("/api/projects/download/{token}")
async def download_project(token: str, background_tasks: BackgroundTasks):
    """
    One-time download of the .coral file produced by a completed project creation.
    The temporary file is deleted after the response is sent.
    """
    zip_path = _server.get_zip_path(token)
    if not os.path.exists(zip_path):
        raise HTTPException(
            status_code=404, detail="Project not found or already downloaded"
        )

    background_tasks.add_task(_server.delete_project, token)
    return FileResponse(
        path=zip_path,
        filename=os.path.basename(zip_path),
        media_type="application/octet-stream",
    )


@app.delete("/api/projects/delete/{token}", status_code=204)
async def cancel_project(token: str):
    """
    Discard a pending .coral file without downloading it.
    Cleans up the temporary files immediately.
    """
    zip_path = _server.get_zip_path(token)
    if not os.path.exists(zip_path):
        raise HTTPException(
            status_code=404, detail="Project not found or already downloaded"
        )

    _server.delete_project(token)


# ---------------------------------------------------------------------------
# Mask encode endpoints
# ---------------------------------------------------------------------------


@app.post("/api/masks/encode", response_model=EncodeMaskResponse)
async def encode_masks(request: EncodeMaskRequest):
    """
    Encode a flat row-major pixel array into a COCO compressed RLE mask.

    Accepts:
        {
            "inputs": [
                {
                    "size": [height, width],
                    "counts": [rle_count1, rle_count2, ...]
                }
            ]
        }

    Returns:
        {"segmentation": [{"size": [height, width], "counts": "<RLE string>"}, ...]}
    """
    # Convert Pydantic models to pure Python types for server.py
    inputs = [rle.model_dump() for rle in request.inputs]
    result = _server.encode_masks(inputs)
    return EncodeMaskResponse(segmentation=result)


# ---------------------------------------------------------------------------
# SAM interactive inference endpoints
# ---------------------------------------------------------------------------


@app.post("/api/sam/sessions", response_model=CreateSamSessionResponse)
async def create_sam_session():
    """
    Create a new SAM embedding session.

    Returns:
        {"session_id": "<uuid>"}

    The returned session_id must be passed to subsequent embedding uploads
    and to POST /api/sam/predict. DELETE /api/sam/sessions/{session_id}
    releases the in-memory caches for that session while keeping persisted
    embedding files on disk.
    """
    session_id = _server.create_embedding_session()
    return CreateSamSessionResponse(session_id=session_id)


@app.post("/api/sam/sessions/{session_id}/embeddings/{stem}", status_code=204)
async def upload_embedding(session_id: str, stem: str, file: UploadFile = File(...)):
    """
    Upload a single .pt embedding file into an existing session.

    Path parameters:
      - session_id : UUID returned by POST /api/sam/sessions
      - stem       : image filename without extension (e.g. "DSC_0001")

    Body: multipart/form-data with a single field ``file`` containing the
    raw .pt bytes produced by ``torch.save(state)``.
    """
    data = await file.read()
    _server.save_embedding(session_id, stem, data)
    return Response(status_code=204)


@app.delete("/api/sam/sessions/{session_id}", status_code=204)
async def delete_sam_session(session_id: str):
    """
    Release the CPU/GPU caches for a SAM session without deleting
    its persisted embedding files on disk. Safe to call repeatedly.
    """
    _server.delete_embedding_session(session_id)
    return Response(status_code=204)


@app.post("/api/projects/quick-start")
async def quick_start_project(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    config: Annotated[str, Form()] = "{}",
    model: Annotated[str | None, Form()] = None,
    projectId: Annotated[str | None, Form()] = None,
):
    """
    Create a project from a single image and return the .coral file directly.

    Accepts multipart/form-data:
      - image    : one image file
      - config   : JSON string  { min_area, min_confidence, max_overlap }
      - model    : optional model identifier (CoralSCOP | CoralTank)
      - projectId: optional sample image identifier (e.g., "sample" without extension)

    If projectId is provided (for sample images):
      - Embeddings are reused if they already exist under this sample ID
      - A new unique project_id is generated for this user
      - project_info.json includes both project_id and sample_id

    Returns the .coral binary as application/octet-stream.
    The frontend can pass the response blob directly to loadProject().
    """
    try:
        config_obj = QuickStartConfig.model_validate_json(config)
        config_data = config_obj.model_dump(exclude_none=True)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="config must be valid JSON")

    config_data["model"] = model

    try:
        pil_image = await read_uploaded_image(image, mode="RGB")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    filename = image.filename or "image.jpg"

    loop = asyncio.get_running_loop()
    zip_path = await loop.run_in_executor(
        None, _server.quick_start, pil_image, filename, config_data, projectId
    )

    token = os.path.basename(zip_path).replace("project_", "").replace(".coral", "")

    # Always delete temporary projects after download.
    # For sample images, embeddings are cached under sample_id, not the project token.
    background_tasks.add_task(_server.delete_project, token)

    return FileResponse(
        path=zip_path,
        filename=os.path.basename(zip_path),
        media_type="application/octet-stream",
    )


@app.post("/api/sam/predict/", response_model=PredictInstResponse)
async def predict_inst(request: PredictInstRequest):
    """
    Run SAM interactive instance segmentation.

    Accepts JSON body:
      - session_id   : UUID returned by POST /api/sam/sessions
      - stem         : image filename stem (must have been uploaded via
                       POST /api/sam/sessions/{session_id}/embeddings/{stem})
      - input_points : array of [x, y] pairs, e.g. [[100,200],[300,400]]
      - input_labels : array of ints (1=foreground, 0=background per point)
      - mask_input   : optional base64-encoded .npy bytes [1, 256, 256] float32
                       (pass best_mask_logit from the previous response)

    Returns:
        {
            "mask": {"size": [H, W], "counts": [...]},
            "best_mask_logit": "<base64 .npy bytes [1, 256, 256] float32>"
        }
    """
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        _server.predict_inst,
        request.session_id,
        request.stem,
        request.input_points,
        request.input_labels,
        request.mask_input,
    )
    # Convert result dict to Pydantic model
    return PredictInstResponse(
        mask=result["mask"],
        best_mask_logit=result["best_mask_logit"],
    )


@app.post("/api/model/run", response_model=RunModelResponse)
async def run_model(
    image: UploadFile = File(...),
    config: Annotated[str, Form()] = "{}",
):
    """
    Run model inference on a single image and return annotations directly.

    Accepts multipart/form-data:
      - image  : one image file
      - config : JSON string  { model, min_area, min_confidence, max_overlap }
                 model can be "CoralSCOP" or "CoralTank"

    Returns:
        {
            "image": {
                "image_filename": "",
                "image_width": <int>,
                "image_height": <int>,
                "id": 0
            },
            "annotations": [
                {
                    "id": <int>,
                    "category_id": <int>,
                    "segmentation": {"size": [H, W], "counts": "<RLE string>"},
                    "area": <float>,
                    "bbox": [x, y, width, height],
                    "score": <float>  // optional
                }
            ],
            "categories": [
                {"id": <int>, "name": "...", "sub_categories": []}
            ]
        }
    """
    try:
        config_obj = RunModelConfig.model_validate_json(config)
        config_data = config_obj.model_dump(exclude_none=True)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="config must be valid JSON")

    try:
        pil_image = await read_uploaded_image(image, mode="RGB")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, _server.run_model, pil_image, config_data)

    # Convert result to Pydantic model response
    return RunModelResponse(
        image=result["image"],
        annotations=result["annotations"],
        categories=result["categories"],
    )
