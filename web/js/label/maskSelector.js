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
    selectedMask(mask) {
        this.selectedMasks.add(mask);
    }

    getSelectedMasks() {
        return this.selectedMasks;
    }

    clearSelection() {
        this.selectedMasks.clear();
    }
}
