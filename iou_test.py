import numpy as np
from typing import List, Set

def filtered_by_iou_original(masks: List[np.ndarray], iou_limit: float) -> Set[int]:
    M = np.array([mask.flatten() for mask in masks], dtype=np.bool_)
    areas = M.sum(axis=1)

    intersection = M @ M.T
    union = areas[:, None] + areas[None, :] - intersection

    # Compute IoU matrix
    iou_matrix = intersection / union

    # Apply Non-Maximum Suppression (NMS)
    indices = np.argsort(-areas)
    suppressed = np.zeros(len(areas), dtype=bool)
    keep = set()

    for i in indices:
        if suppressed[i]:
            continue
        keep.add(i)
        suppressed |= iou_matrix[i] > iou_limit
        suppressed[i] = False  # Original code that has the error

    return keep

def filtered_by_iou_corrected(masks: List[np.ndarray], iou_limit: float) -> Set[int]:
    M = np.array([mask.flatten() for mask in masks], dtype=np.int32)
    areas = M.sum(axis=1)

    intersection = M @ M.T
    union = areas[:, None] + areas[None, :] - intersection

    # Compute IoU matrix
    iou_matrix = intersection / union

    print(intersection)
    print(union)
    print(iou_matrix)

    # Apply Non-Maximum Suppression (NMS)
    indices = np.argsort(-areas)
    suppressed = np.zeros(len(areas), dtype=bool)
    keep = set()

    for i in indices:
        if suppressed[i]:
            continue
        keep.add(i)
        # Corrected suppression logic
        suppressed |= (iou_matrix[i] > iou_limit) & (np.arange(len(areas)) != i)

    return keep

def create_masks():
    # Create empty canvas
    canvas_size = (10, 10)
    masks = []

    # Mask 0: Rectangle from (2,2) to (5,5)
    mask0 = np.zeros(canvas_size, dtype=bool)
    mask0[2:6, 2:6] = True
    masks.append(mask0)

    # Mask 1: Rectangle from (3,3) to (6,6)
    mask1 = np.zeros(canvas_size, dtype=bool)
    mask1[3:7, 3:7] = True
    masks.append(mask1)

    # Mask 2: Rectangle from (7,7) to (9,9)
    mask2 = np.zeros(canvas_size, dtype=bool)
    mask2[7:10, 7:10] = True
    masks.append(mask2)

    # Mask 3: Rectangle from (4,4) to (8,8)
    mask3 = np.zeros(canvas_size, dtype=bool)
    mask3[4:9, 4:9] = True
    masks.append(mask3)

    return masks

# Create the masks
masks = create_masks()

for i, mask in enumerate(masks):
    print(f"Mask {i}:")
    print(mask)

iou_limit = 0.3

# Run the original function
keep_original = filtered_by_iou_original(masks, iou_limit)
print("Keep indices (original function):", keep_original)

# Run the corrected function
keep_corrected = filtered_by_iou_corrected(masks, iou_limit)
print("Keep indices (corrected function):", keep_corrected)