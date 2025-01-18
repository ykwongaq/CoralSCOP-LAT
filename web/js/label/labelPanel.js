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
        this.categoryDropDownMenu = this.dom.querySelector(
            "#label-dropdown-menu"
        );
        this.categoryMenuButtonTemplate = this.dom.querySelector(
            "#category-menu-button-template"
        );

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

        this.initCategoryDropDownMenu();
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
                actionPanel.updateCategoryButtons();
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
            if (strippedLabelName.toLowerCase().startsWith("Bleached")) {
                const generalPopManager = new GeneralPopManager();
                generalPopManager.clear();
                generalPopManager.updateLargeText("Warning");
                generalPopManager.updateText(
                    "The label name cannot start with 'Bleached'."
                );
                generalPopManager.addButton("ok", "OK", () => {
                    generalPopManager.hide();
                });
                generalPopManager.show();
                return;
            }

            const categoryManager = new CategoryManager();
            const success = categoryManager.addCoralCategory(labelName);
            if (!success) {
                // Cannot add the category because the category name is duplicated
                const generalPopManager = new GeneralPopManager();
                generalPopManager.clear();
                generalPopManager.updateLargeText("Warning");
                generalPopManager.updateText(
                    "The category name is duplicated."
                );
                generalPopManager.addButton("ok", "OK", () => {
                    generalPopManager.hide();
                });
                generalPopManager.show();
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

    initCategoryDropDownMenu() {
        document.addEventListener("click", (event) => {
            if (
                event.target !== this.deleteButton &&
                event.target !== this.categoryDropDownMenu &&
                !event.target.matches(".label-menu-fn")
            ) {
                this.categoryDropDownMenu.style.display = "none";
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
        this.initHideCategoryButton(maskHideButton, category);

        // Enable menu button
        const menuButton = item.querySelector(".label-menu-fn");
        menuButton.addEventListener("click", (event) => {
            event.preventDefault();

            // Clear the original menu and display it
            this.categoryDropDownMenu.innerHTML = "";
            this.categoryDropDownMenu.style.display = "block";
            this.categoryDropDownMenu.style.left = `${event.clientX}px`;
            this.categoryDropDownMenu.style.top = `${event.clientY}px`;

            // Create rename button
            // If the category is a coral, then user can only rename the coral
            // at the healthy status
            if (
                !category.isCoral() ||
                (category.isCoral() && category.isHealthy())
            ) {
                const renameButton = document
                    .importNode(this.categoryMenuButtonTemplate.content, true)
                    .querySelector("button");
                renameButton.textContent = "Rename";
                renameButton.addEventListener("click", (event) => {
                    // When the rename button is clicked, hide the menu
                    this.categoryDropDownMenu.style.display = "none";

                    // The text label will become a input text box for user input
                    labelText.contentEditable = true;
                    labelText.focus();

                    // Select the text
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(labelText);
                    selection.removeAllRanges();
                    selection.addRange(range);
                });
                this.categoryDropDownMenu.appendChild(renameButton);
            }

            // Create delete button
            const deleteButton = document
                .importNode(this.categoryMenuButtonTemplate.content, true)
                .querySelector("button");
            deleteButton.textContent = "Delete";
            this.initDeleteButton(deleteButton, category);
            this.categoryDropDownMenu.appendChild(deleteButton);
        });

        // Handle rename
        labelText.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                this.renameCategory(labelText, category);
            }
        });
        labelText.addEventListener("blur", (event) => {
            this.renameCategory(labelText, category);
        });

        return item;
    }

    initHideCategoryButton(maskHideButton, category) {
        maskHideButton.addEventListener("click", (event) => {
            maskHideButton.classList.toggle("active");

            const value = maskHideButton.getAttribute("value");
            const newStatus = value === "1" ? 0 : 1;
            maskHideButton.setAttribute("value", newStatus);

            const core = new Core();
            const data = core.getData();
            const masks = data.getMasks();

            const shouldDisplay = newStatus === 1;
            for (const mask of masks) {
                const categoryId = mask.getCategory().getCategoryId();
                if (categoryId == category.getCategoryId()) {
                    mask.setShouldDisplay(shouldDisplay);
                }
            }

            const canvas = new Canvas();
            canvas.updateMasks();
        });

        // Activate the button based on the mask status
        const core = new Core();
        const data = core.getData();
        const masks = data.getMasks();
        for (const mask of masks) {
            const categoryId = mask.getCategory().getCategoryId();
            if (categoryId == category.getCategoryId()) {
                const shouldDisplay = mask.shouldDisplay();
                maskHideButton.classList.toggle("active", !shouldDisplay);
                maskHideButton.setAttribute("value", shouldDisplay ? 1 : 0);
                break;
            }
        }
    }

    initCategoryMenuButton(menuButton, category) {
        menuButton.addEventListener("click", (event) => {
            event.preventDefault();

            // Clear the original menu
            this.categoryDropDownMenu.innerHTML = "";

            this.categoryDropDownMenu.style.display = "block";
            this.categoryDropDownMenu.style.left = `${event.clientX}px`;
            this.categoryDropDownMenu.style.top = `${event.clientY}px`;

            // Create rename button
            // If the category is a coral, then user can only rename the coral
            // at the healthy status
            if (
                !category.isCoral() ||
                (category.isCoral() && category.isHealthy())
            ) {
                const renameButton = document
                    .importNode(this.categoryMenuButtonTemplate.content, true)
                    .querySelector("button");
                renameButton.textContent = "Rename";
                this.initRenameButton(renameButton, category);
                this.categoryDropDownMenu.appendChild(renameButton);
            }

            // Create delete button

            const deleteButton = document
                .importNode(this.categoryMenuButtonTemplate.content, true)
                .querySelector("button");
            deleteButton.textContent = "Delete";
            this.initDeleteButton(deleteButton, category);
            this.categoryDropDownMenu.appendChild(deleteButton);
        });
    }

    initRenameButton(renameButton, category) {
        renameButton.addEventListener("click", (event) => {
            event.preventDefault();

            // Rename the category
            const generalPopManager = new GeneralPopManager();
        });
    }

    initDeleteButton(deleteButton, category) {
        deleteButton.addEventListener("click", async (event) => {
            event.preventDefault();

            // Cannot delete a dead coral category
            if (category.isCoral() && category.isDead()) {
                const generalPopManager = new GeneralPopManager();
                generalPopManager.clear();
                generalPopManager.updateLargeText("Warning");
                generalPopManager.updateText(
                    "Cannot delete a dead coral category."
                );
                generalPopManager.addButton("ok", "OK", () => {
                    generalPopManager.hide();
                });
                generalPopManager.show();
            }

            // To delete a category, make sure that the category
            // is not used by any mask

            // Check is the category is used in current image
            const core = new Core();
            let imageIds = await core.getImageIdsByCategory(category);

            // If the category is a coral, also need to check
            // other status of the coral.
            const isCoral = category.isCoral();
            if (isCoral) {
                const otherStatusCategories =
                    category.getCategoriesOfOtherStatus();
                for (const otherCategory of otherStatusCategories) {
                    const otherImageIds = await core.getImageIdsByCategory(
                        otherCategory
                    );
                    for (const id of otherImageIds) {
                        imageIds.add(id);
                    }
                }
            }

            // Sort the image ids
            imageIds = Array.from(imageIds).sort();

            if (imageIds.length > 0) {
                let message = `${category.getCategoryName()} is detected in the following image ids:\n`;
                for (const id of imageIds) {
                    message += `${id}, `;
                }
                message +=
                    "\nPlease remove the annotation before deleting the category.";

                if (isCoral) {
                    message +=
                        "\n\nNote: The category is a coral. Please also remove the masks of other status of the coral.";
                }

                const generalPopManager = new GeneralPopManager();
                generalPopManager.clear();
                generalPopManager.updateLargeText("Warning");
                generalPopManager.updateText(message);
                generalPopManager.addButton("ok", "OK", () => {
                    generalPopManager.hide();
                });
                generalPopManager.show();
            } else {
                // Delete the category
                const categoryManager = new CategoryManager();

                const categoriesToDelete = [category];
                if (isCoral) {
                    // If the category is a coral, also delete the other status
                    const otherStatusCategories =
                        category.getCategoriesOfOtherStatus();
                    for (const otherCategory of otherStatusCategories) {
                        categoriesToDelete.push(otherCategory);
                    }
                }

                for (const category of categoriesToDelete) {
                    categoryManager.removeCategory(category);
                }

                this.updateCategoryButtons();

                const actionPanel = new ActionPanel();
                actionPanel.updateCategoryButtons();
            }
        });
    }

    /**
     * Rename the category based on the input
     * in the text label. <br>
     *
     * The following cases will not rename the category:
     * - The input is empty
     * - If the category is a coral, the input starts with "Bleached"
     * @param {HTMLParagraphElement} textLabel
     * @param {Category} category
     */
    renameCategory(textLabel, category) {
        // Change the input text to a normal text
        textLabel.contentEditable = false;

        const newName = textLabel.innerHTML;

        // Check if the input is empty
        if (newName.length === 0) {
            const generalPopManager = new GeneralPopManager();
            generalPopManager.clear();
            generalPopManager.updateLargeText("Warning");
            generalPopManager.updateText("The category name cannot be empty.");
            generalPopManager.addButton("ok", "OK", () => {
                generalPopManager.hide();
            });
            generalPopManager.show();
            return;
        }

        // Check if the input starts with "Bleached"
        if (
            category.isCoral() &&
            newName.toLowerCase().startsWith("bleached")
        ) {
            const generalPopManager = new GeneralPopManager();
            generalPopManager.clear();
            generalPopManager.updateLargeText("Warning");
            generalPopManager.updateText(
                "The category name cannot start with 'Bleached'."
            );
            generalPopManager.addButton("ok", "OK", () => {
                generalPopManager.hide();
            });
            generalPopManager.show();
            return;
        }

        // Rename the category
        const categoryManager = new CategoryManager();
        categoryManager.renameCategory(category, newName);

        this.updateCategoryButtons();

        const actionPanel = new ActionPanel();
        actionPanel.updateCategoryButtons();
    }

    getCurrentType() {
        return this.currentType;
    }
}
