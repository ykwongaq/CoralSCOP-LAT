import { ActionManager } from "./action/actionManager.js";
import { Mask } from "./data/index.js";
import { Prompt } from "./maskCreator.js";
import { Core } from "./core.js";
import { Quadrat } from "./complexity/quadrat.js";

export class Canvas {
    constructor(dom) {
        if (Canvas.instance) {
            return Canvas.instance;
        }

        Canvas.instance = this;

        this.canvas = dom;
        this.ctx = this.canvas.getContext("2d");

        this.data = null;

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
        this.enableEditting();
        this.enableWindowResize();
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

    enableEditting() {
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

            // Clip the value of imageX and imageY to the image boundary
            imageX = Math.max(0, Math.min(imageX, imageWidth - 1));
            imageY = Math.max(0, Math.min(imageY, imageHeight - 1));

            const actionManager = new ActionManager();
            actionManager.mouseDownPixel(imageX, imageY);
        });

        this.canvas.addEventListener("mouseup", (event) => {
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
            this.resetViewpoint();
            this.updateMasks();
            this.draw();
        };
    }

    // Helper function to convert hex color to RGB
    hexToRGB(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
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

        const core = new Core();
        const quadrat = core.getQuadrat();
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
        } else if (this.showQuadrat && quadrat) {
            const x1 = quadrat.getX1();
            const y1 = quadrat.getY1();
            const x2 = quadrat.getX2();
            const y2 = quadrat.getY2();
            this.drawRectangle(x1, y1, x2, y2, { r: 20, g: 145, b: 255 });
        }

        window.requestAnimationFrame(this.draw);
    };

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

    setIsSelectingRectangle(isSelectingRectangle) {
        this.isSelectingRectangle = isSelectingRectangle;
        console.log("isSelectingRectangle: ", this.isSelectingRectangle);
    }

    getIsSelectingRectangle() {
        return this.isSelectingRectangle;
    }

    updateMasks() {
        this.drawMasks();
        this.drawBorderes();
        this.drawTexts();
    }

    drawMasks() {
        const maskCanvas = document.createElement("canvas");
        const maskCtx = maskCanvas.getContext("2d");
        maskCanvas.width = this.imageWidth;
        maskCanvas.height = this.imageHeight;

        // Step 1: Create a buffer to track which mask is currently “winning” for each pixel.
        // If your mask IDs can be large, store them in a larger typed array. Here we assume
        // an integer up to the number of masks. 0 → no mask.
        const pixelMaskIndex = new Uint16Array(
            this.imageWidth * this.imageHeight
        );

        // We’ll keep track of each visible mask’s integer ID and color.
        // (In practice, you might store them in an array or a map).
        const masks = this.data.getMasks().filter((m) => m.shouldDisplay());
        // For example, assign each mask an ID from 1..N:
        // (You could also store them in a dictionary if needed.)
        masks.forEach((mask, idx) => {
            mask._maskId = idx + 1; // or any unique number you like
        });

        // Step 2: Fill pixelMaskIndex by iterating over each mask’s data.
        // If a mask pixel is set to 1, we overwrite that pixel’s index with the mask’s ID.
        // This effectively means “the last mask drawn wins” if multiple overlap.
        for (const mask of masks) {
            const maskData = mask.getDecodedMask(); // Uint8Array of 0/1
            const maskId = mask._maskId;

            for (let i = 0; i < maskData.length; i++) {
                if (maskData[i] === 1) {
                    pixelMaskIndex[i] = maskId;
                }
            }
        }

        // Step 3: We now have, for every pixel, a nonzero mask ID if it’s covered by some mask.
        // Create an ImageData for the entire image:
        const imageData = maskCtx.createImageData(
            this.imageWidth,
            this.imageHeight
        );
        const data = imageData.data; // Uint8ClampedArray

        // Precompute the colors for each mask’s ID (so we don’t parse hex repeatedly).
        // e.g., user “maskId => [R, G, B]” mapping:
        const maskColors = {};
        for (const mask of masks) {
            const [r, g, b] = this.hexToRGB(mask.getMaskColor());
            maskColors[mask._maskId] = [r, g, b];
        }

        // Step 4: Single pass: fill RGBA for each pixel based on which mask ID is stored.
        for (let i = 0; i < pixelMaskIndex.length; i++) {
            const id = pixelMaskIndex[i];
            if (id !== 0) {
                const color = maskColors[id];
                const index = i * 4;
                data[index] = color[0];
                data[index + 1] = color[1];
                data[index + 2] = color[2];
                data[index + 3] = 255; // fully opaque
            }
        }

        maskCtx.putImageData(imageData, 0, 0);
        this.maskCache = new Image();
        this.maskCache.src = maskCanvas.toDataURL();
    }

    /**
     * Example optimization for borders: Instead of a full double loop with neighbor checks for every pixel,
     * consider that we already have each mask’s data. We quickly detect boundary by scanning each mask’s array.
     */
    drawBorderes() {
        const borderCanvas = document.createElement("canvas");
        const borderCtx = borderCanvas.getContext("2d");
        borderCanvas.width = this.imageWidth;
        borderCanvas.height = this.imageHeight;

        const masks = this.data.getMasks();
        // We’ll use the native drawing on canvas, but reduce overhead by drawing small “dots” only at borders.
        const radius = Math.min(this.imageWidth, this.imageHeight) * 0.0015;

        for (const mask of masks) {
            if (!mask.shouldDisplay()) continue;

            const maskData = mask.getDecodedMask();
            const borderColor = mask.getCategory().getBorderColor();

            // We check neighbors only in four directions: left, right, up, down
            const width = this.imageWidth;
            for (let i = 0; i < maskData.length; i++) {
                if (maskData[i] === 1) {
                    // Compute x,y
                    const x = i % width;
                    const y = (i / width) | 0; // integer division

                    // Compare neighbors
                    // left
                    if (x > 0 && maskData[i - 1] === 0) {
                        this._drawDot(borderCtx, x, y, radius, borderColor);
                    }
                    // right
                    if (x < width - 1 && maskData[i + 1] === 0) {
                        this._drawDot(borderCtx, x, y, radius, borderColor);
                    }
                    // up
                    if (y > 0 && maskData[i - width] === 0) {
                        this._drawDot(borderCtx, x, y, radius, borderColor);
                    }
                    // down
                    if (y < this.imageHeight - 1 && maskData[i + width] === 0) {
                        this._drawDot(borderCtx, x, y, radius, borderColor);
                    }
                }
            }
        }

        this.borderCache = new Image();
        this.borderCache.src = borderCanvas.toDataURL();
    }

    /**
     * Simple helper for drawing a small circle (dot) on the border canvas.
     */
    _drawDot(ctx, x, y, radius, color) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.closePath();
    }

    /**
     * Example optimization for text rendering: do a single pass for all visible masks.
     */
    drawTexts() {
        const textCanvas = document.createElement("canvas");
        const textCtx = textCanvas.getContext("2d");
        textCanvas.width = this.imageWidth;
        textCanvas.height = this.imageHeight;

        const masks = this.data.getMasks();
        for (const mask of masks) {
            if (!mask.shouldDisplay()) {
                continue;
            }

            const middle_pixel = mask.getMiddlePoint();
            const category = mask.getCategory();
            const label_id = category.getCategoryId();
            const color = category.getMaskColor();
            const fontColor = category.getTextColor();

            if (label_id !== -1) {
                const fontSize = Math.min(
                    Math.floor(
                        Math.min(this.imageWidth, this.imageHeight) * 0.04
                    ),
                    40
                );

                const display_id = category.getIconName();
                const fontBgRadius = fontSize * 0.7;

                textCtx.beginPath();
                textCtx.arc(
                    middle_pixel[0] + fontBgRadius / 2,
                    middle_pixel[1] - fontBgRadius / 2,
                    fontBgRadius,
                    0,
                    Math.PI * 2
                );
                textCtx.strokeStyle = "#fff";
                textCtx.lineWidth = 1;
                textCtx.fillStyle = color;
                textCtx.fill();
                textCtx.stroke();
                textCtx.closePath();

                // Adjust font size based on string length
                textCtx.font = `${
                    fontSize / Math.max(display_id.length, 1)
                }px Arial`;
                textCtx.fillStyle = fontColor;
                textCtx.fillText(display_id, middle_pixel[0], middle_pixel[1]);
            }
        }

        this.textCache = new Image();
        this.textCache.src = textCanvas.toDataURL();
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
     * Inverse of canvasPixelToImagePixel: given an image pixel (x, y),
     * return its coordinate in the current canvas space (after scale & origin).
     */
    imagePixelToCanvasPixel(imageX, imageY) {
        const canvasX = (imageX - this.origin.x) * this.scale;
        const canvasY = (imageY - this.origin.y) * this.scale;
        return [canvasX, canvasY];
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
        const [r, g, b] = this.hexToRGB(mask.getMaskColor());

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
}
