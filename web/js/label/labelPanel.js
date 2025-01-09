class LabelPanel {
    static TYPE_HEALTHY = 0;
    static TYPE_BLEACHED = 1;
    static TYPE_DEAD = 2;

    constructor(dom) {
        if (LabelPanel.instance) {
            return LabelPanel.instance;
        }
        LabelPanel.instance = this;

        this.dom = dom;

        // Opacity Setting
        this.opacitySlider = this.dom.querySelector("#mask-opacity-silder");
        this.opacityInput = this.dom.querySelector("#mask-opacity-input");

        // Show Mask Button
        this.showMaskButton = this.dom.querySelector("#toogle-mask-button");

        // Category container
        this.categoryContainer = this.dom.querySelector("#label-container");
        this.categoryButtonTemplate = this.dom.querySelector(
            "#label-button-template"
        );
        this.categoryTypeRadioButtons = this.dom.querySelectorAll(
            "input[name='status']"
        );
        this.currentType = LabelPanel.TYPE_HEALTHY;

        // Add Category
        this.addCategoryInput = this.dom.querySelector("#add-category-input");
        this.addCategoryButton = this.dom.querySelector("#add-category-button");

        // Search Category
        this.searchInput = this.dom.querySelector("#search-input");
        this.searchButton = this.dom.querySelector("#search-button");

        return this;
    }

    init() {
        const opacitySliderBlock = this.dom.querySelector("#mask-slider-blk");
        opacitySliderBlock.Slider = new Slider(opacitySliderBlock);

        this.initOpacitySlider();
        this.initOpacityInput();
        this.initShowMaskButton();

        this.initStatusButtons();
        this.initAddCategory();
        this.initSearchCategory();
    }

    initOpacitySlider() {
        this.opacitySlider.addEventListener("input", function (event) {
            const opacity = this.value / 100;
            const canvas = new Canvas(null);
            canvas.setOpacity(opacity);
        });
    }

    initOpacityInput() {
        this.opacityInput.addEventListener("input", function (event) {
            // Ensure that the input value is a number between 0 and 100
            if (isNaN(this.value)) {
                this.value = 60;
            }

            if (this.value > 100) {
                this.value = 100;
            } else if (this.value < 0) {
                this.value = 0;
            }

            const opacity = this.value / 100;
            const canvas = new Canvas(null);
            canvas.setOpacity(opacity);
        });
    }

    initShowMaskButton() {
        this.showMaskButton.checked = true;
        this.showMaskButton.addEventListener("click", function () {
            const showMask = this.checked;
            const canvas = new Canvas();
            canvas.setShouldShowMask(showMask);
        });
    }

    initStatusButtons() {
        for (const radio of this.categoryTypeRadioButtons) {
            radio.addEventListener("change", () => {
                const value = parseInt(radio.value);
                this.currentType = value;
                this.updateCategoryButtons();

                const actionPanel = new ActionPanel();
                actionPanel.updateButtons();
            });
        }
    }

    initAddCategory() {
        this.addCategoryButton.addEventListener("click", () => {
            const labelName = this.addCategoryInput.value;
            // Strip the label name
            const strippedLabelName = labelName.replace(/\s/g, "");

            // Ignore if the label name is empty
            if (strippedLabelName.length == 0) {
                return;
            }

            // Ignore if the label name is started with "Bleached"
            if (strippedLabelName.startsWith("Bleached")) {
                // TODO: Pop up a warning message
                return;
            }

            const categoryManager = new CategoryManager();
            const success = categoryManager.addCoralCategory(labelName);
            if (!success) {
                // TODO: Pop up a warning message
            }

            this.updateCategoryButtons();
            this.addCategoryInput.value = "";

            const actionPanel = new ActionPanel();
            actionPanel.updateCategoryButtons();
        });

        this.addCategoryInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                this.addCategoryButton.click();
            }
        });
    }

    initSearchCategory() {
        this.searchInput.addEventListener("keyup", () => {
            const searchValue = this.searchInput.value.toLowerCase();
            const items =
                this.categoryContainer.querySelectorAll(".labelButton");
            for (const item of items) {
                const labelText = item.querySelector(".labelText").innerHTML;
                if (labelText.toLowerCase().includes(searchValue)) {
                    item.classList.remove("hidden");
                } else {
                    item.classList.add("hidden");
                }
            }
        });
    }

    updateCategoryButtons() {
        this.clearButtons();
        const categoryManager = new CategoryManager();

        // Get the category list based on the current type
        let categoryList = [];
        if (this.currentType === LabelPanel.TYPE_HEALTHY) {
            categoryList = categoryManager.getCategoryListByStatus(
                CategoryManager.STATUS_HEALTHY
            );
        } else if (this.currentType === LabelPanel.TYPE_BLEACHED) {
            categoryList = categoryManager.getCategoryListByStatus(
                CategoryManager.STATUS_BLEACHED
            );
        } else if (this.currentType === LabelPanel.TYPE_DEAD) {
            categoryList = categoryManager.getCategoryListByStatus(
                CategoryManager.STATUS_DEAD
            );
        } else {
            console.error("Invalid category type: ", this.currentType);
            return;
        }

        // Create category item for each category
        for (const category of categoryList) {
            const item = this.createCategoryItem(category);
            this.categoryContainer.appendChild(item);
        }
    }

    clearButtons() {
        this.categoryContainer.innerHTML = "";
    }

    /**
     * Create a category button
     * @param {Category} category
     */
    createCategoryItem(category) {
        const item = document.importNode(
            this.categoryButtonTemplate.content,
            true
        );

        // Display
        const colorBox = item.querySelector(".colorBox");
        const labelText = item.querySelector(".labelText");
        const maskColor = category.getMaskColor();
        const fontColor = category.getTextColor();
        const borderColor = category.getBorderColor();
        const categoryName = category.getCategoryName();
        const iconName = category.getIconName();
        labelText.innerHTML = `${categoryName}`;
        colorBox.style.backgroundColor = maskColor;
        colorBox.style.color = fontColor;
        colorBox.style.borderColor = borderColor;
        colorBox.innerHTML = iconName;

        // Buttons
        const maskHideButton = item.querySelector(".label-hide-fn");
        maskHideButton.addEventListener("click", (event) => {
            console.log("Hide mask");
        });

        const menuButton = item.querySelector(".label-menu-fn");
        menuButton.addEventListener("click", (event) => {
            console.log("Show menu");
        });

        return item;
    }

    getCurrentType() {
        return this.currentType;
    }
}
