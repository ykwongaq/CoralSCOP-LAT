import { CategoryManager } from "./categoryManager.js";

export class Category {
    static UNDEFINED_ID = -1;
    static PROMPT_ID = -2;

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

    getSuperCategoryName() {
        const categoryManager = new CategoryManager();
        return categoryManager.getSuperCategoryNameByCategoryId(
            this.categoryId
        );
    }

    /**
     * Icon name show the category id (e.g. 1).
     *
     * If the category is a bleached category,
     * the icon name will be "1B" with a 'B' at the back.
     * @returns {string} Icon name
     */
    getIconName() {
        let categoryId = this.getCategoryId();
        return `${categoryId}`;
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
}
