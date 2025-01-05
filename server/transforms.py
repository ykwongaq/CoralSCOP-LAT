# # Copyright (c) Meta Platforms, Inc. and affiliates.
# # All rights reserved.

# # This source code is licensed under the license found in the
# # LICENSE file in the root directory of this source tree.

# import numpy as np

# from copy import deepcopy
# from typing import Tuple


# class ResizeLongestSide:
#     """
#     Resizes images to the longest side 'target_length', as well as provides
#     methods for resizing coordinates and boxes. Provides methods for
#     transforming both numpy array and batched torch tensors.
#     """

#     def __init__(self) -> None:
#         self.target_length = 1024

#     def apply_coords(
#         self, coords: np.ndarray, original_size: Tuple[int, ...]
#     ) -> np.ndarray:
#         """
#         Expects a numpy array of length 2 in the final dimension. Requires the
#         original image size in (H, W) format.
#         """
#         old_h, old_w = original_size
#         new_h, new_w = self.get_preprocess_shape(
#             original_size[0], original_size[1], self.target_length
#         )

#         print(f"someht trainfrome")
#         coords = deepcopy(coords).astype(float)
#         coords[..., 0] = coords[..., 0] * (new_w / old_w)
#         coords[..., 1] = coords[..., 1] * (new_h / old_h)
#         return coords

#     @staticmethod
#     def get_preprocess_shape(
#         oldh: int, oldw: int, long_side_length: int
#     ) -> Tuple[int, int]:
#         """
#         Compute the output size given input size and target long side length.
#         """
#         scale = long_side_length * 1.0 / max(oldh, oldw)
#         newh, neww = oldh * scale, oldw * scale
#         neww = int(neww + 0.5)
#         newh = int(newh + 0.5)
#         return (newh, neww)
