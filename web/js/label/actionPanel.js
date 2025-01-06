class ActionPanel {
    constructor(dom) {
        if (ActionPanel.instance) {
            return ActionPanel.instance;
        }
        ActionPanel.instance = this;

        this.dom = dom;
        this.colorSelectionContainer = this.dom.querySelector(
            "#color-selection-container"
        );
        this.selectedLabelColor = this.dom.querySelector(
            "#selected-label-color"
        );
        this.labelSmallButtonTemplate = this.dom.querySelector(
            "#label-small-btn-template"
        );

        return this;
    }

    init() {}

    updateButtons() {
        this.clearButtons();
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
            this.colorSelectionContainer.appendChild(button);
        }
    }

    clearButtons() {
        this.colorSelectionContainer.innerHTML = "";
    }

    /**
     * Create a category button based on the given category
     * @param {Category} category
     * @returns {HTMLDivElement} labelSmallButton
     */
    createCategoryButton(category) {
        const labelSmallButton = document.importNode(
            this.labelSmallButtonTemplate.content,
            true
        );
        const colorBoxSmallButton = labelSmallButton.querySelector(".colorBox");
        const labelTextSmallButton =
            labelSmallButton.querySelector(".labelText");

        const maskColor = category.getMaskColor();
        const borderColor = category.getBorderColor();
        const textColor = category.getTextColor();
        colorBoxSmallButton.style.backgroundColor = maskColor;
        colorBoxSmallButton.style.borderColor = borderColor;
        labelTextSmallButton.innerHTML = category.getIconName();
        labelTextSmallButton.style.color = textColor;

        labelSmallButton.addEventListener("click", () => {
            // Assign category to the selected masks
            const maskSelector = new MaskSelector();
            const selectedMasks = maskSelector.getSelectedMasks();
            for (const mask of selectedMasks) {
                mask.setCategory(category);
            }

            // Update canvas visualization
            const canvas = new Canvas();
            canvas.updateMasks();

            const toggleFn = colorBoxSmallButton.closest(".toggle-fn");
            if (toggleFn && toggleFn.ToggleInput) {
                toggleFn.ToggleInput._hide();
            }
        });

        return labelSmallButton;
    }
}
