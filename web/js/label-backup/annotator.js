class Annotator {
    static LABEL_MASK = 0;
    static ADD_MASK = 1;
    static DELETE_MASK = 2;

    static currentMode = Annotator.LABEL_MASK;

    static selectedMasks = [];

    static selectMask(mask) {
        mask.setColor(LabelManager.selectedColor);
        this.selectedMasks.push(mask);
        const canvas = new Canvas(null);
        canvas.updateMasks();
    }

    static setMode(mode) {
        Annotator.currentMode = mode;
    }

    static getCurrentMode() {
        return Annotator.currentMode;
    }

    static deselectMask(mask) {
        const color = LabelManager.getColorById(mask.getCategoryId());
        mask.setColor(color);
        this.selectedMasks = this.selectedMasks.filter((m) => m !== mask);
        const canvas = new Canvas(null);
        canvas.updateMasks();
    }

    static clearSelection() {
        for (const mask of this.selectedMasks) {
            const color = LabelManager.getColorById(mask.getCategoryId());
            mask.setColor(color);
        }
        this.selectedMasks = [];

        const canvas = new Canvas();
        canvas.updateMasks();
    }

    static getSelectedMasks() {
        return this.selectedMasks;
    }

    static isMaskSelected(mask) {
        return this.selectedMasks.includes(mask);
    }
}
