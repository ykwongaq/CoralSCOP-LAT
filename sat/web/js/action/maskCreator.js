import { Category, Mask } from "../data/index.js";
import { Manager } from "../manager.js";

export class Prompt {
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
    s;

    toJson() {
        return {
            imageX: this.imageX,
            imageY: this.imageY,
            label: this.label,
        };
    }
}

export class MaskCreator {
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
        const manager = new Manager();
        const canvas = manager
            .getToolInterface()
            .getAnnotationPage()
            .getCanvas();

        if (this.prompts.length === 0) {
            canvas.showPromptedMask(null, this.prompts);
            return;
        }

        const core = manager.getCore();
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
        const manager = new Manager();
        const actionPanel = manager
            .getToolInterface()
            .getAnnotationPage()
            .getActionPanel();
        const promptCategorySelector = actionPanel.getPromptCategorySelector();
        const selectedCategory = promptCategorySelector.getSelectedCategory();
        if (selectedCategory) {
            this.mask.setCategory(selectedCategory);
        } else {
            const category = new Category(Category.PREDICTED_CORAL_ID);
            this.mask.setCategory(category);
        }

        // Record data
        const core = manager.getCore();
        core.recordData();

        // Add the mask into the data
        const data = core.getData();
        data.addMask(this.mask);
        this.mask.setModified(true);

        // Update the visualization of canvas
        const canvas = manager
            .getToolInterface()
            .getAnnotationPage()
            .getCanvas();
        canvas.updateMasks();

        this.clearPrompts();
    }
}
