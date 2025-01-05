from pycocotools import mask as coco_mask
import numpy as np
from typing import Dict, List

def coco_mask_to_rle(segmentation: Dict) -> List[int]:
    arr = coco_mask.decode(segmentation)
    
    # Flatten the 2D array to a 1D array
    flat = arr.flatten()
    
    # Find the indices where the value changes
    diffs = np.diff(flat)
    change_indices = np.where(diffs != 0)[0] + 1
    
    # Include the start and end indices
    indices = np.concatenate(([0], change_indices, [len(flat)]))
    
    # Compute the run lengths
    run_lengths = np.diff(indices)
    
    # Ensure the encoding starts with zero
    if flat[0] == 0:
        return run_lengths.tolist()
    else:
        # Insert a zero at the beginning to start with zero
        return np.insert(run_lengths, 0, 0).tolist()
    
def encode_to_coco_mask(mask:np.ndarray) -> Dict:
    mask = mask.astype(np.uint8)
    mask = np.asfortranarray(mask)
    rle = coco_mask.encode(mask)

    # Make sure that the counts are in a string format
    rle["counts"] = rle["counts"].decode("utf-8")
    return rle

def decode_coco_mask(segmentation: Dict) -> np.ndarray:
    mask = coco_mask.decode(segmentation)
    return mask