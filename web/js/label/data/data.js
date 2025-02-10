import { Mask } from "./mask.js";
import { Category } from "./category.js";

export class Data {
    constructor() {
        this.imageName = null;
        this.imagePath = null;
        this.idx = null;
        this.masks = [];
        this.imageWidth = null;
        this.imageHeight = null;
    }

    /**
     * Parse server response into data object
     * @param {Object} response
     * @returns {Data} Created data object
     */
    static parseResponse(response) {
        const data = new Data();
        data.setImageName(response["image_name"]);
        data.setImagePath(response["image_path"]);
        data.setIdx(response["idx"]);
        data.setImageWidth(response["segmentation"]["images"][0]["width"]);
        data.setImageHeight(response["segmentation"]["images"][0]["height"]);

        const masks = [];
        for (const annotation of response["segmentation"]["annotations"]) {
            masks.push(new Mask(annotation));
        }
        data.setMasks(masks);

        return data;
    }

    setImageName(imageName) {
        this.imageName = imageName;
    }

    setImagePath(imagePath) {
        this.imagePath = imagePath;
    }

    setIdx(idx) {
        this.idx = idx;
    }

    getImageName() {
        return this.imageName;
    }

    getImagePath() {
        return encodeURIComponent(this.imagePath);
    }

    getIdx() {
        return this.idx;
    }

    setImageWidth(width) {
        this.imageWidth = width;
    }

    setImageHeight(height) {
        this.imageHeight = height;
    }

    getImageWidth() {
        return this.imageWidth;
    }

    getImageHeight() {
        return this.imageHeight;
    }

    setMasks(masks) {
        this.masks = masks;
    }

    getMasks() {
        return this.masks;
    }

    toJson() {
        const masks = [];
        for (const mask of this.masks) {
            masks.push(mask.toJson());
        }

        const images = [];
        const image = {
            id: this.idx,
            file_name: this.imageName,
            width: this.imageWidth,
            height: this.imageHeight,
        };
        images.push(image);

        return {
            images: images,
            annotations: masks,
        };
    }

    removeMask(mask) {
        this.masks = this.masks.filter((m) => m !== mask);
    }

    /**
     * Add the given mask into this data.
     *
     * The mask id will be automatically assigned.
     *
     * The category of the mask will be updated if the
     * category is -2 (prompting mask)
     *
     * @param {Mask} mask
     */
    addMask(mask) {
        // Update mask id
        const maskId = this.findAvailableMaskId();
        mask.setId(maskId);

        // Update mask category
        if (mask.getCategory().getCategoryId() === Category.PROMPT_COLOR_ID) {
            const newCategory = new Category(Category.PREDICTED_CORAL_ID);
            mask.setCategory(newCategory);
        }

        this.masks.push(mask);

        // Verify that all mask ids are unique
        const maskIds = new Set();
        for (const mask of this.masks) {
            maskIds.add(mask.getId());
        }
        if (maskIds.size !== this.masks.length) {
            console.error("Mask ids are not unique");
        }
    }

    findAvailableMaskId() {
        const existingMaskIds = new Set();
        for (const mask of this.masks) {
            existingMaskIds.add(mask.getId());
        }

        let maskId = 0;
        for (let i = 0; i <= existingMaskIds.size; i++) {
            if (!existingMaskIds.has(maskId)) {
                break;
            }
            maskId++;
        }

        return maskId;
    }

    deepCopy() {
        const data = new Data();
        data.setImageName(this.imageName);
        data.setImagePath(this.imagePath);
        data.setIdx(this.idx);
        data.setImageWidth(this.imageWidth);
        data.setImageHeight(this.imageHeight);

        const masks = [];
        for (const mask of this.masks) {
            masks.push(mask.deepCopy());
        }
        data.setMasks(masks);

        return data;
    }
}
