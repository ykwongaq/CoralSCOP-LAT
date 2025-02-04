import { Canvas } from "../canvas.js";
import { ActionState } from "./actionState.js";
import { Quadrat } from "../complexity/quadrat.js";
import { Core } from "../core.js";

export class QuadratCreationState extends ActionState {
    constructor(context) {
        super(context);
        this.canvas = new Canvas();
    }

    mouseDownPixel(imageX, imageY) {
        this.canvas.setIsSelectingRectangle(true);
        this.canvas.setStartRectPixel(imageX, imageY);
        this.canvas.setEndRectPixel(imageX, imageY);
    }

    mosueDownPixel(imageX, imageY) {
        if (!this.canvas.getIsSelectingRectangle()) {
            return;
        }
        this.canvas.setEndRectPixel(imageX, imageY);
    }

    mouseUpPixel(imageX, imageY) {
        this.canvas.setEndRectPixel(imageX, imageY);
        this.canvas.setIsSelectingRectangle(false);
        const [startImageX, startImageY] = this.canvas.getStartRectPixel();
        const [endImageX, endImageY] = this.canvas.getEndRectPixel();

        const quadrat = new Quadrat(
            startImageX,
            startImageY,
            endImageX,
            endImageY
        );

        const core = new Core();
        core.setQuadrat(quadrat);
    }
}
