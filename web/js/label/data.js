class CategoryManager {
    static FOCUS_COLOR = "#0000FF"; // blue
    static REMOVE_COLOR = "#00FF00"; // green
    static DEFAULT_COLOR = "#FF0000"; // red
    static PROMPT_COLOR = "#1491ff";
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

        /**
         * Category data is used to store the category information
         * Key: category id
         * Value: Dictionary containing category information
         */
        this.categoryDict = {};

        /**
         * Category data is used to store the category and super category information
         * Key: super category id
         * Value: List of dictionary containing category information
         */
        this.superCategoryDict = {};

        /**
         * Status data is used to store the status information
         * Key: Status id
         * Value: Name of the status
         */
        this.statusDict = {};

        return this;
    }

    static getColorByCategoryId(categoryId) {
        if (categoryId == Category.PREDICTED_CORAL_ID) {
            return CategoryManager.DEFAULT_COLOR;
        } else if (categoryId == Category.PROMPT_COLOR_ID) {
            return CategoryManager.PROMPT_COLOR;
        }

        const categoryManager = new CategoryManager();
        const superCategoryId =
            categoryManager.getSuperCategoryIdByCategoryId(categoryId);
        return CategoryManager.COLOR_LIST[
            superCategoryId % CategoryManager.COLOR_LIST.length
        ];
    }

    static getBorderColorByCategoryId(categoryId) {
        if (categoryId == Category.PREDICTED_CORAL_ID) {
            return CategoryManager.DEFAULT_COLOR;
        } else if (categoryId == Category.PROMPT_COLOR_ID) {
            return CategoryManager.PROMPT_COLOR;
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
        if (categoryId == Category.PREDICTED_CORAL_ID) {
            return CategoryManager.DEFAULT_TEXT_COLOR;
        }

        const categoryManager = new CategoryManager();
        const superCategoryId =
            categoryManager.getSuperCategoryIdByCategoryId(categoryId);
        return CategoryManager.TEXT_COLOR[
            superCategoryId % CategoryManager.COLOR_LIST.length
        ];
    }

    getCategoryList() {
        const categoryList = [];
        for (const category of Object.values(this.categoryDict)) {
            categoryList.push(new Category(category["id"]));
        }
        return categoryList;
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

    updateStatus(statusInfoList) {
        this.statusDict = {};
        for (const statusInfo of statusInfoList) {
            const statusId = statusInfo["id"];
            this.statusDict[statusId] = statusInfo["name"];
        }
    }

    toJson() {
        const categoryInfo = [];
        for (const category of Object.values(this.categoryDict)) {
            categoryInfo.push(category);
        }
        return categoryInfo;
    }

    /**
     * Get the corresponding category of the given category based on the target status
     * @param {Category} category
     * @param {int} status
     * @returns {Category} Corresponding category
     */
    getCorrespondingCategoryByStatus(category, status) {
        const superCategoryId = category.getSuperCategoryId();
        for (const categoryInfo of this.superCategoryDict[superCategoryId]) {
            if (categoryInfo["status"] == status) {
                const correspondingCategory = new Category(categoryInfo["id"]);
                return correspondingCategory;
            }
        }
        return category;
    }

    /**
     * Get the list of categories with the same super
     * category id but different status. <br>
     *
     * The result excludes the input category
     * @param {Category} category
     * @returns {Array} List of categories with the same super category id
     */
    getOtherStatusofCategory(category) {
        const otherCategories = [];

        const status = category.getStatus();
        const superCategoryId = category.getSuperCategoryId();
        const categoryInfoList = this.superCategoryDict[superCategoryId];
        for (const categoryInfo of categoryInfoList) {
            if (categoryInfo["status"] !== status) {
                const categoryId = categoryInfo["id"];
                const otherCategory = new Category(categoryId);
                otherCategories.push(otherCategory);
            }
        }
        return otherCategories;
    }

    /**
     * Get the list of categories based on the given status
     * @param {number} status
     * @returns List of categories with the given status
     */
    getCategoryListByStatus(status) {
        const categoryList = [];
        for (const category of Object.values(this.categoryDict)) {
            if (category["status"] == status) {
                categoryList.push(new Category(category["id"]));
            }
        }

        // Sort the category list by the super category id
        categoryList.sort((a, b) => {
            return a.getSuperCategoryId() - b.getSuperCategoryId();
        });
        return categoryList;
    }

    isCoralCategoryId(categoryId) {
        return this.categoryDict[categoryId]["is_coral"];
    }

    getStatusByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["status"];
    }

    /**
     * Add new coral category. <br>
     * Coral category will include a healthy, and bleached version.
     * @param {string} categoryName
     * @returns {boolean} True if the category is successfully added
     */
    addCoralCategory(categoryName) {
        if (this.containsCategoryName(categoryName)) {
            return false;
        }

        const newSuperCategoryId = this.findAvariableSuperCategoryId();
        const newSuperCategoryName = categoryName;

        // Add healthy category
        this.addCategory(
            categoryName,
            null,
            newSuperCategoryName,
            newSuperCategoryId,
            true,
            CategoryManager.STATUS_HEALTHY
        );

        // Add bleached category
        const newCategoryName =
            CategoryManager.coralCategoryNameToBleachedName(categoryName);
        this.addCategory(
            newCategoryName,
            null,
            newSuperCategoryName,
            newSuperCategoryId,
            true,
            CategoryManager.STATUS_BLEACHED
        );

        return true;
    }

    /**
     * Add new category. <br>
     * The manager will automatically find the
     * unused category id and super category id.
     *
     * @param {string} categoryName
     * @param {number} categoryId - If null, the manager will find the available category id
     * @param {string} superCategoryName - If null, the category name will be used as the super category name
     * @param {number} superCategoryId - If null, the manager will find the available super category id
     * @param {boolean} isCoral
     * @param {number} status
     * @returns {boolean} True if the category is successfully added
     */
    addCategory(
        categoryName,
        categoryId = null,
        superCategoryName = null,
        superCategoryId = null,
        isCoral = true,
        status = CategoryManager.STATUS_UNDEFINED
    ) {
        if (this.containsCategoryName(categoryName)) {
            return false;
        }

        let newCategoryId = categoryId;
        if (newCategoryId === null) {
            newCategoryId = this.findAvailableCategoryId();
        }

        let newSuperCategoryId = superCategoryId;
        if (newSuperCategoryId === null) {
            newSuperCategoryId = this.findAvariableSuperCategoryId();
        }

        // If the super category name is not provided,
        // use the category name as the super category name
        let newSuperCategoryName = superCategoryName;
        if (newSuperCategoryName === null) {
            newSuperCategoryName = categoryName;
        }

        const categoryInfo = {};
        categoryInfo["id"] = newCategoryId;
        categoryInfo["name"] = categoryName;
        categoryInfo["supercategory"] = newSuperCategoryName;
        categoryInfo["is_coral"] = isCoral;
        categoryInfo["status"] = status;
        categoryInfo["supercategory_id"] = newSuperCategoryId;

        this.categoryDict[newCategoryId] = categoryInfo;
        if (!(newSuperCategoryId in this.superCategoryDict)) {
            this.superCategoryDict[newSuperCategoryId] = [];
        }
        this.superCategoryDict[newSuperCategoryId].push(categoryInfo);
        return true;
    }

    /**
     * Find the available category id
     * @returns {number} Available category id
     */
    findAvailableCategoryId() {
        let categoryId = 0;
        for (let i = 0; i <= Object.keys(this.categoryDict).length; i++) {
            if (!(categoryId.toString() in this.categoryDict)) {
                break;
            }
            categoryId++;
        }
        return categoryId;
    }

    /**
     * Find the available super category id
     * @returns {number} Available super category id
     */
    findAvariableSuperCategoryId() {
        let superCategoryId = 0;
        for (let i = 0; i <= Object.keys(this.superCategoryDict).length; i++) {
            if (!(superCategoryId.toString() in this.superCategoryDict)) {
                break;
            }
            superCategoryId++;
        }
        return superCategoryId;
    }

    /**
     * Check if the category name is already in the category list
     * @param {string} categoryName
     * @returns {boolean} True if the category name is already in the category list
     */
    containsCategoryName(categoryName) {
        for (const category of Object.values(this.categoryDict)) {
            if (category["name"] === categoryName) {
                return true;
            }
        }
        return false;
    }

    /**
     * Remove the category from the category list and the super category list
     * @param {Category} category
     */
    removeCategory(category) {
        const categoryId = category.getCategoryId();
        const superCategoryId = category.getSuperCategoryId();

        // Remove the category from the category list
        delete this.categoryDict[categoryId];

        // Remove the category from the super category list
        const superCategoryList = this.superCategoryDict[superCategoryId];
        const newSuperCategoryList = superCategoryList.filter(
            (category) => category["id"] !== categoryId
        );
        this.superCategoryDict[superCategoryId] = newSuperCategoryList;
        if (newSuperCategoryList.length === 0) {
            delete this.superCategoryDict[superCategoryId];
        }
    }

    /**
     * Rename the target category into the new category name. <br>
     *
     * It is assumed that if the given category is a coral, then it
     * should be at healthy status. <br>
     *
     * If the category is a coral, then rename the bleached category as well.
     * @param {Category} category - The category to be renamed
     * @param {string} newCategoryName - The new category name
     */
    renameCategory(category, newCategoryName) {
        if (category.isCoral() && !category.isHealthy()) {
            console.error("Invalid category status");
            return;
        }

        // Rename the category
        this.renameCategory_(category, newCategoryName, newCategoryName);

        if (category.isCoral()) {
            // Rename the bleached category
            const bleachedCategoryName =
                CategoryManager.coralCategoryNameToBleachedName(
                    newCategoryName
                );
            const bleachedCategory = this.getCorrespondingCategoryByStatus(
                category,
                CategoryManager.STATUS_BLEACHED
            );
            this.renameCategory_(
                bleachedCategory,
                bleachedCategoryName,
                newCategoryName
            );
        }
    }

    renameCategory_(category, newCategoryName, newSuperCategoryName) {
        const categoryId = category.getCategoryId();
        const superCategoryId = category.getSuperCategoryId();

        // Update the category name
        this.categoryDict[categoryId]["name"] = newCategoryName;
        this.categoryDict[categoryId]["supercategory"] = newSuperCategoryName;

        // Update the super category name
        const superCategoryList = this.superCategoryDict[superCategoryId];
        for (const categoryInfo of superCategoryList) {
            if (categoryInfo["id"] === categoryId) {
                categoryInfo["name"] = newCategoryName;
                categoryInfo["supercategory"] = newSuperCategoryName;
            }
        }
    }

    /**
     * Get the name of the status by id
     * @param {number} statusId
     * @returns Name of the status
     */
    getStatusName(statusId) {
        return this.statusDict[statusId];
    }

    getStatusInfo() {
        const statusInfo = [];
        for (const [statusId, statusName] of Object.entries(this.statusDict)) {
            statusInfo.push({ id: statusId, name: statusName });
        }
        return statusInfo;
    }

    static coralCategoryNameToBleachedName(categoryName) {
        return CategoryManager.BLEACHED_PREFIX + categoryName;
    }
}

class Category {
    static DEAD_CORAL_ID = 0;
    static PREDICTED_CORAL_ID = -1;
    static PROMPT_COLOR_ID = -2;

    constructor(categoryId) {
        this.categoryId = categoryId;
    }

    /**
     * Get category id of the category.
     *
     * If the coral category is a bleached category,
     * there will be a "Bleaced " prefix in the category name.
     * @returns {number} Category id
     */
    getCategoryId() {
        return this.categoryId;
    }

    /**
     * Get the category name
     * @returns {string} Category name
     */
    getCategoryName() {
        const categoryManager = new CategoryManager();
        return categoryManager.getCategoryNameByCategoryId(this.categoryId);
    }

    /**
     * Get the super category name, which identifies the coral name
     * @returns {string} Category super name
     */
    getCategorySuperName() {
        const categoryManager = new CategoryManager();
        return categoryManager.getSupercategoryNameByCategoryId(
            this.categoryId
        );
    }

    /**
     * Get the super category id, which identifies the coral type or other non-coral type
     * @returns {number} Super category id
     */
    getSuperCategoryId() {
        const categoryManager = new CategoryManager();
        return categoryManager.getSuperCategoryIdByCategoryId(this.categoryId);
    }

    /**
     * Icon name show the category id (e.g. 1).
     *
     * If the category is a bleached category,
     * the icon name will be "1B" with a 'B' at the back.
     * @returns {string} Icon name
     */
    getIconName() {
        let superCategoryId = this.getSuperCategoryId();
        if (this.isBleached()) {
            return `${superCategoryId}B`;
        }
        return `${superCategoryId}`;
    }

    isCoral() {
        const categoryManager = new CategoryManager();
        return categoryManager.getIsCoralByCategoryId(this.categoryId);
    }

    getStatus() {
        const categoryManager = new CategoryManager();
        return categoryManager.getStatusByCategoryId(this.categoryId);
    }

    /**
     * Get the mask color (e.g. "#F6C3CB")
     * @returns {string} Mask color
     */
    getMaskColor() {
        return CategoryManager.getColorByCategoryId(this.getCategoryId());
    }

    /**
     * Get the text color (e.g. "#fff")
     * @returns {string} Text color
     */
    getTextColor() {
        return CategoryManager.getTextColorByCategoryId(this.getCategoryId());
    }

    /**
     * Get the border color (e.g. "#D3D3D3")
     * @returns {string} Border color
     */
    getBorderColor() {
        return CategoryManager.getBorderColorByCategoryId(this.getCategoryId());
    }

    isBleached() {
        return this.getStatus() == CategoryManager.STATUS_BLEACHED;
    }

    isHealthy() {
        return this.getStatus() == CategoryManager.STATUS_HEALTHY;
    }

    isDead() {
        return this.getStatus() == CategoryManager.STATUS_DEAD;
    }

    getCategoriesOfOtherStatus() {
        const categoryManager = new CategoryManager();
        const categoryList = categoryManager.getOtherStatusofCategory(this);
        return categoryList;
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

    setId(maskId) {
        this.maskId = maskId;
    }

    getCategory() {
        return this.category;
    }

    setCategory(category) {
        this.category = category;
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
            segmentation: this.annotation["segmentation"],
            area: this.getArea(),
            bbox: this.annotation["bbox"],
            iscrowd: this.annotation["iscrowd"],
            predicted_iou: this.annotation["predicted_iou"],
        };
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
}
