import { ActionManager } from "../action/actionManager.js";
import { Mask, Data } from "../data/index.js";
import { Prompt } from "../action/maskCreator.js";
import { MaskDrawer } from "../util/maskDrawer.js";
import { hexToRGB } from "../util/color.js";
import { Manager } from "../manager.js";

export class Canvas {
    constructor(dom) {
        this.canvas = dom;
        this.ctx = this.canvas.getContext("2d");

        /** @type {Data} */
        this.data = null;

        // Mask Visualization
        this.maskDrawer = new MaskDrawer();

        // Final imags that we draw from
        this.imageCache = new Image();
        this.maskCache = new Image();
        this.textCache = new Image();
        this.borderCache = new Image();
        this.promptingMaskCache = new Image();

        // View control
        this.scale = 1.0;
        this.origin = { x: 0, y: 0 };
        this.zoomIntensity = 0.2;
        this.zoomStep = 0.4;
        this.image_top_left = { x: 0, y: 0 };
        this.image_bottom_right = { x: 0, y: 0 };
        this.isDragging = false;
        this.lastRightMousePos = { x: 0, y: 0 };

        // Mask Display
        this.showMask = true;
        this.maskOpacity = 0.4;

        // Image
        this.imageWidth = 0;
        this.imageHeight = 0;

        // Prompting mask
        this.promtedMaskColor = `rgba (${30 / 255}, ${144 / 255}, ${
            255 / 255
        }, 0.6)`;
        this.promptedMask = null;

        // Retangle
        this.showQuadrat = false;
        this.isSelectingRectangle = false;
        this.rectStartImagePixel = null;
        this.rectEndImagePixel = null;
    }

    init() {
        this.enableZoom();
        this.enableDrag();
        this.enableWindowResize();
        this.enableMaskSelection();
        this.enableDrawingRectangle();
    }

    enableZoom() {
        this.canvas.onwheel = (event) => {
            event.preventDefault();
            // Get mouse offset.
            const [mouseX, mouseY] = this.getMousePos(event);
            // Normalize mouse wheel movement to +1 or -1 to avoid unusual jumps.
            const wheel = event.deltaY < 0 ? 1 : -1;
            // Compute zoom factor.
            const zoom = Math.exp(wheel * this.zoomIntensity);
            this.origin.x -= mouseX / (this.scale * zoom) - mouseX / this.scale;
            this.origin.y -= mouseY / (this.scale * zoom) - mouseY / this.scale;
            this.scale *= zoom;
        };
    }

    enableDrag() {
        const rightMouseKey = 2;
        this.canvas.addEventListener("mousedown", (event) => {
            event.preventDefault();
            if (event.button === rightMouseKey) {
                this.isDragging = true;
                const [mouseX, mouseY] = this.getMousePos(event);
                this.lastRightMousePos = {
                    x: mouseX,
                    y: mouseY,
                };
            }
        });

        this.canvas.addEventListener("mousemove", (event) => {
            event.preventDefault();
            if (this.isDragging) {
                const [mouseX, mouseY] = this.getMousePos(event);
                const dx = (mouseX - this.lastRightMousePos.x) / this.scale;
                const dy = (mouseY - this.lastRightMousePos.y) / this.scale;
                this.origin.x -= dx;
                this.origin.y -= dy;
                this.lastRightMousePos = { x: mouseX, y: mouseY };
            }
        });

        this.canvas.addEventListener("mouseup", (event) => {
            event.preventDefault();
            if (event.button === rightMouseKey) {
                this.isDragging = false;
            }
        });

        this.canvas.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        });
    }

    enableWindowResize() {
        window.addEventListener("resize", () => {
            this.resetViewpoint();
        });
    }

    enableMaskSelection() {
        this.canvas.addEventListener("click", (event) => {
            event.preventDefault();

            let [canvasX, canvasY] = this.getMousePos(event);
            canvasX = Math.floor(canvasX);
            canvasY = Math.floor(canvasY);

            let [imageX, imageY] = this.canvasPixelToImagePixel(
                canvasX,
                canvasY
            );

            const imageHeight = this.data.getImageHeight();
            const imageWidth = this.data.getImageWidth();

            if (
                imageX < 0 ||
                imageX >= imageWidth ||
                imageY < 0 ||
                imageY >= imageHeight
            ) {
                return;
            }

            const actionManager = new ActionManager();
            actionManager.leftClickPixel(imageX, imageY);
        });

        this.canvas.addEventListener("contextmenu", (event) => {
            event.preventDefault();

            let [canvasX, canvasY] = this.getMousePos(event);
            canvasX = Math.floor(canvasX);
            canvasY = Math.floor(canvasY);

            let [imageX, imageY] = this.canvasPixelToImagePixel(
                canvasX,
                canvasY
            );

            const imageHeight = this.data.getImageHeight();
            const imageWidth = this.data.getImageWidth();

            if (
                imageX < 0 ||
                imageX >= imageWidth ||
                imageY < 0 ||
                imageY >= imageHeight
            ) {
                return;
            }

            const actionManager = new ActionManager();
            actionManager.rightClickPixel(imageX, imageY);
        });
    }

    showData(data) {
        this.data = data;

        const imagePath = this.data.getImagePath();
        if (!imagePath) {
            console.error("Image path is not valid: ", imagePath);
            return;
        }

        this.imageCache.src = imagePath;
        this.imageCache.onload = () => {
            this.imageWidth = this.data.getImageWidth();
            this.imageHeight = this.data.getImageHeight();

            // this.maskDrawer.setData(this.data);
            this.maskDrawer.clearMemory();
            this.maskDrawer.setHeight(this.imageHeight);
            this.maskDrawer.setWidth(this.imageWidth);

            this.resetViewpoint();
            this.updateMasks();
            this.draw();
        };
    }

    draw = () => {
        if (!this.data || !this.imageCache.src) {
            return;
        }

        this.ctx.clearRect(
            this.origin.x,
            this.origin.y,
            this.canvas.width / this.scale,
            this.canvas.height / this.scale
        );
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the transform matrix
        this.ctx.scale(this.scale, this.scale);
        this.ctx.translate(-this.origin.x, -this.origin.y);

        this.resetImageBoundary();
        this.image_top_left = {
            x: Math.floor(-this.origin.x * this.scale),
            y: Math.floor(-this.origin.y * this.scale),
        };
        this.image_bottom_right = {
            x: Math.floor(
                -this.origin.x * this.scale + this.imageWidth * this.scale
            ),
            y: Math.floor(
                -this.origin.y * this.scale + this.imageHeight * this.scale
            ),
        };

        this.ctx.drawImage(this.imageCache, 0, 0);

        if (this.shouldShowMask()) {
            this.ctx.globalAlpha = this.maskOpacity;
            this.ctx.drawImage(this.maskCache, 0, 0);
            this.ctx.globalAlpha = 1.0;
            this.ctx.drawImage(this.borderCache, 0, 0);
            this.ctx.drawImage(this.textCache, 0, 0);
        }

        if (this.promptedMask !== null) {
            this.ctx.globalAlpha = 0.7;
            this.ctx.drawImage(this.promptingMaskCache, 0, 0);
            this.ctx.globalAlpha = 1.0;
        }

        if (
            this.isSelectingRectangle &&
            this.rectStartImagePixel &&
            this.rectEndImagePixel
        ) {
            this.drawRectangle(
                this.rectStartImagePixel[0],
                this.rectStartImagePixel[1],
                this.rectEndImagePixel[0],
                this.rectEndImagePixel[1],
                {
                    r: 255,
                    g: 0,
                    b: 0,
                }
            );
        }

        window.requestAnimationFrame(this.draw);
    };

    /**
     * Update the visualization of segmentation masks. <br/>
     *
     * Visualization include the segmentation area, boundary, and text. <br/>
     *
     * To improve the efficiency, we only update the visualization of the modified masks. <br/>
     */
    updateMasks() {
        this.maskDrawer.updateMasks(this.data.getMasks());
        this.maskCache.src = this.maskDrawer.getMaskCanvas().toDataURL();
        this.textCache.src = this.maskDrawer.getTextCanvas().toDataURL();
        this.borderCache.src = this.maskDrawer.getBorderCanvas().toDataURL();

        for (const mask of this.data.getMasks()) {
            mask.setModified(false);
        }
    }

    resetViewpoint() {
        // Get the display size of the canvas
        const rect = this.canvas.getBoundingClientRect();
        const canvasDisplayWidth = rect.width;
        const canvasDisplayHeight = rect.height;

        // Set the canvas internal dimensions to match the display size
        this.canvas.width = canvasDisplayWidth;
        this.canvas.height = canvasDisplayHeight;

        // Compute the scale and origin
        const scaleX = this.canvas.width / this.imageWidth;
        const scaleY = this.canvas.height / this.imageHeight;
        this.scale = Math.min(scaleX, scaleY);

        const scaledImageWidth = this.imageWidth * this.scale;
        const scaledImageHeight = this.imageHeight * this.scale;

        const offsetX = (this.canvas.width - scaledImageWidth) / 2;
        const offsetY = (this.canvas.height - scaledImageHeight) / 2;

        this.origin.x = -offsetX / this.scale;
        this.origin.y = -offsetY / this.scale;
    }

    resetImageBoundary() {
        this.image_top_left = { x: 0, y: 0 };
        this.image_bottom_right = { x: this.imageWidth, y: this.imageHeight };
    }

    getMousePos(event) {
        const rect = this.canvas.getBoundingClientRect();
        return [
            (event.clientX - rect.left) * (this.canvas.width / rect.width),
            (event.clientY - rect.top) * (this.canvas.height / rect.height),
        ];
    }

    shouldShowMask() {
        return this.showMask;
    }

    setShouldShowMask(showMask) {
        this.showMask = showMask;
    }

    setMaskOpacity(opacity) {
        this.maskOpacity = opacity;
    }

    transition_pos(point, x, y) {
        point.x += x;
        point.y += y;

        return { x: point.x, y: point.y };
    }

    scale_pos(point, scale) {
        point.x *= scale;
        point.y *= scale;

        return { x: point.x, y: point.y };
    }

    zoomIn() {
        this.origin.x += this.zoomStep * this.scale * (1 / this.zoomStep);
        this.origin.y += this.zoomStep * this.scale * (1 / this.zoomStep);
        this.scale += this.zoomStep;
    }
    zoomOut() {
        this.origin.x -= this.zoomStep * this.scale * (1 / this.zoomStep);
        this.origin.y -= this.zoomStep * this.scale * (1 / this.zoomStep);
        this.scale -= this.zoomStep;
    }

    getOpacity() {
        return this.maskOpacity;
    }

    setOpacity(opacity) {
        this.maskOpacity = opacity;
    }

    canvasPixelToImagePixel(canvasX, canvasY) {
        const width = this.image_bottom_right.x - this.image_top_left.x;
        const height = this.image_bottom_right.y - this.image_top_left.y;

        const imageX = Math.floor(
            ((canvasX - this.image_top_left.x) / width) * this.imageWidth
        );
        const imageY = Math.floor(
            ((canvasY - this.image_top_left.y) / height) * this.imageHeight
        );
        return [imageX, imageY];
    }

    /**
     * Show the given promted mask.
     * If the given mask is null, then do not show anything.
     * @param {Mask} mask
     * @param {Prompt[]} prompts
     */
    showPromptedMask(mask, prompts) {
        this.promptedMask = mask;
        if (mask === null) {
            return;
        }

        // Draw masks
        const maskCanvas = document.createElement("canvas");
        const maskCtx = maskCanvas.getContext("2d");
        maskCanvas.width = this.imageWidth;
        maskCanvas.height = this.imageHeight;

        const imageData = maskCtx.getImageData(
            0,
            0,
            this.imageWidth,
            this.imageHeight
        );
        const data = imageData.data;

        const maskData = mask.getDecodedMask();
        const [r, g, b] = hexToRGB(mask.getMaskColor());

        for (let i = 0; i < maskData.length; i++) {
            if (maskData[i] === 1) {
                const x = i % this.imageWidth;
                const y = Math.floor(i / this.imageWidth);
                const index = (y * this.imageWidth + x) * 4;

                // Set pixel color with alpha transparency
                data[index] = r; // Red
                data[index + 1] = g; // Green
                data[index + 2] = b; // Blue
                data[index + 3] = 255; // Alpha
            }
        }
        maskCtx.putImageData(imageData, 0, 0);

        // Draw prompted points
        const pointRadius = Math.min(this.imageWidth, this.imageHeight) * 0.01;
        for (const prompt of prompts) {
            const imageX = prompt.getImageX();
            const imageY = prompt.getImageY();
            const color = prompt.getPointColor();

            maskCtx.beginPath();
            maskCtx.arc(imageX, imageY, pointRadius, 0, 2 * Math.PI);
            maskCtx.fillStyle = color;
            maskCtx.fill();
        }

        this.promptingMaskCache = new Image();
        this.promptingMaskCache.src = maskCanvas.toDataURL();
    }

    getEncodedImage() {
        return this.canvas.toDataURL("image/png");
    }

    getMaskOpacity() {
        return this.maskOpacity;
    }

    drawRectangle(imageX1, imageY1, imageX2, imageY2, rgb) {
        const x = Math.min(imageX1, imageX2);
        const y = Math.min(imageY1, imageY2);
        const width = Math.abs(imageX1 - imageX2);
        const height = Math.abs(imageY1 - imageY2);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y, width, height);
        this.ctx.fillStyle =
            "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ", 0.3)";
        this.ctx.strokeStyle = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
        this.ctx.lineWidth = 2;
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.restore();
    }

    setIsSelectingRectangle(isSelectingRectangle) {
        this.isSelectingRectangle = isSelectingRectangle;
    }

    getIsSelectingRectangle() {
        return this.isSelectingRectangle;
    }

    setStartRectPixel(imageX, imageY) {
        this.rectStartImagePixel = [imageX, imageY];
    }

    setEndRectPixel(imageX, imageY) {
        this.rectEndImagePixel = [imageX, imageY];
    }

    getStartRectPixel() {
        return this.rectStartImagePixel;
    }

    getEndRectPixel() {
        return this.rectEndImagePixel;
    }

    setShowQuadrat(showQuadrat) {
        this.showQuadrat = showQuadrat;
    }

    drawRectangle(imageX1, imageY1, imageX2, imageY2, rgb) {
        const x = Math.min(imageX1, imageX2);
        const y = Math.min(imageY1, imageY2);
        const width = Math.abs(imageX1 - imageX2);
        const height = Math.abs(imageY1 - imageY2);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x, y, width, height);
        // this.ctx.fillStyle = "rgba(20, 145, 255, 0.3)"; // semi-transparent
        // this.ctx.strokeStyle = "#1491ff"; // solid red border
        this.ctx.fillStyle =
            "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ", 0.3)";
        this.ctx.strokeStyle = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
        this.ctx.lineWidth = 2;
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.restore();
    }

    enableDrawingRectangle() {
        this.canvas.addEventListener("mousedown", (event) => {
            event.preventDefault();

            // Only left click is allowed
            if (event.button !== 0) {
                return;
            }

            let [canvasX, canvasY] = this.getMousePos(event);
            canvasX = Math.floor(canvasX);
            canvasY = Math.floor(canvasY);

            let [imageX, imageY] = this.canvasPixelToImagePixel(
                canvasX,
                canvasY
            );

            const imageHeight = this.data.getImageHeight();
            const imageWidth = this.data.getImageWidth();

            if (
                imageX < 0 ||
                imageX >= imageWidth ||
                imageY < 0 ||
                imageY >= imageHeight
            ) {
                return;
            }

            const actionManager = new ActionManager();
            actionManager.mouseDownPixel(imageX, imageY);
        });

        this.canvas.addEventListener("mouseup", (event) => {
            event.preventDefault();

            // Only left click is allowed
            if (event.button !== 0) {
                return;
            }

            if (!this.isSelectingRectangle) {
                return;
            }

            let [canvasX, canvasY] = this.getMousePos(event);
            canvasX = Math.floor(canvasX);
            canvasY = Math.floor(canvasY);

            let [imageX, imageY] = this.canvasPixelToImagePixel(
                canvasX,
                canvasY
            );

            const imageHeight = this.data.getImageHeight();
            const imageWidth = this.data.getImageWidth();

            // Clip the value of imageX and imageY to the image boundary
            imageX = Math.max(0, Math.min(imageX, imageWidth - 1));
            imageY = Math.max(0, Math.min(imageY, imageHeight - 1));

            const actionManager = new ActionManager();
            actionManager.mouseUpPixel(imageX, imageY);
        });

        this.canvas.addEventListener("mousemove", (event) => {
            event.preventDefault();

            // Only left click is allowed
            if (event.button !== 0) {
                return;
            }

            let [canvasX, canvasY] = this.getMousePos(event);
            canvasX = Math.floor(canvasX);
            canvasY = Math.floor(canvasY);

            let [imageX, imageY] = this.canvasPixelToImagePixel(
                canvasX,
                canvasY
            );

            const imageHeight = this.data.getImageHeight();
            const imageWidth = this.data.getImageWidth();

            // Clip the value of imageX and imageY to the image boundary
            imageX = Math.max(0, Math.min(imageX, imageWidth - 1));
            imageY = Math.max(0, Math.min(imageY, imageHeight - 1));

            const actionManager = new ActionManager();
            actionManager.mouseMovePixel(imageX, imageY);
        });
    }
}
