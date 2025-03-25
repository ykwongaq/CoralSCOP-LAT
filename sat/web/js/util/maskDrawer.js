import { Mask, Data } from "../data/index.js";
import { hexToRGB } from "./color.js";

export class MaskDrawer {
    constructor(optimized = true) {
        /** @type {Set<Mask>}*/
        this.previousMasks = new Set();
        /** @type {Mask[]} */
        this.incomingMasks = [];

        this.width = null;
        this.height = null;

        this.maskCanvas = document.createElement("canvas");
        this.maskCtx = this.maskCanvas.getContext("2d", {
            willReadFrequently: true,
        });
        this.borderCanvas = document.createElement("canvas");
        this.borderCtx = this.borderCanvas.getContext("2d");
        this.textCanvas = document.createElement("canvas");
        this.textCtx = this.textCanvas.getContext("2d");

        this.optimized = optimized;
    }

    clearMemory() {
        this.previousMasks.clear();
    }

    clear() {
        // By re-assiging the width, the canvas will be cleared
        this.maskCanvas.width = this.maskCanvas.width;
        this.borderCanvas.width = this.borderCanvas.width;
        this.textCanvas.width = this.textCanvas.width;
        this.width = null;
        this.height = null;
        this.previousMasks.clear();
        this.incomingMasks = [];
    }

    setHeight(height) {
        this.height = height;
        this.maskCanvas.height = height;
        this.borderCanvas.height = height;
        this.textCanvas.height = height;
    }

    setWidth(width) {
        this.width = width;
        this.maskCanvas.width = width;
        this.borderCanvas.width = width;
        this.textCanvas.width = width;
    }

    /**
     * Update the visualization of segmentation masks. <br/>
     *
     * Visualization include the segmentation area, boundary, and text. <br/>
     *
     * To improve the efficiency, we only update the visualization of the modified masks. <br/>
     */
    updateMasks(incomingMasks) {
        this.incomingMasks = incomingMasks;

        if (this.optimized) {
            this.updateMaskOptimized();
        } else {
            // Clear all the canvas, and draw all the masks
            this.maskCtx.clearRect(0, 0, this.width, this.height);
            this.borderCtx.clearRect(0, 0, this.width, this.height);
            this.textCtx.clearRect(0, 0, this.width, this.height);

            for (const mask of this.incomingMasks) {
                this.drawMask(mask);
            }
        }

        this.incomingMasks = [];
    }

    updateMaskOptimized() {
        // First, we remove the outdated masks
        const outdatedMasks = this.detectedOutdatedMasks();

        // We also remove the masks that should not be displayed
        for (const mask of this.incomingMasks) {
            if (!mask.shouldDisplay()) {
                outdatedMasks.add(mask);
            }
        }

        for (const mask of outdatedMasks) {
            this.removeMask(mask);
        }

        // Then, we update the modified masks
        const renderMasks = this.detectRenderMasks();
        for (const mask of renderMasks) {
            this.drawMask(mask);
        }

        this.previousMasks.clear();
        for (const mask of this.incomingMasks) {
            this.previousMasks.add(mask);
        }
    }

    getMaskCanvas() {
        return this.maskCanvas;
    }

    getBorderCanvas() {
        return this.borderCanvas;
    }

    getTextCanvas() {
        return this.textCanvas;
    }

    /**
     * Detect the outdated masks. <br/>
     * @returns {Set<Mask>} The list of outdated masks
     */
    detectedOutdatedMasks() {
        // There are three type of modification: add, delete, and update
        // Outdated masks is the masks that is updated, and deleted
        const outdatedMasks = new Set();

        // Detect updated masks
        for (const mask of this.previousMasks) {
            if (mask.isModified()) {
                outdatedMasks.add(mask);
            }
        }

        // Detect deleted masks
        // For deleted masks, we detect is there any mask that is not included in the incoming masks
        for (const mask of this.previousMasks) {
            if (!this.incomingMasks.includes(mask)) {
                outdatedMasks.add(mask);
            }
        }

        return outdatedMasks;
    }

    detectRenderMasks() {
        // There are three type of modificaiton: add, delete, and update
        // Masks that need to render is the masks that is added, and updated.
        const modifiedMasks = new Set();

        // Detect updated maks
        for (const mask of this.incomingMasks) {
            if (mask.isModified()) {
                modifiedMasks.add(mask);
            }
        }

        // Detect added masks
        for (const mask of this.incomingMasks) {
            if (!this.previousMasks.has(mask)) {
                modifiedMasks.add(mask);
            }
        }

        // For add masks, we detect is there any new mask that is not included in the
        return modifiedMasks;
    }

    /**
     * Simple helper for drawing a small circle (dot) on the border canvas.
     */
    drawDot(ctx, x, y, radius, color) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();
    }

    removeDot(ctx, x, y, radius) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }

    removeMask(mask) {
        this.removeSegmentationArea(mask);
        this.removeBorder(mask);
        this.removeText(mask);
    }

    removeSegmentationArea(mask) {
        const width = this.width;
        const height = this.height;

        const maskData = mask.getDecodedMask();

        const imageData = this.maskCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const includedPixel = new Set();
        for (let i = 0; i < maskData.length; i++) {
            const maskValue = maskData[i];
            if (maskValue == 0) {
                continue;
            }

            includedPixel.add(i);

            const index = i * 4;
            data[index] = 0;
            data[index + 1] = 0;
            data[index + 2] = 0;
            data[index + 3] = 0; // fully transparent
        }
        this.maskCtx.putImageData(imageData, 0, 0);

        // Check is there any other mask that is affected by this removal
        const affectedMasks = new Set();
        for (const otherMask of this.incomingMasks) {
            if (otherMask === mask) {
                continue;
            }
            for (const i of includedPixel) {
                if (otherMask.containPixel(i % width, (i / width) | 0)) {
                    affectedMasks.add(otherMask);
                }
            }
        }

        // When there are affected masks, we need to redraw the segmentation area
        for (const affectedMask of affectedMasks) {
            this.drawSegmentationArea(affectedMask);
        }
    }

    removeBorder(mask) {
        const width = this.width;
        const height = this.height;
        const maskData = mask.getDecodedMask(); // Uint8Array of 0/1
        const radius = Math.min(width, height) * 0.0015;

        const borderPixels = new Set();
        const affectedMasks = new Set();
        for (let i = 0; i < maskData.length; i++) {
            if (maskData[i] === 1) {
                const x = i % width;
                const y = (i / width) | 0;

                if (
                    (x > 0 && maskData[i - 1] === 0) ||
                    (x < width - 1 && maskData[i + 1] === 0) ||
                    (y > 0 && maskData[i - width] === 0) ||
                    (y < height - 1 && maskData[i + width] === 0)
                ) {
                    this.removeDot(this.borderCtx, x, y, radius * 1.3);
                    borderPixels.add(i);
                }
            }
        }

        // Check is there any other mask that is affected by this removal
        for (const otherMask of this.incomingMasks) {
            if (otherMask === mask) {
                continue;
            }
            for (const i of borderPixels) {
                if (otherMask.containPixel(i % width, (i / width) | 0)) {
                    affectedMasks.add(otherMask);
                }
            }
        }

        // When there are affected masks, we need to redraw the border
        for (const affectedMask of affectedMasks) {
            this.drawBorder(affectedMask);
        }
    }

    removeText(mask) {
        const middle_pixel = mask.getMiddlePoint();
        const width = this.width;
        const height = this.height;

        const fontSize = Math.min(
            Math.floor(Math.min(width, height) * 0.04),
            40
        );
        const fontBgRadius = fontSize * 0.75;

        this.removeDot(
            this.textCtx,
            middle_pixel[0] + fontBgRadius / 2,
            middle_pixel[1] - fontBgRadius / 2,
            fontBgRadius * 1.3
        );

        const affectedMasks = new Set();
        for (const otherMask of this.incomingMasks) {
            if (otherMask === mask) {
                continue;
            }

            const otherMiddlePixel = otherMask.getMiddlePoint();
            const dx = middle_pixel[0] + fontBgRadius / 2 - otherMiddlePixel[0];
            const dy = middle_pixel[1] - fontBgRadius / 2 - otherMiddlePixel[1];
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= fontBgRadius) {
                affectedMasks.add(otherMask);
            }
        }

        for (const affectedMask of affectedMasks) {
            this.drawText(affectedMask);
        }
    }

    drawMask(mask) {
        this.drawSegmentationArea(mask);
        this.drawBorder(mask);
        this.drawText(mask);
    }

    drawSegmentationArea(mask) {
        const width = this.width;
        const height = this.height;

        const maskData = mask.getDecodedMask();

        const maskColor = hexToRGB(mask.getMaskColor());

        const imageData = this.maskCtx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < maskData.length; i++) {
            const maskValue = maskData[i];
            if (maskValue == 0) {
                continue;
            }

            const index = i * 4;
            data[index] = maskColor[0];
            data[index + 1] = maskColor[1];
            data[index + 2] = maskColor[2];
            data[index + 3] = 255; // fully opaque
        }

        this.maskCtx.putImageData(imageData, 0, 0);
    }

    drawBorder(mask) {
        const width = this.width;
        const height = this.height;
        const maskData = mask.getDecodedMask(); // Uint8Array of 0/1
        const radius = Math.min(width, height) * 0.0015;

        for (let i = 0; i < maskData.length; i++) {
            if (maskData[i] === 1) {
                const x = i % width;
                const y = (i / width) | 0;

                if (
                    (x > 0 && maskData[i - 1] === 0) ||
                    (x < width - 1 && maskData[i + 1] === 0) ||
                    (y > 0 && maskData[i - width] === 0) ||
                    (y < height - 1 && maskData[i + width] === 0)
                ) {
                    this.drawDot(
                        this.borderCtx,
                        x,
                        y,
                        radius,
                        mask.getCategory().getBorderColor()
                    );
                }
            }
        }
    }

    drawText(mask) {
        const middle_pixel = mask.getMiddlePoint();
        const category = mask.getCategory();
        const label_id = category.getCategoryId();
        const color = category.getMaskColor();
        const fontColor = category.getTextColor();
        const width = this.width;
        const height = this.height;

        if (label_id === -1) {
            return;
        }

        const fontSize = Math.min(
            Math.floor(Math.min(width, height) * 0.04),
            40
        );
        const fontBgRadius = fontSize * 0.7;

        this.textCtx.beginPath();
        this.textCtx.arc(
            middle_pixel[0] + fontBgRadius / 2,
            middle_pixel[1] - fontBgRadius / 2,
            fontBgRadius,
            0,
            Math.PI * 2
        );
        this.textCtx.strokeStyle = "#fff";
        this.textCtx.lineWidth = 1;
        this.textCtx.fillStyle = color;
        this.textCtx.fill();
        this.textCtx.stroke();
        this.textCtx.closePath();

        const display_id = category.getIconName();
        this.textCtx.font = `${
            fontSize / Math.max(display_id.length, 1)
        }px Arial`;
        this.textCtx.fillStyle = fontColor;
        this.textCtx.fillText(display_id, middle_pixel[0], middle_pixel[1]);
    }

    clear() {
        this.maskCtx.clearRect(
            0,
            0,
            this.maskCanvas.width,
            this.maskCanvas.height
        );
        this.borderCtx.clearRect(
            0,
            0,
            this.borderCanvas.width,
            this.borderCanvas.height
        );
        this.textCtx.clearRect(
            0,
            0,
            this.textCanvas.width,
            this.textCanvas.height
        );
        this.width = null;
        this.height = null;
    }
}
