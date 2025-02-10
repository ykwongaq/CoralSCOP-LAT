import { Category } from "./category.js";

export class CategoryManager {
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
        // "#EB361C",
        "#FFA500",
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
        return parseInt(this.categoryDict[categoryId]["supercategory_id"]);
    }

    getSupercategoryNameByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["supercategory"];
    }

    getCategoryNameByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["name"];
    }

    getStatusByCategoryId(categoryId) {
        return parseInt(this.categoryDict[categoryId]["status"]);
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
            categoryInfo.push(structuredClone(category));
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
            CategoryManager.STATUS_BLEACHED,
            false
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
        status = CategoryManager.STATUS_UNDEFINED,
        saveRecord = true
    ) {
        if (this.containsCategoryName(categoryName)) {
            return false;
        }

        if (saveRecord) {
            const core = new Core();
            core.recordData();
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
     * Remove the category from the category list and the super category list.
     * If you have a list of category, please use removeCategories instead,
     * because it may affect the history manager.
     * @param {Category} category
     */
    removeCategory(category) {
        const categoryId = category.getCategoryId();
        const superCategoryId = category.getSuperCategoryId();

        // Check if the category exist
        if (!(categoryId in this.categoryDict)) {
            console.error("Category does not exist");
            return;
        }

        // Save record
        const core = new Core();
        core.recordData();

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
     * Remove a list of category. Please do not use removeCategory
     * for multiple times, because it will affect the history manager.
     * @param {List} categoryList
     * @returns
     */
    removeCategories(categoryList) {
        for (const category of categoryList) {
            if (category.getCategoryId() === Category.PREDICTED_CORAL_ID) {
                console.error("Cannot remove predicted category");
                return;
            }
        }

        // Save record
        const core = new Core();
        core.recordData();

        for (const category of categoryList) {
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

        // Check if the category exist
        if (!(category.getCategoryId() in this.categoryDict)) {
            console.error("Category does not exist");
            return;
        }

        // Save record
        const core = new Core();
        core.recordData();

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
