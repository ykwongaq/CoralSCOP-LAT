import json
import numpy as np

from pycocotools import mask as coco_mask 
from typing import Dict, List, Tuple

def save_json(data:Dict, file:str):
    with open(file, "w") as f:
        json.dump(data, f, indent=4)

def load_json(file:str) -> Dict:
    with open(file) as f:
        data = json.load(f)
    return data

def gen_image_json(image:np.ndarray, filename:str = None) -> Dict:
    height, width = image.shape[:2]
    image_json = {}
    image_json["width"] = width
    image_json["height"] = height
    image_json["filename"] = filename
    image_json["image_id"] = -1
    return image_json
    
def gen_mask_json(mask:np.ndarray) -> Dict:
    rle = coco_mask.encode(np.asfortranarray(mask.astype(np.uint8)))
    bbox = coco_mask.toBbox(rle)
    bbox = bbox.tolist()
    bbox = [int(coord) for coord in bbox]
    area = int(coco_mask.area(rle))
    rle["counts"] = rle["counts"].decode("utf-8")

    mask_json = {}
    mask_json["segmentation"] = rle
    mask_json["bbox"] = bbox
    mask_json["area"] = area
    mask_json["category_id"] = None
    mask_json["category_name"] = None
    mask_json["id"] = -1
    mask_json["image_id"] = -1
    mask_json["iscrowd"] = 0
    mask_json["predicted_iou"] = 1.0

    return mask_json    

def gen_annotations(image:np.ndarray, masks:List[np.ndarray], image_file:str = None) -> Dict:
    image_id = 0
    
    image_json = gen_image_json(image)
    image_json["image_id"] = image_id
    image_json["filename"] = image_file

    mask_jsons = []
    for mask_id, mask in enumerate(masks):
        mask_json = gen_mask_json(mask)
        mask_json["image_id"] = image_id
        mask_json["id"] = mask_id
        mask_jsons.append(mask_json)

    annotation_json = {}
    annotation_json["image"] = image_json
    annotation_json["annotations"] = mask_jsons

    return annotation_json