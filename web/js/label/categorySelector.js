class CategorySelector {
    static UNDEFINED_COLOR = "#dedede";

    constructor(selectorDom, categoryButtonTemplate) {
        this.selectorDom = selectorDom;
        this.categoryButtonContainer =
            this.selectorDom.querySelector(".color-plate-list");
        this.toggleButton = this.selectorDom.querySelector(".toggle-button");
        this.selectedCategoryBox = this.selectorDom.querySelector(
            ".selected-category-box"
        );
        this.selectedCategoryText = this.selectedCategoryBox.querySelector(
            ".selected-category-text"
        );
        this.categoryButtonTemplate = categoryButtonTemplate;

        this.selectedCategory = null;
        this.categorySelectionCallbacks = [];
    }

    getToggleButton() {
        return this.toggleButton;
    }

    addCategorySelectionCallback(callback) {
        this.categorySelectionCallbacks.push(callback);
    }

    updateCategoryButtons(predefinedCategories = []) {
        this.clearCategoryButtons();
        const categoryManager = new CategoryManager();

        const labelPanel = new LabelPanel();
        const currentType = labelPanel.getCurrentType();

        // Get the category list based on the current type
        let categoryList = [];
        if (currentType === LabelPanel.TYPE_HEALTHY) {
            categoryList = categoryManager.getCategoryListByStatus(
                CategoryManager.STATUS_HEALTHY
            );
        } else if (currentType === LabelPanel.TYPE_BLEACHED) {
            categoryList = categoryManager.getCategoryListByStatus(
                CategoryManager.STATUS_BLEACHED
            );
        } else if (currentType === LabelPanel.TYPE_DEAD) {
            categoryList = categoryManager.getCategoryListByStatus(
                CategoryManager.STATUS_DEAD
            );
        } else {
            console.error("Invalid category type: ", currentType);
            return;
        }

        for (const category of categoryList) {
            const button = this.createCategoryButton(category);
            this.categoryButtonContainer.appendChild(button);
        }

        for (const category of predefinedCategories) {
            const button = this.createCategoryButton(category);
            this.categoryButtonContainer.appendChild(button);
        }

        this.setSelectedCategory(null);
    }

    clearCategoryButtons() {
        this.categoryButtonContainer.innerHTML = "";
    }

    getSelectedCategory() {
        return this.selectedCategory;
    }

    setSelectedCategory(category) {
        this.selectedCategory = category;

        if (category) {
            this.selectedCategoryBox.style.backgroundColor =
                category.getMaskColor();
            this.selectedCategoryBox.style.borderColor =
                category.getBorderColor();
            this.selectedCategoryText.innerHTML = category.getIconName();
            this.selectedCategoryText.style.color = category.getTextColor();
        } else {
            this.selectedCategoryBox.style.backgroundColor =
                CategorySelector.UNDEFINED_COLOR;
            this.selectedCategoryBox.style.borderColor =
                CategorySelector.UNDEFINED_COLOR;
            this.selectedCategoryText.innerHTML = "";
        }
    }

    createCategoryButton(category) {
        const labelSmallButton = document.importNode(
            this.categoryButtonTemplate.content,
            true
        );
        const colorBoxSmallButton = labelSmallButton.querySelector(".colorBox");
        const labelTextSmallButton =
            labelSmallButton.querySelector(".labelText");

        if (category.getCategoryId() == Category.PREDICTED_CORAL_ID) {
            colorBoxSmallButton.style.backgroundColor =
                CategorySelector.UNDEFINED_COLOR;
            colorBoxSmallButton.style.borderColor =
                CategorySelector.UNDEFINED_COLOR;
            labelTextSmallButton.innerHTML = "";
        } else {
            const maskColor = category.getMaskColor();
            const borderColor = category.getBorderColor();
            const textColor = category.getTextColor();
            colorBoxSmallButton.style.backgroundColor = maskColor;
            colorBoxSmallButton.style.borderColor = borderColor;
            labelTextSmallButton.innerHTML = category.getIconName();
            labelTextSmallButton.style.color = textColor;
        }

        colorBoxSmallButton.addEventListener("click", () => {
            for (const callback of this.categorySelectionCallbacks) {
                callback(category);
            }

            const toggleFn = colorBoxSmallButton.closest(".toggle-fn");
            if (toggleFn && toggleFn.ToggleInput) {
                toggleFn.ToggleInput._hide();
            }

            if (category.getCategoryId() == Category.PREDICTED_CORAL_ID) {
                this.setSelectedCategory(null);
            } else {
                this.setSelectedCategory(category);
            }
        });

        return labelSmallButton;
    }
}
