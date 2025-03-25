import { ActionState } from "./actionState.js";
import { MaskSelector } from "./maskSelector.js";
import { Manager } from "../manager.js";
import { Rectangle } from "../util/rectangle.js";
import { calDistance } from "../util/distance.js";

export class MaskSelectionState extends ActionState {
    constructor(context) {
        super(context);

        this.draggingDistance = 5;
        this.isDragging = false;
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
        if (this.isDragging) {
            return;
        }
        const manager = new Manager();
        const core = manager.getCore();
        const data = core.getData();
        const masks = data.getMasks();

        const maskSelector = new MaskSelector();
        for (const mask of masks) {
            if (mask.containPixel(imageX, imageY)) {
                if (maskSelector.isSelected(mask)) {
                    maskSelector.unselectMask(mask);
                } else {
                    maskSelector.selectMask(mask);
                }
                mask.setModified(true);
            }
        }

        const canvas = manager
            .getToolInterface()
            .getAnnotationPage()
            .getCanvas();
        canvas.updateMasks();
    }

    mouseDownPixel(imageX, imageY) {
        const manager = new Manager();
        const canvas = manager
            .getToolInterface()
            .getAnnotationPage()
            .getCanvas();
        canvas.setIsSelectingRectangle(true);
        canvas.setStartRectPixel(imageX, imageY);
        canvas.setEndRectPixel(imageX, imageY);
    }

    mouseMovePixel(imageX, imageY) {
        const manager = new Manager();
        const canvas = manager
            .getToolInterface()
            .getAnnotationPage()
            .getCanvas();
        if (!canvas.getIsSelectingRectangle()) {
            return;
        }
        canvas.setEndRectPixel(imageX, imageY);

        if (canvas.getIsSelectingRectangle()) {
            const startPixel = canvas.getStartRectPixel();
            const endPixel = canvas.getEndRectPixel();
            const distance = calDistance(
                startPixel[0],
                startPixel[1],
                endPixel[0],
                endPixel[1]
            );

            if (distance > this.draggingDistance) {
                this.isDragging = true;
            } else {
                this.isDragging = false;
            }
        }
    }

    mouseUpPixel(imageX, imageY) {
        const manager = new Manager();
        const canvas = manager
            .getToolInterface()
            .getAnnotationPage()
            .getCanvas();
        canvas.setEndRectPixel(imageX, imageY);
        canvas.setIsSelectingRectangle(false);
        const [startImageX, startImageY] = canvas.getStartRectPixel();
        const [endImageX, endImageY] = canvas.getEndRectPixel();
        const distance = calDistance(
            startImageX,
            startImageY,
            endImageX,
            endImageY
        );
        if (!this.isDragging || distance < this.draggingDistance) {
            this.isDragging = false;
            return;
        }

        const rectangle = new Rectangle(
            startImageX,
            startImageY,
            endImageX,
            endImageY
        );

        const maskSelected = new Set();

        // Fast check if the rectangle intersect with any mask bounding box
        const masksToCheck = new Set();
        const core = manager.getCore();
        const data = core.getData();
        for (const mask of data.getMasks()) {
            const bondingBox = mask.getBoundingBox();
            const maskRectangle = new Rectangle(
                bondingBox[0],
                bondingBox[1],
                bondingBox[0] + bondingBox[2],
                bondingBox[1] + bondingBox[3]
            );

            // If the mask bounding box is totally inside the drawn rectangle
            // then the mask is direclty selected
            if (maskRectangle.isInside(rectangle)) {
                maskSelected.add(mask);
                continue;
            }

            // If they are just intersect, then we need to check the pixel by pixel
            if (Rectangle.isIntersect(rectangle, maskRectangle)) {
                masksToCheck.add(mask);
            }
        }

        // Then precisely check if the rectangle intersect with any mask by pixel
        const rectanglePixels = [];
        for (let x = rectangle.getX1(); x < rectangle.getX2(); x++) {
            for (let y = rectangle.getY1(); y < rectangle.getY2(); y++) {
                rectanglePixels.push([x, y]);
            }
        }

        const maskSelector = new MaskSelector();
        for (const mask of masksToCheck) {
            for (const pixel of rectanglePixels) {
                const [x, y] = pixel;
                if (mask.containPixel(x, y)) {
                    maskSelected.add(mask);
                    break;
                }
            }
        }

        if (maskSelected.size === 0) {
            return;
        }

        for (const mask of maskSelected) {
            if (maskSelector.isSelected(mask)) {
                maskSelector.unselectMask(mask);
            } else {
                maskSelector.selectMask(mask);
            }
            mask.setModified(true);
        }

        canvas.updateMasks();
    }
}
