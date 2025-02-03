class AnnotationRenderer {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.data = null;
        this.imageCache = new Image();
        this.borderCache = new Image();
        this.maskCache = new Image();
        this.textCache = new Image();

        // View control
        this.scale = 1.0;
        this.origin = { x: 0, y: 0 };
        this.zoomIntensity = 0.2;
        this.zoomStep = 0.4;
        this.image_top_left = { x: 0, y: 0 };
        this.image_bottom_right = { x: 0, y: 0 };
        this.isDragging = false;
        this.lastRightMousePos = { x: 0, y: 0 };

        const canvas = new Canvas();
        this.maskOpacity = canvas.getMaskOpacity();

        this.imageWidth = 0;
        this.imageHeight = 0;
    }

    render(data, callback = null) {
        return new Promise((resolve, reject) => {
            this.data = data;
            const imagePath = this.data.getImagePath();
            if (!imagePath) {
                console.error("Image path is not valid: ", imagePath);
                return;
            }

            this.imageCache.src = imagePath;
            this.imageCache.onload = async () => {
                this.imageWidth = this.data.getImageWidth();
                this.imageHeight = this.data.getImageHeight();
                this.canvas.width = this.imageWidth;
                this.canvas.height = this.imageHeight;
                this.resetViewpoint();

                try {
                    await this.updateMasks();
                    this.draw();
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            this.imageCache.onerror = (err) => {
                reject(`Failed to load image: ${imagePath}`);
            };
        });
    }

    resetViewpoint() {
        this.canvas.width = this.imageWidth;
        this.canvas.height = this.imageHeight;

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

    getEncodedImage() {
        return this.canvas.toDataURL("image/png");
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

        this.ctx.globalAlpha = this.maskOpacity;
        this.ctx.drawImage(this.maskCache, 0, 0);
        this.ctx.globalAlpha = 1.0;
        this.ctx.drawImage(this.borderCache, 0, 0);
        this.ctx.drawImage(this.textCache, 0, 0);
    };

    updateMasks() {
        return new Promise((resolve, reject) => {
            try {
                const maskDataUrl = this.drawMasks();
                const borderDataUrl = this.drawsBorder();
                const textDataUrl = this.drawTexts();

                // We must ensure both images are fully loaded before resolving
                let imagesLoaded = 0;
                const handleLoaded = () => {
                    imagesLoaded++;
                    // When both maskCache and textCache finish loading, we can resolve
                    if (imagesLoaded === 3) {
                        resolve();
                    }
                };

                this.maskCache.onload = handleLoaded;
                this.maskCache.onerror = (e) => {
                    console.error("Failed to load maskCache", e);
                    reject(e);
                };

                this.textCache.onload = handleLoaded;
                this.textCache.onerror = (e) => {
                    console.error("Failed to load textCache", e);
                    reject(e);
                };

                this.borderCache.onload = handleLoaded;
                this.borderCache.onerror = (e) => {
                    console.error("Failed to load borderCache", e);
                    reject(e);
                };

                this.maskCache.src = maskDataUrl;
                this.textCache.src = textDataUrl;
                this.borderCache.src = borderDataUrl;
            } catch (error) {
                reject(error);
            }
        });
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
        return maskCanvas.toDataURL();
    }

    drawsBorder() {
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

        return borderCanvas.toDataURL();
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

        return textCanvas.toDataURL();
    }

    resetImageBoundary() {
        this.image_top_left = { x: 0, y: 0 };
        this.image_bottom_right = { x: this.imageWidth, y: this.imageHeight };
    }
}
