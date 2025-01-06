class CategoryManager {
    static FOCUS_COLOR = "#0000FF"; // blue
    static REMOVE_COLOR = "#00FF00"; // green
    static DEFAULT_COLOR = "#FF0000"; // red
    static DEFAULT_TEXT_COLOR = "#fff"; // white

    static BLEACHED_PREFIX = "Bleached ";

    static STATUS_UNDEFINED = -1;
    static STATUS_HEALTHY = 0;
    static STATUS_BLEACHED = 1;
    static STATUS_DEAD = 2;

    static BLEACHED_BORDER_COLOR = "#D3D3D3";
    static DEAD_BORDER_COLOR = "#000000";

    static COLOR_LIST = [
        "#000000",
        "#F6C3CB",
        "#EB361C",
        "#225437",
        "#F7D941",
        "#73FBFE",
        "#9EFCD6",
        "#2B00F7",
        "#F2AA34",
        "#EF7C76",
        "#BADFE5",
        "#BED966",
        "#CCE1FD",
        "#F188E9",
        "#6CFB45",
        "#7FCBAC",
        "#C9BFB6",
        "#163263",
        "#751608",
        "#54AFAA",
        "#5F0F63",
    ];

    static TEXT_COLOR = [
        "#fff",
        "#000",
        "#fff",
        "#fff",
        "#000",
        "#000",
        "#000",
        "#fff",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#fff",
        "#fff",
        "#fff",
        "#fff",
    ];

    constructor() {
        if (CategoryManager.instance) {
            return CategoryManager.instance;
        }

        CategoryManager.instance = this;

        this.categoryDict = {};

        /**
         * Category data is used to store the category and super category information
         * Key: super category id
         * Value: List of dictionary containing category information
         */
        this.superCategoryDict = {};
        return this;
    }

    static getColorByCategoryId(categoryId) {
        if (categoryId == -1) {
            return CategoryManager.DEFAULT_COLOR;
        }

        const categoryManager = new CategoryManager();
        const superCategoryId =
            categoryManager.getSuperCategoryIdByCategoryId(categoryId);
        return CategoryManager.getColorBySuperCategoryId(
            superCategoryId % CategoryManager.COLOR_LIST.length
        );
    }

    static getBorderColorByCategoryId(categoryId) {
        if (categoryId == -1) {
            return CategoryManager.DEFAULT_COLOR;
        }

        const category = new Category(categoryId);
        if (category.isBleached()) {
            return CategoryManager.BLEACHED_BORDER_COLOR;
        } else if (category.isDead()) {
            return CategoryManager.DEAD_BORDER_COLOR;
        } else if (category.isHealthy()) {
            return category.getMaskColor();
        } else {
            console.error("Invalid category id: ", categoryId);
            return CategoryManager.DEFAULT_COLOR;
        }
    }

    static getTextColorByCategoryId(categoryId) {
        if (categoryId == -1) {
            return CategoryManager.DEFAULT_TEXT_COLOR;
        }

        const categoryManager = new CategoryManager();
        const superCategoryId =
            categoryManager.getSuperCategoryIdByCategoryId(categoryId);
        return CategoryManager.TEXT_COLOR[
            superCategoryId % CategoryManager.COLOR_LIST.length
        ];
    }

    getSuperCategoryIdByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["supercategory_id"];
    }

    getSupercategoryNameByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["supercategory"];
    }

    getCategoryNameByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["name"];
    }

    getStatusByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["status"];
    }

    getIsCoralByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["is_coral"];
    }

    /**
     * Update the category list
     *
     * The input is the list of category dictionary following the coco format with additional entries:
     * 1. id
     * 2. name
     * 3. supercategory
     * 4. is_coral - True if the category is a coral category
     * 5. status - Status Id of the category
     * 6. supercategory_id - Id of the super category
     * @param {Object} categoryInfoList List of category dictionary
     */
    updateCategoryList(categoryInfoList) {
        this.categoryDict = {};
        for (const categoryInfo of categoryInfoList) {
            const categoryId = categoryInfo["id"];
            this.categoryDict[categoryId] = categoryInfo;
        }

        this.superCategoryDict = {};
        for (const categoryInfo of categoryInfoList) {
            const superCategoryId = categoryInfo["supercategory_id"];
            if (!(superCategoryId in this.superCategoryDict)) {
                this.superCategoryDict[superCategoryId] = [];
            }
            this.superCategoryDict[superCategoryId].push(categoryInfo);
        }
    }

    /**
     * Get the corresponding category of the given category based on the target status
     * @param {Category} category
     * @param {int} status
     * @returns {Category} Corresponding category
     */
    getCorrespondingCategoryByStatus(category, status) {
        const superCategoryId = category.getSuperCategoryId();
        for (const category of this.superCategoryDict[superCategoryId]) {
            if (category.getStatus() == status) {
                return category;
            }
        }
        return category;
    }
}

class Category {
    constructor(categoryId) {
        this.categoryId = categoryId;
    }

    getCategoryId() {
        return this.categoryId;
    }

    getCategoryName() {
        return this.categoryName;
    }

    getCategorySuperName() {
        const categoryManager = new CategoryManager();
        return categoryManager.getSupercategoryNameByCategoryId(
            this.categoryId
        );
    }

    getSuperCategoryId() {
        const categoryManager = new CategoryManager();
        return categoryManager.getSuperCategoryIdByCategoryId(this.categoryId);
    }

    isCoral() {
        return this.isCoral;
    }

    getStatus() {
        return this.status;
    }

    getMaskColor() {
        return CategoryManager.getColorByCategoryId(this.getCategoryId());
    }

    getTextColor() {
        return CategoryManager.getTextColorByCategoryId(this.getCategoryId());
    }

    getBoraderColor() {
        return CategoryManager.getBorderColorByCategoryId(this.getCategoryId());
    }

    isBleached() {
        return this.getStatus() === CategoryManager.STATUS_BLEACHED;
    }

    isHealthy() {
        return this.getStatus() === CategoryManager.STATUS_HEALTHY;
    }

    isDead() {
        return this.getStatus() === CategoryManager.STATUS_DEAD;
    }
}

class Mask {
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

    getCategory() {
        return this.category;
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
}

class Data {
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
        data.setImageWidth(response["segmentation"]["images"]["width"]);
        data.setImageHeight(response["segmentation"]["images"]["height"]);

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
        return this.imagePath;
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
}
