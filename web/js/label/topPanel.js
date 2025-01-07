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
            console.log("1  ");
            this.disableButtons();
            const core = new Core();
            core.nextData(() => {
                this.enableButtons();
            });
        });

        document.addEventListener("keydown", (event) => {
            const labelPanel = new LabelPanel();
            // Check if the input is not in the search input or add category input
            if (
                labelPanel.searchInput !== document.activeElement &&
                labelPanel.addCategoryInput !== document.activeElement
            ) {
                const inputKey = event.key.toLowerCase();
                if (inputKey === "d") {
                    this.nextImageButton.click();
                }
            }
        });
    }

    initPrevImageButton() {
        this.prevImageButton.addEventListener("click", () => {
            this.disableButtons();
            const core = new Core();
            core.prevData(() => {
                this.enableButtons();
            });
        });

        document.addEventListener("keydown", (event) => {
            const labelPanel = new LabelPanel();
            // Check if the input is not in the search input or add category input
            if (
                labelPanel.searchInput !== document.activeElement &&
                labelPanel.addCategoryInput !== document.activeElement
            ) {
                const inputKey = event.key.toLowerCase();
                if (inputKey === "a") {
                    this.prevImageButton.click();
                }
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
