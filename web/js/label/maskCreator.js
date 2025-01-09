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
        this.showPromptingMask();
    }

    clearPrompts() {
        this.prompts = [];
        this.mask = null;
        this.showPromptingMask();
    }

    undoPrompt() {
        this.prompts.pop();
        this.showPromptingMask();
    }

    showPromptingMask() {
        const canvas = new Canvas();

        if (this.prompts.length === 0) {
            canvas.showPromptedMask(null, this.prompts);
            return;
        }

        const core = new Core();
        core.createPromptedMask(this.prompts).then((annotation) => {
            this.mask = new Mask(annotation);

            canvas.showPromptedMask(this.mask, this.prompts);
        });
    }

    confirmPrompt() {}
}
