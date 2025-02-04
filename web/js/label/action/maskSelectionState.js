import { ActionState } from "./actionState.js";
import { Core } from "../core.js";
import { MaskSelector } from "../maskSelector.js";
import { Canvas } from "../canvas.js";

export class MaskSelectionState extends ActionState {
    constructor(context) {
        super(context);

        this.core = new Core();
        this.maskSelector = new MaskSelector();
        this.canvas = new Canvas();
    }

    /**
     * Do nothing
     * @param {number} imageX
     * @param {number} imageY
     */
    rightClickPixel(imageX, imageY) {}

    /**
     * Check is any mask is clicked.
     * If clicked, toggle the mask selection
     * @param {number} imageX
     * @param {number} imageY
     */
    leftClickPixel(imageX, imageY) {
        const data = this.core.getData();
        const masks = data.getMasks();
        for (const mask of masks) {
            if (mask.containPixel(imageX, imageY)) {
                if (this.maskSelector.isSelected(mask)) {
                    this.maskSelector.unselectMask(mask);
                } else {
                    this.maskSelector.selectMask(mask);
                }
            }
        }
        this.canvas.updateMasks();
    }
}
