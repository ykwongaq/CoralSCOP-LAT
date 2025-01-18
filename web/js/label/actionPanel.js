class ActionPanel {
    constructor(actionPanel, actionContainerDom) {
        if (ActionPanel.instance) {
            return ActionPanel.instance;
        }
        ActionPanel.instance = this;

        this.actionPanelDom = actionPanel;
        this.actionContainerDom = actionContainerDom;
        this.colorSelectionContainer = this.actionPanelDom.querySelector(
            "#color-selection-container"
        );
        this.selectedLabelColor = this.actionPanelDom.querySelector(
            "#selected-label-color"
        );
        this.labelSmallButtonTemplate = this.actionPanelDom.querySelector(
            "#label-small-btn-template"
        );
        this.labelToggleButton = this.actionPanelDom.querySelector(
            "#assign-label-toggle-button"
        );

        this.removeButton = this.actionPanelDom.querySelector("#remove-button");

        this.addMaskButton =
            this.actionPanelDom.querySelector("#add-mask-button");
        this.confirmPromptButton =
            this.actionContainerDom.querySelector("#confirm-button");
        this.undoPromptButton =
            this.actionContainerDom.querySelector("#undo-button");
        this.resetPromptButton =
            this.actionContainerDom.querySelector("#reset-button");
        this.backButton = this.actionContainerDom.querySelector(
            "#back-to-edit-mode-btn"
        );

        return this;
    }

    init() {
        this.initLabelToggleButton();
        this.initRemoveButton();
        this.initAddMask();
        this.initBackButton();
    }

    initLabelToggleButton() {
        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(
            ActionManager.DEFAULT_STATE,
            "c",
            (event) => {
                const labelPanel = new LabelPanel();
                this.labelToggleButton.click();
            }
        );
        document.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if (key === "c") {
                actionManager.handleShortCut(key, event);
            }
        });
    }

    initRemoveButton() {
        this.removeButton.addEventListener("click", () => {
            // Get the selected masks
            const maskSelector = new MaskSelector();
            const selectedMasks = maskSelector.getSelectedMasks();

            // Remove the selected masks
            const core = new Core();
            const data = core.getData();
            for (const mask of selectedMasks) {
                data.removeMask(mask);
            }

            // Clear the selection
            maskSelector.clearSelection();

            // Visualize the updated results
            const canvas = new Canvas();
            canvas.updateMasks();
        });

        // Add shortcut the remove button
        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(
            ActionManager.DEFAULT_STATE,
            "r",
            (event) => {
                const labelPanel = new LabelPanel();
                this.removeButton.click();
            }
        );
        document.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if (key === "r") {
                actionManager.handleShortCut(key, event);
            }
        });
    }

    initAddMask() {
        this.addMaskButton.addEventListener("click", () => {
            this.showAddMaskActionButtons();

            const actionManager = new ActionManager();
            actionManager.setState(ActionManager.STATE_CREATE_MASK);

            const maskSelector = new MaskSelector();
            maskSelector.clearSelection();

            this.hide();
        });

        this.undoPromptButton.addEventListener("click", () => {
            const maskCreator = new MaskCreator();
            maskCreator.undoPrompt();
        });

        this.resetPromptButton.addEventListener("click", () => {
            const maskCreator = new MaskCreator();
            maskCreator.clearPrompts();
        });

        this.confirmPromptButton.addEventListener("click", () => {
            const maskCreator = new MaskCreator();
            maskCreator.confirmPrompt();
        });

        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(
            ActionManager.STATE_CREATE_MASK,
            "Control+z",
            (event) => {
                const labelPanel = new LabelPanel();
                this.undoPromptButton.click();
            }
        );
        actionManager.registerShortCut(
            ActionManager.STATE_CREATE_MASK,
            "r",
            (event) => {
                const labelPanel = new LabelPanel();
                this.resetPromptButton.click();
            }
        );
        actionManager.registerShortCut(
            ActionManager.STATE_CREATE_MASK,
            " ",
            (event) => {
                this.confirmPromptButton.click();
            }
        );

        document.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if (key === "z" && event.ctrlKey) {
                actionManager.handleShortCut("Control+Z", event);
            }
        });

        document.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if (key === "r") {
                actionManager.handleShortCut("r", event);
            }
        });

        document.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if (key === " ") {
                actionManager.handleShortCut(" ", event);
            }
        });
    }

    initBackButton() {
        this.backButton.addEventListener("click", () => {
            // Clear the mask creation prompts
            const maskCreator = new MaskCreator();
            maskCreator.clearPrompts();

            this.hideAddMaskActionButtons();
            this.show();

            const actionManager = new ActionManager();
            actionManager.setState(ActionManager.STATE_SELECT_MASK);

            const maskSelector = new MaskSelector();
            maskSelector.clearSelection();
        });
    }

    hide() {
        this.actionPanelDom.classList.add("hidden");
    }

    show() {
        this.actionPanelDom.classList.remove("hidden");
    }

    showAddMaskActionButtons() {
        this.undoPromptButton.classList.remove("hidden");
        this.resetPromptButton.classList.remove("hidden");
        this.confirmPromptButton.classList.remove("hidden");
    }

    hideAddMaskActionButtons() {
        this.undoPromptButton.classList.add("hidden");
        this.resetPromptButton.classList.add("hidden");
        this.confirmPromptButton.classList.add("hidden");
    }

    updateCategoryButtons() {
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
            this.colorSelectionContainer.appendChild(button);
        }
    }

    clearCategoryButtons() {
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

        colorBoxSmallButton.addEventListener("click", () => {
            // Assign category to the selected masks
            const maskSelector = new MaskSelector();
            const selectedMasks = maskSelector.getSelectedMasks();
            for (const mask of selectedMasks) {
                mask.setCategory(category);
            }
            maskSelector.clearSelection();

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
