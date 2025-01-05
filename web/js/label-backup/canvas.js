class Canvas {
    constructor() {
        if (Canvas.instance) {
            return Canvas.instance;
        }

        Canvas.instance = this;

        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.data = null;
        this.imageUrl = null;

        this.imageCache = new Image();
        this.maskCache = new Image();
        this.textCache = new Image();
        this.edittingMaskCache = new Image();

        // View control
        this.scale = 1.0;
        this.origin = { x: 0, y: 0 };
        this.zoomIntensity = 0.2;
        this.zoomStep = 0.4;
        this.image_top_left = { x: 0, y: 0 };
        this.image_bottom_right = { x: 0, y: 0 };
        this.isDragging = false;
        this.lastRightMousePos = { x: 0, y: 0 };
        this.enableZoom();
        this.enableDrag();
        this.enableEditting();
        this.enableWindowResize();

        this.showMask = true;

        // Image
        this.imageWidth = 0;
        this.imageHeight = 0;

        this.maskOpacity = 0.6;

        this.edittingMask = null;
        this.edittingMaskColor = `rgba (${30 / 255}, ${144 / 255}, ${
            255 / 255
        }, 0.6)`;
        this.edittingLabel = null;

        return this;
    }

    setShowMask(showMask) {
        this.showMask = showMask;
    }

    isShowingMask() {
        return this.showMask;
    }

    getEdittingMask() {
        if (this.edittingLabel) {
            this.edittingMask.updateLabel(this.edittingLabel);
        }
        return this.edittingMask;
    }

    enableWindowResize() {
        window.addEventListener("resize", () => {
            this.resetViewpoint();
        });
    }

    updateEditingResult(edittingMask, selected_points, labels) {
        if (edittingMask === null) {
            this.edittingMask = null;
            this.selected_points = [];
            this.labels = [];
            return;
        }

        this.edittingMask = edittingMask;

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
        const data = imageData.data; // This is a flat array of [r, g, b, a, r, g, b, a, ...]

        const maskData = edittingMask.getDecodedMask();

        let r = 30;
        let g = 144;
        let b = 255;

        if (edittingMask.getCategoryId()) {
            const color = LabelManager.getColorById(
                edittingMask.getCategoryId()
            );
            [r, g, b] = this.hexToRGB(color);
        }

        for (let i = 0; i < maskData.length; i++) {
            if (maskData[i] === 1) {
                const x = i % this.imageWidth;
                const y = Math.floor(i / this.imageWidth);
                const index = (y * this.imageWidth + x) * 4;

                // Set pixel color with alpha transparency
                data[index] = r; // Red
                data[index + 1] = g; // Green
                data[index + 2] = b; // Blue
                // data[index + 3] = Math.floor(this.maskOpacity * 255); // Alpha (0.5 transparency -> 128)
                data[index + 3] = 255; // Alpha (0.5 transparency -> 128)
            }
        }

        // Put the modified image data back to the canvas
        maskCtx.putImageData(imageData, 0, 0);

        const pointRadius = Math.min(this.imageWidth, this.imageHeight) * 0.01;

        for (let i = 0; i < selected_points.length; i++) {
            const [imageX, imageY] = selected_points[i];
            const label = labels[i];

            let color = "red";
            if (label == 1) {
                color = "green";
            }

            // Draw a circle at the selected point
            maskCtx.beginPath();
            maskCtx.arc(imageX, imageY, pointRadius, 0, 2 * Math.PI);

            maskCtx.fillStyle = color;
            maskCtx.fill();
        }

        this.edittingMaskCache = new Image();
        this.edittingMaskCache.src = maskCanvas.toDataURL();
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

    setShowAnnotation(showAnnotation) {
        this.showAnnotation = showAnnotation;
    }

    setData(data) {
        this.data = data;
        this.imageUrl = this.data.getImageUrl();
        this.imageWidth = data.getImageWidth();
        this.imageHeight = data.getImageHeight();
        this.resetViewpoint();
        this.updateMasks();
    }

    updateMasks() {
        const maskCanvas = document.createElement("canvas");
        const maskCtx = maskCanvas.getContext("2d");
        maskCanvas.width = this.imageWidth;
        maskCanvas.height = this.imageHeight;

        const masks = this.data.getMasks();
        // const filteredIndices = this.data.getFilteredIndices();

        const imageData = maskCtx.getImageData(
            0,
            0,
            this.imageWidth,
            this.imageHeight
        );
        const data = imageData.data; // This is a flat array of [r, g, b, a, r, g, b, a, ...]

        for (const mask of masks) {
            if (!mask.getShouldDisplay()) {
                continue;
            }
            const color = mask.getColor();
            const maskData = mask.getDecodedMask();
            const [r, g, b] = this.hexToRGB(color);

            for (let i = 0; i < maskData.length; i++) {
                if (maskData[i] === 1) {
                    const x = i % this.imageWidth;
                    const y = Math.floor(i / this.imageWidth);
                    const index = (y * this.imageWidth + x) * 4;
                    // Set pixel color with alpha transparency
                    data[index] = r; // Red
                    data[index + 1] = g; // Green
                    data[index + 2] = b; // Blue
                    data[index + 3] = 255; // Alpha (0.5 transparency -> 128)
                }
            }
        }

        // Put the modified image data back to the canvas
        maskCtx.putImageData(imageData, 0, 0);

        const radius = Math.min(this.imageWidth, this.imageHeight) * 0.003;
        // Draw the border
        for (const mask of masks) {
            if (!mask.getShouldDisplay()) {
                continue;
            }

            if (!LabelManager.isBleachCoral(mask.getCategoryId())) {
                continue;
            }

            const maskData = mask.getDecodedMask();

            for (let i = 0; i < maskData.length; i++) {
                if (maskData[i] === 1) {
                    const x = i % this.imageWidth;
                    const y = Math.floor(i / this.imageWidth);

                    // Check if this pixel is on the border by checking its neighbors
                    const isBorder = [
                        maskData[i - 1], // Left
                        maskData[i + 1], // Right
                        maskData[i - this.imageWidth], // Top
                        maskData[i + this.imageWidth], // Bottom
                    ].some(
                        (neighbor) => neighbor === 0 || neighbor === undefined
                    );

                    if (isBorder) {
                        maskCtx.beginPath();
                        maskCtx.arc(x, y, radius, 0, 2 * Math.PI); // 2.5 radius for 5px diameter
                        maskCtx.fillStyle = LabelManager.getBorderColorById(
                            mask.getCategoryId()
                        );
                        maskCtx.fill();
                    }
                }
            }
        }

        this.maskCache = new Image();
        this.maskCache.src = maskCanvas.toDataURL();

        // Draw the text labels after the masks are applied
        const textCanvas = document.createElement("canvas");
        const textCtx = textCanvas.getContext("2d");
        textCanvas.width = this.imageWidth;
        textCanvas.height = this.imageHeight;

        for (const mask of masks) {
            if (!mask.getShouldDisplay()) {
                continue;
            }

            const middle_pixel = mask.getMiddlePoint();
            const label_id = mask.getCategoryId();
            const color = LabelManager.getColorById(label_id);
            const fontColor = LabelManager.getTextColorById(label_id);

            if (label_id !== null) {
                const fontSize = Math.min(
                    Math.floor(
                        Math.min(this.imageWidth, this.imageHeight) * 0.04
                    ),
                    40
                );
                const display_id = LabelManager.getCategoryDisplayId(label_id);
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
                textCtx.fillStyle = color; // Fill color
                textCtx.fill(); // Fills the circle
                textCtx.stroke();
                textCtx.closePath();

                textCtx.font = `${fontSize / display_id.length}px Arial`;
                // maskCtx.fillStyle = `rgba(255, 0, 0, ${this.maskOpacity})`;
                textCtx.fillStyle = fontColor;
                textCtx.fillText(display_id, middle_pixel[0], middle_pixel[1]);
            }
        }

        this.textCache = new Image();
        this.textCache.src = textCanvas.toDataURL();
    }

    // Helper function to convert hex color to RGB
    hexToRGB(hex) {
        const bigint = parseInt(hex.slice(1), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    }

    draw = () => {
        this.imageCache.onload = () => {
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

            if (this.isShowingMask()) {
                this.ctx.globalAlpha = this.maskOpacity;
                this.ctx.drawImage(this.maskCache, 0, 0);
                this.ctx.globalAlpha = 1.0;
                this.ctx.drawImage(this.textCache, 0, 0);
            }

            if (this.edittingMask !== null) {
                this.ctx.globalAlpha = 0.7;
                this.ctx.drawImage(this.edittingMaskCache, 0, 0);
                this.ctx.globalAlpha = 1.0;
            }
            window.requestAnimationFrame(this.draw);
        };
        this.imageCache.src = this.imageUrl;
    };

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

    isInsideImageBoundary(x, y) {
        return (
            x >= this.image_top_left.x &&
            x <= this.image_bottom_right.x &&
            y >= this.image_top_left.y &&
            y <= this.image_bottom_right.y
        );
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

    enableEditting() {
        this.canvas.addEventListener("click", (event) => {
            let [canvasX, canvasY] = this.getMousePos(event);
            canvasX = Math.floor(canvasX);
            canvasY = Math.floor(canvasY);

            let [imageX, imageY] = this.canvasPixelToImagePixel(
                canvasX,
                canvasY
            );
            if (Annotator.getCurrentMode() === Annotator.LABEL_MASK) {
                if (this.isInsideImageBoundary(canvasX, canvasY)) {
                    const clickedMasks = this.getClickedMasks(imageX, imageY);

                    clickedMasks.forEach((mask) => {
                        if (Annotator.isMaskSelected(mask)) {
                            Annotator.deselectMask(mask);
                        } else {
                            Annotator.selectMask(mask);
                        }
                    });
                }
            } else if (Annotator.getCurrentMode() === Annotator.ADD_MASK) {
                const label = 1;
                eel.add_edit_mask_input_point(
                    imageX,
                    imageY,
                    label
                )((response) => {
                    const annotation = response["annotation"];
                    const selected_points = response["selected_points"];
                    const labels = response["labels"];

                    let mask = null;
                    if (annotation !== null) {
                        mask = new Mask(annotation);
                        if (this.edittingLabel) {
                            mask.setCategoryId(this.edittingLabel.getLabelId());
                            mask.setCategoryName(
                                this.edittingLabel.getLabelName()
                            );
                        }
                    }
                    this.updateEditingResult(mask, selected_points, labels);
                });
            } else if (Annotator.getCurrentMode() === Annotator.DELETE_MASK) {
                if (this.isInsideImageBoundary(canvasX, canvasY)) {
                    const clickedMasks = this.getClickedMasks(imageX, imageY);
                    clickedMasks.forEach((mask) => {
                        if (Annotator.isMaskSelected(mask)) {
                            Annotator.deselectMask(mask);
                        } else {
                            Annotator.selectMask(mask);
                        }
                    });
                }
            }
        });

        this.canvas.addEventListener("contextmenu", (event) => {
            let [canvasX, canvasY] = this.getMousePos(event);
            canvasX = Math.floor(canvasX);
            canvasY = Math.floor(canvasY);

            let [imageX, imageY] = this.canvasPixelToImagePixel(
                canvasX,
                canvasY
            );

            if (Annotator.getCurrentMode() === Annotator.ADD_MASK) {
                if (this.isInsideImageBoundary(canvasX, canvasY)) {
                    const label = 0;
                    eel.add_edit_mask_input_point(
                        imageX,
                        imageY,
                        label
                    )((response) => {
                        const annotation = response["annotation"];
                        const selected_points = response["selected_points"];
                        const labels = response["labels"];

                        let mask = null;
                        if (annotation !== null) {
                            mask = new Mask(annotation);
                            if (this.edittingLabel) {
                                mask.setCategoryId(
                                    this.edittingLabel.getLabelId()
                                );
                                mask.setCategoryName(
                                    this.edittingLabel.getLabelName()
                                );
                            }
                        }
                        this.updateEditingResult(mask, selected_points, labels);
                    });
                }
            }
        });
    }

    getClickedMasks(imageX, imageY) {
        const masks = this.data.getMasks();
        const clickedMasks = [];
        for (const mask of masks) {
            if (mask.containPixel(imageX, imageY)) {
                clickedMasks.push(mask);
            }
        }
        return clickedMasks;
    }

    setEdittingLabel(label) {
        this.edittingLabel = label;
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
}
