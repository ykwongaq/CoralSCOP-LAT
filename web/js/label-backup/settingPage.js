class SettingPage {
    constructor() {
        if (SettingPage.instance instanceof SettingPage) {
            return SettingPage.instance;
        }

        SettingPage.instance = this;

        this.minAreaText = document.getElementById("min-area-text");
        this.minAreaSlider = document.getElementById("min-area-slider");

        this.minConfidenceText = document.getElementById("min-confidence-text");
        this.minConfidenceSlider = document.getElementById(
            "min-confidence-slider"
        );

        this.maxOverlapText = document.getElementById("max-overlap-text");
        this.maxOverlapSlider = document.getElementById("max-overlap-slider");

        this.saveButton = document.getElementById("save-setting-button");
        this.cancelButton = document.getElementById("cancel-setting-button");
        this.config = new LabelConfig();
        return this;
    }

    enable() {
        this.enableMinAreaSlider();
        this.enableMinConfidenceSlider();
        this.enableMaxOverlapSlider();
        this.enableSaveButton();
        this.enableCancelButton();
        this.loadConfig(this.config);
    }
    
    initSliders() {
        const sliderBlocks = document.querySelectorAll('.settings-group .slider-blk');
        sliderBlocks.forEach(item => {
            item.Slider = new Slider(item);
        });
    }

    enableMinAreaSlider() {
        this.minAreaSlider.addEventListener("input", () => {
            const minArea = this.minAreaSlider.value / 100;
            this.config.setMinArea(minArea);
        });
    }

    enableMinConfidenceSlider() {
        this.minConfidenceSlider.addEventListener("input", () => {
            const minConfidence = this.minConfidenceSlider.value / 100;
            this.config.setMinConfidence(minConfidence);
        });
    }

    enableMaxOverlapSlider() {
        this.maxOverlapSlider.addEventListener("input", () => {
            const maxOverlap = this.maxOverlapSlider.value / 100;
            this.config.setMaxIOU(maxOverlap);
        });
    }

    enableSaveButton() {
        this.saveButton.addEventListener("click", () => {
            const configJson = this.config.exportJson();
            // console.log("Save Config: ", configJson);
            eel.update_filter_config(configJson)(() => {
                const core = new Core();
                const dataset = new Dataset();
                core.setCurrentDataByIdx(dataset.getCurrentDataIdx());

                const genernalPopup = new GenernalPopManager();
                genernalPopup.updateLargeText("Saved");
                genernalPopup.updateText("");
                genernalPopup.updateButtonText('OK');
                genernalPopup.setButtonFn(() => {
                    genernalPopup.hide();
                })
                genernalPopup.show();
            });
        });
    }

    enableCancelButton() {
        this.cancelButton.addEventListener("click", () => {
            const core = new Core();
            core.showPage('annotationPage');
        });
    }

    getConfig() {
        return this.config;
    }

    loadConfig(configDict) {
        this.config.importJson(configDict);
        this.displayConfig();
    }

    displayConfig() {
        const configDict = this.config.exportJson();

        this.minAreaSlider.value = configDict.minArea * 100;
        this.minConfidenceSlider.value = configDict.minConfidence * 100;
        this.maxOverlapSlider.value = configDict.maxIOU * 100;

        this.initSliders();
    }
}

function main() {
    const settingPage = new SettingPage();
    settingPage.enable();
}

main();
