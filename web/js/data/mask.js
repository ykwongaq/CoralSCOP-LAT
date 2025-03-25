import { MaskSelector } from "../action/maskSelector.js";
import { Category } from "./category.js";
import { CategoryManager } from "./categoryManager.js";

export class Mask {
    constructor(annotation) {
        this.annotation = annotation;
        this.maskId = annotation["id"];

        const categoryId = annotation["category_id"];
        this.category = new Category(categoryId);

        this.decodeMask = null;
        this.shouldDisplay_ = true;

        this.area = annotation["area"];
        this.width = annotation["segmentation"]["size"][1];
        this.height = annotation["segmentation"]["size"][0];
        this.isModified_ = false;
        this.middlePoint = null;
    }

    isModified() {
        return this.isModified_;
    }

    setModified(isModified) {
        this.isModified_ = isModified;
    }

    getId() {
        return this.maskId;
    }

    setId(maskId) {
        this.maskId = maskId;
        this.annotation["id"] = maskId;
    }

    getCategory() {
        return this.category;
    }

    setCategory(category) {
        this.category = category;
        this.annotation["category_id"] = category.getCategoryId();
    }

    getArea() {
        return this.area;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    shouldDisplay() {
        return this.shouldDisplay_;
    }

    setShouldDisplay(shouldDisplay) {
        this.shouldDisplay_ = shouldDisplay;
        this.setModified(true);
    }

    getDecodedMask() {
        if (this.decodeMask === null) {
            this.decodeMask = this.decodeRleMask(this.annotation["rle"]);
        }
        return this.decodeMask;
    }

    decodeRleMask(rle_mask) {
        const totalLength = rle_mask.reduce((sum, len) => sum + len, 0);
        const mask = new Uint8Array(totalLength); // Use Uint8Array for better performance

        let index = 0;
        let value = 0;

        for (let i = 0; i < rle_mask.length; i++) {
            const length = rle_mask[i];
            mask.fill(value, index, index + length);
            index += length;
            value = 1 - value; // Toggle between 0 and 1
        }

        return mask;
    }

    getMiddlePoint() {
        if (this.middlePoint) {
            return this.middlePoint;
        }

        const mask = this.getDecodedMask();
        let x_sum = 0;
        let y_sum = 0;
        let count = 0;

        for (let i = 0; i < mask.length; i++) {
            if (mask[i] === 1) {
                const x = i % this.width;
                const y = Math.floor(i / this.width);
                x_sum += x;
                y_sum += y;
                count++;
            }
        }

        if (count === 0) return null; // Handle the case where no points are found

        const middle_x = Math.floor(x_sum / count);
        const middle_y = Math.floor(y_sum / count);

        this.middlePoint = [middle_x, middle_y];

        return [middle_x, middle_y];
    }

    getMaskColor() {
        if (this.isSelected()) {
            return CategoryManager.FOCUS_COLOR;
        }
        return this.category.getMaskColor();
    }

    isSelected() {
        const maskSelector = new MaskSelector();
        return maskSelector.isSelected(this);
    }

    /**
     * Check if the mask contains the pixel
     * @param {number} x
     * @param {number} y
     * @returns {boolean} True if the mask contains the pixel
     */
    containPixel(x, y) {
        const mask = this.getDecodedMask();
        return mask[y * this.width + x] === 1;
    }

    getImageId() {
        return this.annotation["image_id"];
    }

    toJson() {
        return {
            id: this.getId(),
            image_id: this.getImageId(),
            category_id: this.category.getCategoryId(),
            segmentation: structuredClone(this.annotation["segmentation"]),
            area: this.getArea(),
            bbox: this.annotation["bbox"],
            iscrowd: this.annotation["iscrowd"],
            predicted_iou: this.annotation["predicted_iou"],
        };
    }

    deepCopy() {
        const annotation = JSON.parse(JSON.stringify(this.annotation));
        return new Mask(annotation);
    }

    /**
     *  Get the bounding box of the mask
     * @returns {number[]} [x, y, width, height]
     */
    getBoundingBox() {
        const boundingBox = this.annotation["bbox"];
        // Convert the element into number
        return boundingBox.map((element) => Number(element));
    }

    /**
     * Get the mask of the region
     * @param {Rectangle} rectangle The region to get the mask
     * @returns {Uint8Array} The decoded mask of the region
     */
    getRegionalDecodedMask(rectangle) {
        const mask = this.getDecodedMask();
        const x1 = rectangle.getX1();
        const y1 = rectangle.getY1();
        const x2 = rectangle.getX2();
        const y2 = rectangle.getY2();

        const width = this.getWidth();

        const regionWidth = Math.abs(x2 - x1);
        const regionHeight = Math.abs(y2 - y1);

        const regionalMask = new Uint8Array(regionWidth * regionHeight);
        let index = 0;
        for (let row = y1; row <= y2; row++) {
            const startIdx = row * width + x1;
            for (let col = 0; col < regionWidth; col++) {
                regionalMask[index] = mask[startIdx + col];
                index++;
            }
        }

        return regionalMask;
    }
}
