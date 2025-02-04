import { Slider } from "../../util/index.js";

export class ConfigPage {
    static DEFAULT_MIN_AREA = 0.001;
    static DEFAULT_MAX_IOU = 0.001;
    static DEFAULT_MIN_CONFIDENCE = 0.5;

    constructor(pageDom) {
        if (ConfigPage.instance instanceof ConfigPage) {
            return ConfigPage.instance;
        }

        ConfigPage.instance = this;

        this.pageDom = pageDom;

        this.minArea = ConfigPage.DEFAULT_MIN_AREA;
        this.minAreaTemp = this.minArea;
        this.minAreaText = pageDom.querySelector("#min-area-text");
        this.minAreaSlider = pageDom.querySelector("#min-area-slider");
        this.minAreaInput = pageDom.querySelector("#min-area-input");

        this.minConfidence = ConfigPage.DEFAULT_MIN_CONFIDENCE;
        this.minConfidenceTemp = this.minConfidence;
        this.minConfidenceText = pageDom.querySelector("#min-confidence-text");
        this.minConfidenceSlider = pageDom.querySelector(
            "#min-confidence-slider"
        );
        this.minConfidenceInput = pageDom.querySelector(
            "#min-confidence-input"
        );

        this.maxIOU = ConfigPage.DEFAULT_MAX_IOU;
        this.maxIOUTemp = this.maxIOU;
        this.maxOverlapText = pageDom.querySelector("#max-overlap-text");
        this.maxOverlapSlider = pageDom.querySelector("#max-overlap-slider");
        this.maxOverlapInput = pageDom.querySelector("#max-overlap-input");

        this.saveButton = pageDom.querySelector("#save-setting-button");
        this.cancelButton = pageDom.querySelector("#cancel-setting-button");

        this.minAreaBlock = pageDom.querySelector("#min-area-block");
        this.minConfidenceBlock = pageDom.querySelector(
            "#min-confidence-block"
        );
        this.maxOverlapBlock = pageDom.querySelector("#max-overlap-block");

        return this;
    }

    init() {
        // Place displayConfig() before initSliders() to ensure that the sliders are initialized with the correct values
        this.initSliders();
        this.displayConfig();
        this.initSaveButton();
    }

    initSliders() {
        this.minAreaBlock.Slider = new Slider(this.minAreaBlock, 0, 20);
        this.minConfidenceBlock.Slider = new Slider(
            this.minConfidenceBlock,
            0,
            100
        );
        this.maxOverlapBlock.Slider = new Slider(this.maxOverlapBlock, 0, 50);
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
        this.minAreaBlock.Slider.updateValue(this.minArea * 100);
        this.minConfidenceBlock.Slider.updateValue(this.minConfidence * 100);
        this.maxOverlapBlock.Slider.updateValue(this.maxIOU * 100);
    }
}
