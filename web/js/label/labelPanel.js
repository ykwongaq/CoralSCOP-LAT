class LabelPanel {
    constructor(dom) {
        this.dom = dom;

        // Opacity Setting
        this.opacitySlider = this.dom.querySelector("#mask-opacity-silder");
        this.opacityInput = this.dom.querySelector("#mask-opacity-input");

        // Show Mask Button
        this.showMaskButton = this.dom.querySelector("#toogle-mask-button");
    }

    init() {
        const opacitySliderBlock = this.dom.querySelector("#mask-slider-blk");
        opacitySliderBlock.Slider = new Slider(opacitySliderBlock);

        this.initOpacitySlider();
        this.initOpacityInput();

        this.initShowMaskButton();
    }

    initOpacitySlider() {
        this.opacitySlider.addEventListener("input", function (event) {
            const opacity = this.value / 100;
            const canvas = new Canvas(null);
            canvas.setOpacity(opacity);
        });
    }

    initOpacityInput() {
        this.opacityInput.addEventListener("input", function (event) {
            // Ensure that the input value is a number between 0 and 100
            if (isNaN(this.value)) {
                this.value = 60;
            }

            if (this.value > 100) {
                this.value = 100;
            } else if (this.value < 0) {
                this.value = 0;
            }

            const opacity = this.value / 100;
            const canvas = new Canvas(null);
            canvas.setOpacity(opacity);
        });
    }

    initShowMaskButton() {
        this.showMaskButton.checked = true;
        this.showMaskButton.addEventListener("click", function () {
            const showMask = this.checked;
            const canvas = new Canvas();
            canvas.setShouldShowMask(showMask);
        });
    }
}
