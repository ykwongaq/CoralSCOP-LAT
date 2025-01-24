class NavigationBar {
    static GALLERY_PAGE = "galleryPage";
    static ANNOTATION_PAGE = "annotationPage";
    static STATISTIC_PAGE = "statisticPage";

    constructor(dom) {
        if (NavigationBar.instance) {
            return NavigationBar.instance;
        }
        NavigationBar.instance = this;
        this.dom = dom;

        this.galleryButton = this.dom.querySelector("#gallery-button");
        this.labelButton = this.dom.querySelector("#label-button");
        this.statisticButton = this.dom.querySelector("#statistic-button");

        this.exportButton = this.dom.querySelector("#file-button");
        this.exportDropDownMenu = this.dom.querySelector("#file-dropdown-menu");
        this.exportImageButton = this.dom.querySelector("#export-image-button");
        this.exportAnnotatedImageButton = this.dom.querySelector(
            "#export-annotated-image-button"
        );
        this.exportCOCOButton = this.dom.querySelector("#export-coco-button");
        this.exportExcelButton = this.dom.querySelector("#export-excel-button");
        this.exportChartsButton = this.dom.querySelector(
            "#export-graph-button"
        );
        this.exportAllButton = this.dom.querySelector("#export-all-button");

        this.saveDropdownButton = this.dom.querySelector(
            "#save-drop-down-button"
        );
        this.saveButton = this.dom.querySelector("#save-button");
        this.saveToButton = this.dom.querySelector("#save-to-button");
        this.saveDropDownMenu = this.dom.querySelector(
            "#file-dropdown-menu-save"
        );

        this.pages = document.querySelectorAll(".page");
        this.currentPageId = null;
    }

    init() {
        this.initGalleryButton();
        this.initLabelButton();
        this.initStatisticButton();
        this.initExportButton();
        this.initSave();
    }

    initGalleryButton() {
        this.galleryButton.addEventListener("click", () => {
            this.showPage(NavigationBar.GALLERY_PAGE);
        });
    }

    initLabelButton() {
        this.labelButton.addEventListener("click", () => {
            this.showPage(NavigationBar.ANNOTATION_PAGE);
        });
    }

    initStatisticButton() {
        this.statisticButton.addEventListener("click", () => {
            this.showPage(NavigationBar.STATISTIC_PAGE);

            const statisticPage = new StatisticPage();
            statisticPage.update();
        });
    }

    initExportButton() {
        this.exportButton.addEventListener("click", () => {
            this.exportDropDownMenu.style.display =
                this.exportDropDownMenu.style.display === "block"
                    ? "none"
                    : "block";
        });

        this.exportImageButton.addEventListener("click", () => {
            const core = new Core();
            core.save(() => {
                core.selectFolder((fileFolder) => {
                    if (fileFolder === null) {
                        return;
                    }

                    const generalPopManager = new GeneralPopManager();
                    generalPopManager.clear();
                    generalPopManager.updateLargeText("Exporting");
                    generalPopManager.updateText(
                        "Exporting the current project. Please wait."
                    );
                    generalPopManager.show();

                    core.exportImages(fileFolder, () => {
                        generalPopManager.hide();
                    });
                });
            });
        });

        this.exportAnnotatedImageButton.addEventListener("click", () => {
            const core = new Core();
            core.save(() => {
                core.selectFolder((fileFolder) => {
                    if (fileFolder === null) {
                        return;
                    }

                    const generalPopManager = new GeneralPopManager();
                    generalPopManager.clear();
                    generalPopManager.updateLargeText("Exporting");
                    generalPopManager.updateText(
                        "Exporting the current project. Please wait."
                    );
                    generalPopManager.show();

                    core.exportAnnotatedImages(fileFolder, () => {
                        generalPopManager.hide();
                    });
                });
            });
        });
        this.exportCOCOButton.addEventListener("click", () => {});
        this.exportExcelButton.addEventListener("click", () => {});
        this.exportChartsButton.addEventListener("click", () => {});
        this.exportAllButton.addEventListener("click", () => {});

        window.addEventListener("click", (event) => {
            if (!event.target.matches("#file-button")) {
                this.exportDropDownMenu.style.display = "none";
            }
        });
    }

    initSave() {
        this.saveDropdownButton.addEventListener("click", () => {
            // When the save button is clicked, show the save dropdown menu
            this.saveDropDownMenu.style.display =
                this.saveDropDownMenu.style.display === "block"
                    ? "none"
                    : "block";
        });

        this.saveButton.addEventListener("click", () => {
            const generalPopManager = new GeneralPopManager();
            generalPopManager.clear();
            generalPopManager.updateLargeText("Save");
            generalPopManager.updateText(
                "Saving the current project. Please wait."
            );
            generalPopManager.show();

            const core = new Core();
            // Save the current data first and then save the dataset
            core.save(() => {
                core.saveDataset(null, () => {
                    generalPopManager.hide();
                });
            });
        });

        this.saveToButton.addEventListener("click", () => {
            const core = new Core();
            core.save(() => {
                core.selectFolder((fileFolder) => {
                    if (fileFolder === null) {
                        return;
                    }

                    const generalPopManager = new GeneralPopManager();
                    generalPopManager.clear();
                    generalPopManager.updateLargeText("Save");
                    generalPopManager.updateText(
                        "Saving the current project. Please wait."
                    );
                    generalPopManager.show();

                    core.saveDataset(fileFolder, () => {
                        generalPopManager.hide();
                    });
                });
            });
        });

        window.addEventListener("click", (event) => {
            if (!event.target.matches("#save-drop-down-button")) {
                this.saveDropDownMenu.style.display = "none";
            }
        });
    }

    showPage(pageId) {
        this.clearActiveState();
        switch (this.currentPageId) {
            case NavigationBar.GALLERY_PAGE:
                // TODO: Handle leaving the gallery page
                break;
            case NavigationBar.ANNOTATION_PAGE:
                // TODO: Handle leaving the annotation page
                break;
            case NavigationBar.STATISTIC_PAGE:
                // TODO: Handle leaving the annotation page
                break;
            default:
                break;
        }

        this.currentPageId = pageId;
        const page = document.getElementById(pageId);
        page.classList.add("active-page");
    }

    getCurrentPageId() {
        return this.currentPageId;
    }

    clearActiveState() {
        for (const page of this.pages) {
            page.classList.remove("active-page");
        }
    }

    disable() {
        this.galleryButton.disabled = true;
        this.labelButton.disabled = true;
        this.statisticButton.disabled = true;
        this.exportButton.disabled = true;
    }

    enable() {
        this.galleryButton.disabled = false;
        this.labelButton.disabled = false;
        this.statisticButton.disabled = false;
        this.exportButton.disabled = false;
    }
}
