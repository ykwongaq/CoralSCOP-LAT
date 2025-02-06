import numpy as np
import cv2
from typing import Dict
import logging


def calculate_triangle_area(p1, p2, p3):
    """
    Compute the area of a triangle in 3D space given three points.
    """
    # Create two vectors from the three points
    v1 = np.array(p2) - np.array(p1)
    v2 = np.array(p3) - np.array(p1)

    # Compute the cross product
    cross_product = np.cross(v1, v2)

    # Compute the magnitude of the cross product (twice the area of the triangle)
    area = np.linalg.norm(cross_product) / 2

    return area


SOBEL_X_3 = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])

SOBEL_Y_3 = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])

SOBEL_X_5 = np.array(
    [
        [-2, -1, 0, 1, 2],
        [-3, -2, 0, 2, 3],
        [-4, -3, 0, 3, 4],
        [-3, -2, 0, 2, 3],
        [-2, -1, 0, 1, 2],
    ]
)

SOBEL_Y_5 = np.array(
    [
        [-2, -3, -4, -3, -2],
        [-1, -2, -3, -2, -1],
        [0, 0, 0, 0, 0],
        [1, 2, 3, 2, 1],
        [2, 3, 4, 3, 2],
    ]
)

SOBEL_X_7 = np.array(
    [
        [-3, -2, -1, 0, 1, 2, 3],
        [-4, -3, -2, 0, 2, 3, 4],
        [-5, -4, -3, 0, 3, 4, 5],
        [-6, -5, -4, 0, 4, 5, 6],
        [-5, -4, -3, 0, 3, 4, 5],
        [-4, -3, -2, 0, 2, 3, 4],
        [-3, -2, -1, 0, 1, 2, 3],
    ]
)

SOBEL_Y_7 = np.array(
    [
        [-3, -4, -5, -6, -5, -4, -3],
        [-2, -3, -4, -5, -4, -3, -2],
        [-1, -2, -3, -4, -3, -2, -1],
        [0, 0, 0, 0, 0, 0, 0],
        [1, 2, 3, 4, 3, 2, 1],
        [2, 3, 4, 5, 4, 3, 2],
        [3, 4, 5, 6, 5, 4, 3],
    ]
)


class Analysis:
    def __init__(
        self,
        num_scales=8,
    ):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.num_scales = num_scales
        self.scales = [1 / 2**i for i in range(num_scales)]
        self.L0 = np.min(self.scales)

    def cal_fractal_dimension(
        self, depth: np.ndarray, filter_map: np.ndarray = None
    ) -> float:
        """
        Calculate the fractal dimension of a depth map.

        Parameters:
        - depth (np.ndarray): Input depth map as a numpy array.

        Returns:
        - fractal_dimension (float): Fractal dimension of the depth map.
        """
        mean_height_ranges_by_scales = self.cal_mean_heigh_range_by_scale(
            depth, filter_map
        )
        fractal_dimension = self.cal_fractial_dimension_(mean_height_ranges_by_scales)

        if fractal_dimension is None:
            return None

        return fractal_dimension.item()

    def cal_gradient_rugosity(
        self, depth: np.ndarray, filter_map: np.ndarray = None
    ) -> float:
        grad_x = cv2.filter2D(depth, -1, SOBEL_X_3)
        grad_y = cv2.filter2D(depth, -1, SOBEL_Y_3)
        grad = np.sqrt(grad_x**2 + grad_y**2)

        if filter_map is not None:
            grad = grad[filter_map]

            if len(grad) == 0:
                return None

        return np.log10(np.sum(grad)).item()

    def cal_height_range(
        self, depth: np.ndarray, filter_map: np.ndarray = None
    ) -> float:
        """
        Calculate the height range of a depth map.
        Ignore the filter map.
        """
        if filter_map is not None:
            depth = depth[filter_map]

        if len(depth) == 0:
            return None

        return (np.max(depth) - np.min(depth)).item()

    def cal_mean_heigh_range_by_scale(
        self, depth: np.ndarray, filter_map: np.ndarray = None
    ) -> Dict:
        """
        Calculate the height range for each grid cell at different scales.

        Return:
        Dictionary where the key is the scale and the grid cell coordinates.
        Value is the height range of that grid cell.
        """

        mean_height_ranges_by_scale = {}
        for scale in self.scales:
            grid_coordinates = self.split_image_to_grid(depth, scale)
            height_ranges = []
            for grid in grid_coordinates:
                top_left_row, top_left_col, bottom_right_row, bottom_right_col = grid
                depth_map_region = depth[
                    top_left_row:bottom_right_row, top_left_col:bottom_right_col
                ]

                if filter_map is not None:
                    filter_map_region = filter_map[
                        top_left_row:bottom_right_row, top_left_col:bottom_right_col
                    ]
                    height_range = self.cal_height_range(
                        depth_map_region, filter_map_region
                    )
                else:
                    height_range = self.cal_height_range(depth_map_region)
                height_ranges.append(height_range)

            # Filter out the None values
            height_ranges = [x for x in height_ranges if x is not None]
            if len(height_ranges) == 0:
                mean_height_range = None
            else:
                mean_height_range = np.mean(height_ranges)
            mean_height_ranges_by_scale[scale] = mean_height_range

        return mean_height_ranges_by_scale

    def cal_fractial_dimension_(self, mean_height_ranges_by_scales: Dict) -> float:

        scales = list(mean_height_ranges_by_scales.keys())
        mean_height_ranges = list(mean_height_ranges_by_scales.values())

        # Filter out the None values
        scales = [
            scales[i]
            for i in range(len(mean_height_ranges))
            if mean_height_ranges[i] is not None
        ]
        mean_height_ranges = [
            mean_height_ranges[i]
            for i in range(len(mean_height_ranges))
            if mean_height_ranges[i] is not None
        ]

        if len(mean_height_ranges) < 2:
            return None

        x = np.log(list(mean_height_ranges_by_scales.keys()))
        y = np.log(list(mean_height_ranges_by_scales.values()))

        slope, _ = np.polyfit(x, y, 1)
        return 3 - slope

    def split_image_to_grid(self, depth: np.ndarray, scale: float):
        """
        Split the input image into grid cells.

        Parameters:
        - depth (np.ndarray): Input image as a numpy array.
        - scale (float): Scale factor to define the number of regions.
                         For example, 0.5 splits into 2x2 regions, 0.25 splits into 4x4 regions, etc.

        Returns:
        - grid_cells (list): A list of numpy arrays, where each numpy array represents a grid cell.
        """
        image_height, image_width = depth.shape

        num_rows = int(1 / scale)
        num_cols = int(1 / scale)

        if num_rows == 0 or num_cols == 0:
            raise ValueError(
                "Scale is too large for the given image dimensions. Try to set a lower number of scales."
            )

        # Calculate the size of each grid cell
        row_sizes = [image_height // num_rows] * num_rows
        col_sizes = [image_width // num_cols] * num_cols

        # Distribute the remainder to ensure full coverage
        for i in range(image_height % num_rows):
            row_sizes[i] += 1
        for j in range(image_width % num_cols):
            col_sizes[j] += 1

        # Generate the grid coorindates
        grid_coordinates = []
        row_start = 0
        for row_size in row_sizes:
            col_start = 0
            for col_size in col_sizes:
                top_left_row = row_start
                top_left_col = col_start
                bottom_right_row = row_start + row_size
                bottom_right_col = col_start + col_size
                grid_coordinates.append(
                    (top_left_row, top_left_col, bottom_right_row, bottom_right_col)
                )
                col_start += col_size
            row_start += row_size
        return grid_coordinates
