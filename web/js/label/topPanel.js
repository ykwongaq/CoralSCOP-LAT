class TopPanel {
    constructor(dom) {
        if (TopPanel.instance) {
            return TopPanel.instance;
        }
        TopPanel.instance = this;

        this.dom = dom;

        this.prevImageButton = this.dom.querySelector("#prev-image-button");
        this.nextImageButton = this.dom.querySelector("#next-image-button");

        this.imageNameText = this.dom.querySelector("#progress-info-name");

        this.galleryButton = this.dom.querySelector("#back-to-gallery");
    }

    init() {
        this.initNextImageButton();
        this.initPrevImageButton();
        this.initGalleryButton();
    }

    initNextImageButton() {
        this.nextImageButton.addEventListener("click", () => {
            // Clear all selected masks
            const maskSelector = new MaskSelector();
            maskSelector.clearSelection();

            // Clear all prompting masks
            const maskCreator = new MaskCreator();
            maskCreator.clearPrompts();

            this.disableButtons();
            const core = new Core();
            core.nextData(() => {
                this.enableButtons();
            });
        });

        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(
            ActionManager.DEFAULT_STATE,
            "d",
            (event) => {
                const labelPanel = new LabelPanel();
                // Check if the input is not in the search input or add category input
                this.nextImageButton.click();
            }
        );
        document.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if (key === "d") {
                actionManager.handleShortCut(key, event);
            }
        });
    }

    initPrevImageButton() {
        this.prevImageButton.addEventListener("click", () => {
            // Clear all selected masks
            const maskSelector = new MaskSelector();
            maskSelector.clearSelection();

            // Clear all prompting masks
            const maskCreator = new MaskCreator();
            maskCreator.clearPrompts();

            this.disableButtons();
            const core = new Core();
            core.prevData(() => {
                this.enableButtons();
            });
        });

        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(
            ActionManager.DEFAULT_STATE,
            "a",
            (event) => {
                const labelPanel = new LabelPanel();
                // Check if the input is not in the search input or add category input
                this.prevImageButton.click();
            }
        );
        document.addEventListener("keydown", (event) => {
            const key = event.key.toLowerCase();
            if (key === "a") {
                actionManager.handleShortCut(key, event);
            }
        });
    }

    initGalleryButton() {
        this.galleryButton.addEventListener("click", () => {
            const navigationBar = new NavigationBar();
            navigationBar.galleryButton.click();
        });
    }

    disableButtons() {
        this.nextImageButton.disabled = true;
        this.prevImageButton.disabled = true;
    }

    enableButtons() {
        this.nextImageButton.disabled = false;
        this.prevImageButton.disabled = false;
    }

    update() {
        const core = new Core();
        const data = core.getData();

        const imageName = data.getImageName();
        this.imageNameText.textContent = imageName;
    }
}
