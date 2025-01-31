class ActionPanel {
    constructor(actionPanel, actionContainerDom) {
        if (ActionPanel.instance) {
            return ActionPanel.instance;
        }
        ActionPanel.instance = this;

        this.actionPanelDom = actionPanel;
        this.actionContainerDom = actionContainerDom;

        this.categorySelectorDom =
            this.actionPanelDom.querySelector("#category-selector");
        this.labelSmallButtonTemplate = this.actionPanelDom.querySelector(
            "#label-small-btn-template"
        );
        this.categorySelector = new CategorySelector(
            this.categorySelectorDom,
            this.labelSmallButtonTemplate
        );

        this.removeButton = this.actionPanelDom.querySelector("#remove-button");

        this.promptCategorySelectorDom = this.actionContainerDom.querySelector(
            "#category-selector-prompt"
        );
        this.promptCategorySelector = new CategorySelector(
            this.promptCategorySelectorDom,
            this.labelSmallButtonTemplate
        );

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

        this.undoButton = this.actionPanelDom.querySelector("#undo-button");
        this.redoButton = this.actionPanelDom.querySelector("#redo-button");

        return this;
    }

    init() {
        // this.initLabelToggleButton();
        this.initCategorySelector();
        this.initPromptCategorySelector();
        this.initRemoveButton();
        this.initAddMask();
        this.initBackButton();
        this.initUndoButton();
        this.initRedoButton();
    }

    initCategorySelector() {
        const toggleButton = this.categorySelector.getToggleButton();

        this.categorySelector.addCategorySelectionCallback((category) => {
            // Assign category to the selected masks
            const maskSelector = new MaskSelector();
            const selectedMasks = maskSelector.getSelectedMasks();

            if (selectedMasks.size > 0) {
                // Save record
                const core = new Core();
                core.recordData();
            }

            for (const mask of selectedMasks) {
                mask.setCategory(category);
            }
            maskSelector.clearSelection();

            // Update canvas visualization
            const canvas = new Canvas();
            canvas.updateMasks();
        });

        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(
            ActionManager.DEFAULT_STATE,
            "c",
            (event) => {
                toggleButton.click();
            }
        );
        document.addEventListener("keydown", (event) => {
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "c") {
                actionManager.handleShortCut(key, event);
                actionManager.addRegisteredDocumentEvent(event);
            }
        });
    }

    initPromptCategorySelector() {
        const toggleButton = this.promptCategorySelector.getToggleButton();

        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(
            ActionManager.STATE_CREATE_MASK,
            "c",
            (event) => {
                toggleButton.click();
            }
        );
        document.addEventListener("keydown", (event) => {
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "c") {
                actionManager.handleShortCut(key, event);
                actionManager.addRegisteredDocumentEvent(event);
            }
        });
    }

    initRemoveButton() {
        this.removeButton.addEventListener("click", () => {
            // Get the selected masks
            const maskSelector = new MaskSelector();
            const selectedMasks = maskSelector.getSelectedMasks();

            if (selectedMasks.size > 0) {
                // Record the data
                const core = new Core();
                core.recordData();
            }

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
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "r") {
                actionManager.handleShortCut(key, event);
                actionManager.addRegisteredDocumentEvent(event);
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

            const canvas = new Canvas();
            canvas.updateMasks();

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
            "control+z",
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
        actionManager.registerShortCut(
            ActionManager.DEFAULT_STATE,
            "w",
            (event) => {
                this.addMaskButton.click();
            }
        );
        actionManager.registerShortCut(
            ActionManager.STATE_CREATE_MASK,
            "w",
            (event) => {
                this.backButton.click();
            }
        );

        document.addEventListener("keydown", (event) => {
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "z" && event.ctrlKey) {
                actionManager.handleShortCut("control+z", event);
                actionManager.addRegisteredDocumentEvent(event);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "r") {
                actionManager.handleShortCut("r", event);
                actionManager.addRegisteredDocumentEvent(event);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === " ") {
                actionManager.handleShortCut(" ", event);
                actionManager.addRegisteredDocumentEvent(event);
            }
        });
        document.addEventListener("keydown", (event) => {
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "w") {
                actionManager.handleShortCut("e", event);
                actionManager.addRegisteredDocumentEvent(event);
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

    initUndoButton() {
        this.undoButton.addEventListener("click", () => {
            const core = new Core();
            core.undo();
        });

        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(
            ActionManager.DEFAULT_STATE,
            "control+z",
            (event) => {
                this.undoButton.click();
            }
        );
        document.addEventListener("keydown", (event) => {
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "z" && event.ctrlKey) {
                actionManager.handleShortCut("control+z", event);
                actionManager.addRegisteredDocumentEvent(event);
            }
        });
    }

    initRedoButton() {
        this.redoButton.addEventListener("click", () => {
            const core = new Core();
            core.redo();
        });

        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(
            ActionManager.DEFAULT_STATE,
            "control+y",
            (event) => {
                this.redoButton.click();
            }
        );
        document.addEventListener("keydown", (event) => {
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "y" && event.ctrlKey) {
                actionManager.handleShortCut("control+y", event);
                actionManager.addRegisteredDocumentEvent(event);
            }
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
        this.categorySelector.updateCategoryButtons();
        this.promptCategorySelector.updateCategoryButtons([new Category(-1)]);
    }

    getCategorySelector() {
        return this.categorySelector;
    }

    getPromptCategorySelector() {
        return this.promptCategorySelector;
    }
}
