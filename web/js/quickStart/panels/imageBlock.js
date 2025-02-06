export class ImageBlock {
    constructor(dom) {
        this.dom = dom;
        this.imageDom = this.dom.querySelector("img");
    }

    updateImage(imageUrl, x1 = null, y1 = null, x2 = null, y2 = null) {
        const image = new Image();
        image.onload = () => {
            if (x1 === null || y1 === null || x2 === null || y2 === null) {
                this.imageDom.src = imageUrl;
                return;
            }
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const cropWidth = x2 - x1;
            const cropHeight = y2 - y1;

            canvas.width = cropWidth;
            canvas.height = cropHeight;

            ctx.drawImage(
                image,
                x1,
                y1,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
            );

            const dataUrl = canvas.toDataURL();
            this.imageDom.src = dataUrl;
        };
        image.src = imageUrl;
    }
}
