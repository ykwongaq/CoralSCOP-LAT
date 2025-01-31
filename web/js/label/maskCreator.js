class Prompt {
    static POSITIVE = 1;
    static NEGATIVE = 0;

    static POSTIVE_COLOR = "#00FF00";
    static NEGATIVE_COLOR = "#FF0000";

    constructor(imageX, imageY, label) {
        this.imageX = imageX;
        this.imageY = imageY;
        this.label = label;
    }

    getPointColor() {
        switch (this.label) {
            case Prompt.POSITIVE:
                return Prompt.POSTIVE_COLOR;
            case Prompt.NEGATIVE:
                return Prompt.NEGATIVE_COLOR;
        }
    }

    getImageX() {
        return this.imageX;
    }

    getImageY() {
        return this.imageY;
    }

    toJson() {
        return {
            imageX: this.imageX,
            imageY: this.imageY,
            label: this.label,
        };
    }
}

class MaskCreator {
    constructor() {
        if (MaskCreator.instance) {
            return MaskCreator.instance;
        }
        MaskCreator.instance = this;

        this.prompts = [];
        this.mask = null;
    }

    addPrompt(imageX, imageY, label) {
        this.prompts.push(new Prompt(imageX, imageY, label));
        this.updateMask();
    }

    clearPrompts() {
        this.prompts = [];
        this.mask = null;
        this.updateMask();
    }

    undoPrompt() {
        this.prompts.pop();
        this.updateMask();
    }

    /**
     * Update the mask based on the prompts.
     * Meanwhile, visualize the mask on the canvas.
     * @returns {Mask} Updated mask
     */
    updateMask() {
        const canvas = new Canvas();

        if (this.prompts.length === 0) {
            canvas.showPromptedMask(null, this.prompts);
            return;
        }

        const core = new Core();
        core.createPromptedMask(this.prompts, (annotation) => {
            this.mask = new Mask(annotation);
            canvas.showPromptedMask(this.mask, this.prompts);
        });
    }

    /**
     * Confirm the current mask and add it into the data.
     * After that, clear the prompts.
     */
    confirmPrompt() {
        if (this.mask === null) {
            return;
        }

        // Check is user select the prompt mask category
        const actionPanel = new ActionPanel();
        const promptCategorySelector = actionPanel.getPromptCategorySelector();
        const selectedCategory = promptCategorySelector.getSelectedCategory();
        if (selectedCategory) {
            this.mask.setCategory(selectedCategory);
        }

        // Record data
        const core = new Core();
        core.recordData();

        // Add the mask into the data
        const data = core.getData();
        data.addMask(this.mask);

        // Update the visualization of canvas
        const canvas = new Canvas();
        canvas.updateMasks();

        this.clearPrompts();
    }
}
