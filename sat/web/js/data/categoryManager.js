import { Category } from "./category.js";
import { Manager } from "../manager.js";

export class CategoryManager {
    static FOCUS_COLOR = "#0000FF"; // blue
    static REMOVE_COLOR = "#00FF00"; // green
    static DEFAULT_COLOR = "#FF0000"; // red
    static PROMPT_COLOR = "#1491ff";
    static DEFAULT_TEXT_COLOR = "#fff"; // white

    static STATUS_UNDEFINED = -1;

    static BLEACHED_BORDER_COLOR = "#D3D3D3";
    static DEAD_BORDER_COLOR = "#000000";

    static COLOR_LIST = [
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

        return this;
    }

    static getColorByCategoryId(categoryId) {
        if (categoryId == Category.UNDEFINED_ID) {
            return CategoryManager.DEFAULT_COLOR;
        } else if (categoryId == Category.PROMPT_ID) {
            return CategoryManager.PROMPT_COLOR;
        }
        return CategoryManager.COLOR_LIST[
            categoryId % CategoryManager.COLOR_LIST.length
        ];
    }

    static getBorderColorByCategoryId(categoryId) {
        return CategoryManager.getColorByCategoryId(categoryId);
    }

    static getTextColorByCategoryId(categoryId) {
        if (categoryId == Category.UNDEFINED_ID) {
            return CategoryManager.DEFAULT_TEXT_COLOR;
        }

        return CategoryManager.TEXT_COLOR[
            categoryId % CategoryManager.COLOR_LIST.length
        ];
    }

    getCategoryList() {
        const categoryList = [];
        for (const category of Object.values(this.categoryDict)) {
            categoryList.push(new Category(category["id"]));
        }
        return categoryList;
    }

    getCategoryNameByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["name"];
    }

    getSuperCategoryNameByCategoryId(categoryId) {
        return this.categoryDict[categoryId]["supercategory"];
    }

    /**
     * Update the category list
     *
     * The input is the list of category dictionary following the coco format with additional entries:
     * 1. id
     * 2. name
     */
    updateCategoryList(categoryInfoList) {
        this.categoryDict = {};
        for (const categoryInfo of categoryInfoList) {
            const categoryId = categoryInfo["id"];
            this.categoryDict[categoryId] = categoryInfo;
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
     * Add new category. <br>
     * The manager will automatically find the
     * unused category id and super category id.
     *
     * @param {string} categoryName
     * @param {number} categoryId - If null, the manager will find the available category id
     * @returns {boolean} True if the category is successfully added
     */
    addCategory(categoryName, categoryId = null) {
        if (this.containsCategoryName(categoryName)) {
            return false;
        }

        const manager = new Manager();
        const core = manager.getCore();
        core.recordData();

        let newCategoryId = categoryId;
        if (newCategoryId === null) {
            newCategoryId = this.findAvailableCategoryId();
        }

        const categoryInfo = {};
        categoryInfo["id"] = newCategoryId;
        categoryInfo["name"] = categoryName;
        categoryInfo["supercategory"] = categoryName;

        this.categoryDict[newCategoryId] = categoryInfo;
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
        // Remove the category from the category list
        delete this.categoryDict[categoryId];
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
        // Rename the category
        this.renameCategory_(category, newCategoryName);
    }

    renameCategory_(category, newCategoryName) {
        const categoryId = category.getCategoryId();
        // Update the category name
        this.categoryDict[categoryId]["name"] = newCategoryName;
        this.categoryDict[categoryId]["supercategory"] = newCategoryName;
    }
}
