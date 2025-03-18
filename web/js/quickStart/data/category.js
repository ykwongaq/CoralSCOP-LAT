import { CategoryManager } from "./categoryManager.js";

export class Category {
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
