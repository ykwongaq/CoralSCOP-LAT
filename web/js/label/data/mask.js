import { MaskSelector } from "../maskSelector.js";
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
}
