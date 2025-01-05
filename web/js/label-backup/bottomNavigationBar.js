class BottomNavigationBar {
    constructor() {
        this.prevImageButton = document.getElementById("prev-image-button");
        this.nextImageButton = document.getElementById("next-image-button");
        this.resetViewPoint = document.getElementById("reset-viewpoint-button");
        this.toogleMaskButton = document.getElementById("toogle-mask-button");
        this.zoomInButton = document.getElementById("zoomin-viewpoint-button");
        this.zoomOutButton = document.getElementById("zoomout-viewpoint-button");
        this.backToGalleryButton = document.getElementById("back-to-gallery");
    }

    enable() {
        this.enablePrevImageButton();
        this.enableNextImageButton();
        this.enableResetViewPointButton();
        this.enableToogleMaskButton();
        this.enableZoomInButton();
        this.enableZoomOutButton();
        this.enableBackToGalleryButton();
    }

    disable() {
        this.disablePrevImageButton();
        this.disableNextImageButton();
        this.disableResetViewPointButton();
        this.disableToogleMaskButton();
        this.disableZoomInButton();
        this.disableZoomOutButton();
        this.disableBackToGalleryButton();
    }

    reEnable() {
        this.reEnablePrevImageButton();
        this.reEnableNextImageButton();
        this.reEnableResetViewPointButton();
        this.reEnableToogleMaskButton();
        this.reEnableZoomInButton();
        this.reEnableZoomOutButton();
        this.reEnableBackToGalleryButton();
    }

    disablePrevImageButton() {
        this.prevImageButton.disabled = true;
    }

    reEnablePrevImageButton() {
        this.prevImageButton.disabled = false;
    }

    disableNextImageButton() {
        this.nextImageButton.disabled = true;
    }

    reEnableNextImageButton() {
        this.nextImageButton.disabled = false;
    }

    disableResetViewPointButton() {
        this.resetViewPoint.disabled = true;
    }

    reEnableResetViewPointButton() {
        this.resetViewPoint.disabled = false;
    }

    disableToogleMaskButton() {
        this.toogleMaskButton.disabled = true;
    }

    reEnableToogleMaskButton() {
        this.toogleMaskButton.disabled = false;
    }

    disableZoomInButton() {
        this.zoomInButton.disabled = true;
    }

    reEnableZoomInButton() {
        this.zoomInButton.disabled = false;
    }

    disableZoomOutButton() {
        this.zoomOutButton.disabled = true;
    }

    reEnableZoomOutButton() {
        this.zoomOutButton.disabled = false;
    }

 
    disableBackToGalleryButton() {
        this.backToGalleryButton.disabled = true;
    }

    reEnableBackToGalleryButton() {
        this.backToGalleryButton.disabled = false;
    }

    enablePrevImageButton() {
        this.prevImageButton.addEventListener("click", () => {
            const loading = new LoadingIconManager();
            loading.showLoadingIcon();
            const core = new Core();
            core.saveData();

            const dataset = new Dataset();
            if (dataset.currentDataIdx > 0) {
                core.setCurrentDataByIdx(dataset.currentDataIdx - 1);
            }
            loading.hideLoadingIcon();
        });

        const labelView = new LabelView();
        const searchInput = labelView.searchInput;
        const addCategoryInput = labelView.addCategoryInput;

        document.addEventListener("keydown", (event) => {
            if (
                searchInput !== document.activeElement &&
                addCategoryInput !== document.activeElement
            ) {
                const inputKey = event.key.toLowerCase();
                if (inputKey === "a") {
                    this.prevImageButton.click();
                }
            }
        });
    }

    enableNextImageButton() {
        this.nextImageButton.addEventListener("click", () => {
            const loading = new LoadingIconManager();
            loading.showLoadingIcon();
            const core = new Core();
            core.saveData();

            const dataset = new Dataset();
            if (dataset.currentDataIdx < dataset.totalImages - 1) {
                core.setCurrentDataByIdx(dataset.currentDataIdx + 1);
            }
            loading.hideLoadingIcon();
        });

        const labelView = new LabelView();
        const searchInput = labelView.searchInput;
        const addCategoryInput = labelView.addCategoryInput;

        document.addEventListener("keydown", (event) => {
            if (
                searchInput !== document.activeElement &&
                addCategoryInput !== document.activeElement
            ) {
                const inputKey = event.key.toLowerCase();
                if (inputKey === "d") {
                    this.nextImageButton.click();
                }
            }
        });
    }

    enableResetViewPointButton() {
        this.resetViewPoint.addEventListener("click", () => {
            const canvas = new Canvas(null);
            canvas.resetViewpoint();
        });

        const labelView = new LabelView();
        const searchInput = labelView.searchInput;
        const addCategoryInput = labelView.addCategoryInput;

        document.addEventListener("keydown", (event) => {
            if (
                searchInput !== document.activeElement &&
                addCategoryInput !== document.activeElement
            ) {
                if (event.key.toLowerCase() === "w") {
                    this.resetViewPoint.click();
                }
            }
        });
    }

    enableToogleMaskButton() {
        this.toogleMaskButton.addEventListener("click", () => {
            const canvas = new Canvas(null);
            const isShowMask = canvas.isShowingMask();
            if (isShowMask) {
                canvas.setShowMask(false);
                this.toogleMaskButton.textContent = "Show Mask (S)";
            } else {
                canvas.setShowMask(true);
                this.toogleMaskButton.textContent = "Hide Mask (S)";
            }
        });

        document.addEventListener("keydown", (event) => {
            const labelView = new LabelView();
            const searchInput = labelView.searchInput;
            const addCategoryInput = labelView.addCategoryInput;

            if (
                searchInput !== document.activeElement &&
                addCategoryInput !== document.activeElement
            ) {
                if (event.key.toLowerCase() === "s") {
                    this.toogleMaskButton.click();
                }
            }
        });
    }

    enableZoomInButton() {
        this.zoomInButton.addEventListener("click", (event) => {
            event.preventDefault();
            const canvas = new Canvas();
            canvas.zoomIn();
        });
    }

    enableZoomOutButton() {
        this.zoomOutButton.addEventListener("click", (event) => {
            event.preventDefault();
            const canvas = new Canvas();
            canvas.zoomOut();
        });
    }

    enableBackToGalleryButton() {
        this.backToGalleryButton.addEventListener("click", (event) => {
            event.preventDefault();
            const core = new Core();
            const topNavigationBar = new TopNavigationBar();
            topNavigationBar.galleryButton.click();
        })
    }
}
