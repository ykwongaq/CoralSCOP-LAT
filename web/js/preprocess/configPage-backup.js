class PreprocessConfigPage {
    constructor(page, toggleButton) {
        this.page = page;
        this.toggleButton = toggleButton;
        this.saveButton = this.page.querySelector("#save-button");

        this.outputDirInput = this.page.querySelector("#output-folder-input");

        this.config = new PreprocessConfig();
    }

    enable() {
        this.enableToggleButton();
        this.enableDocument();
        this.enableSaveButton();
    }

    enableDocument() {
        document.addEventListener("click", (event) => {
            // Only close the sidebar if it is left click
            if (event.button === 0) {
                if (this.page.classList.contains("active")) {
                    if (
                        !this.page.contains(event.target) &&
                        !event.target.classList.contains("toggle-button")
                    ) {
                        this.page.classList.remove("active");
                        this.toggleButton.style.right = "20px";
                    }
                }
            }
        });
    }

    enableSaveButton() {
        this.saveButton.addEventListener("click", () => {
            this.config.setOutputDir(this.outputDirInput.value);
            const configJson = this.config.exportJson();
            eel.update_preprocess_config(configJson);
        });
    }

    getConfig() {
        return this.config;
    }

    enableToggleButton() {
        this.toggleButton.addEventListener("click", () => {
            const isActive = this.page.classList.toggle("active");
            this.toggleButton.style.right = isActive ? "320px" : "20px";
        });
    }
}
