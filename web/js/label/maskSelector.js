class MaskSelector {
    constructor() {
        if (MaskSelector.instance) {
            return MaskSelector.instance;
        }
        MaskSelector.instance = this;

        this.selectedMasks = new Set();
    }

    /**
     * Select the given mask
     * @param {Mask} mask
     */
    selectMask(mask) {
        this.selectedMasks.add(mask);
    }

    /**
     * Remove the given mask from the selected masks
     * @param {Mask} mask
     */
    unselectMask(mask) {
        if (this.selectedMasks.has(mask)) {
            this.selectedMasks.delete(mask);
        }
    }

    getSelectedMasks() {
        return this.selectedMasks;
    }

    isSelected(mask) {
        return this.selectedMasks.has(mask);
    }

    clearSelection() {
        this.selectedMasks.clear();
    }
}
