class ConfigPage {
    static DEFAULT_MIN_AREA = 0.001;
    static DEFAULT_MAX_IOU = 0.01;
    static DEFAULT_MIN_CONFIDENCE = 0.5;

    constructor(pageDom) {
        if (ConfigPage.instance instanceof ConfigPage) {
            return ConfigPage.instance;
        }

        ConfigPage.instance = this;

        this.pageDom = pageDom;

        this.minArea = ConfigPage.DEFAULT_MIN_AREA;
        this.minAreaText = pageDom.querySelector("#min-area-text");
        this.minAreaSlider = pageDom.querySelector("#min-area-slider");
        this.minAreaInput = pageDom.querySelector("#min-area-input");

        this.minConfidence = ConfigPage.DEFAULT_MIN_CONFIDENCE;
        this.minConfidenceText = pageDom.querySelector("#min-confidence-text");
        this.minConfidenceSlider = pageDom.querySelector(
            "#min-confidence-slider"
        );
        this.minConfidenceInput = pageDom.querySelector(
            "#min-confidence-input"
        );

        this.maxIOU = ConfigPage.DEFAULT_MAX_IOU;
        this.maxOverlapText = pageDom.querySelector("#max-overlap-text");
        this.maxOverlapSlider = pageDom.querySelector("#max-overlap-slider");
        this.maxOverlapInput = pageDom.querySelector("#max-overlap-input");

        this.saveButton = pageDom.querySelector("#save-setting-button");
        this.cancelButton = pageDom.querySelector("#cancel-setting-button");

        return this;
    }

    init() {
        // Place displayConfig() before initSliders() to ensure that the sliders are initialized with the correct values
        this.displayConfig();
        this.initSliders();
        this.initSaveButton();
    }

    initSliders() {
        const minAreaBlock = this.pageDom.querySelector("#min-area-block");
        minAreaBlock.Slider = new Slider(minAreaBlock, 0, 20);

        const minConfidenceBlock = this.pageDom.querySelector(
            "#min-confidence-block"
        );
        minConfidenceBlock.Slider = new Slider(minConfidenceBlock, 0, 100);

        const maxOverlapBlock =
            this.pageDom.querySelector("#max-overlap-block");
        maxOverlapBlock.Slider = new Slider(maxOverlapBlock, 0, 50);
    }

    initSaveButton() {
        this.saveButton.addEventListener("click", () => {
            this.minArea = this.minAreaSlider.value / 100;
            this.minConfidence = this.minConfidenceSlider.value / 100;
            this.maxIOU = this.maxOverlapSlider.value / 100;
        });
    }

    getMinArea() {
        return this.minArea;
    }

    getMinConfidence() {
        return this.minConfidence;
    }

    getMaxIOU() {
        return this.maxIOU;
    }

    enableCancelButton() {
        this.cancelButton.addEventListener("click", () => {
            const core = new Core();
            core.showPage("annotationPage");
        });
    }

    getConfig() {
        return {
            minArea: this.minArea,
            minConfidence: this.minConfidence,
            maxIOU: this.maxIOU,
        };
    }

    displayConfig() {
        this.minAreaSlider.value = this.minArea * 100;
        this.minConfidenceSlider.value = this.minConfidence * 100;
        this.maxOverlapSlider.value = this.maxIOU * 100;
    }
}
