class TopNavigationBar {
    constructor() {
        if (TopNavigationBar.instance instanceof TopNavigationBar) {
            return TopNavigationBar.instance;
        }

        TopNavigationBar.instance = this;
        this.iconContainer = document.getElementById("icon");

        this.backToMainPageButton = document.getElementById(
            "back-to-main-page-button"
        );

        this.labelButton = document.getElementById("label-button");
        this.statisticButton = document.getElementById("statistic-button");
        this.settingButton = document.getElementById("setting-button");
        this.galleryButton = document.getElementById("gallery-button");

        this.loadProjectButton = document.getElementById("load-project-button");
        this.exportCOCOButton = document.getElementById("export-coco-button");
        this.exportExcelButton = document.getElementById("export-excel-button");
        this.exportGraphButton = document.getElementById("export-graph-button");
        this.exportAllButton = document.getElementById("export-all-button");

        this.buttons = [
            this.labelButton,
            this.galleryButton,
            this.statisticButton,
            this.settingButton,
        ];

        return this;
    }

    enable() {
        this.enableButtons();
        this.enableFileDropdownMenu();
        this.enableLoadProjectButton();
        this.enableExportCOCOButton();
        this.enableExportExcelButton();
        this.enableExportGraphButton();
        this.enableExportAllButton();
    }

    autoOpenFile() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("autoload") === "true") {
            const popup = new GenernalPopManager();
            popup.updateText("Please select a created project");
            popup.updateButtonText("Load Poroject");
            popup.setButtonFn(() => {
                this.loadProjectButton.click();
            });
            popup.show();
        }
    }

    clearActiveState() {
        for (const button of this.buttons) {
            button.classList.remove("active");
        }
    }

    enableButtons() {
        const core = new Core();
        this.labelButton.addEventListener("click", () => {
            core.showPage("annotationPage");
            this.clearActiveState();
            this.labelButton.classList.add("active");
        });
        this.statisticButton.addEventListener("click", () => {
            core.showPage("statisticPage");
            this.clearActiveState();
            this.statisticButton.classList.add("active");
        });

        this.settingButton.addEventListener("click", () => {
            core.showPage("settingPage");
            this.clearActiveState();
            this.settingButton.classList.add("active");
        });
        this.backToMainPageButton.addEventListener("click", () => {
            core.setProjectLoaded(false);
        });
        this.galleryButton.addEventListener("click", () => {
            core.showPage("galleryPage");
            this.clearActiveState();
            this.galleryButton.classList.add("active");
        });
    }

    enableFileDropdownMenu() {
        const fileButton = document.getElementById("file-button");
        const dropDownMenu = document.getElementById("file-dropdown-menu");

        fileButton.addEventListener("click", () => {
            dropDownMenu.style.display =
                dropDownMenu.style.display === "block" ? "none" : "block";
        });

        window.addEventListener("click", (event) => {
            if (!event.target.matches("#file-button")) {
                dropDownMenu.style.display = "none";
            }
        });
    }

    enableLoadProjectButton() {
        this.loadProjectButton.addEventListener("click", () => {
            const core = new Core();
            core.loadProject();
        });
    }

    enableExportCOCOButton() {
        this.exportCOCOButton.addEventListener("click", () => {
            const core = new Core();
            if (!core.isProjectLoaded()) {
                alert("Please load a project first!");
                return;
            }
            eel.select_folder()((path) => {
                if (path) {
                    core.saveData(() => {
                        console.log("Exporting COCO format... to", path);
                        eel.export_json(path);
                    });
                }
            });
        });
    }

    enableExportExcelButton() {
        this.exportExcelButton.addEventListener("click", () => {
            const core = new Core();
            if (!core.isProjectLoaded()) {
                alert("Please load a project first!");
                return;
            }
            eel.select_folder()((path) => {
                if (path) {
                    this.showLoadingIcon();
                    core.saveData(() => {
                        console.log("Exporting excel ... to", path);
                        eel.export_excel(path)(() => {
                            this.restoreIcon();
                        });
                    });
                }
            });
        });
    }

    enableExportGraphButton() {
        this.exportGraphButton.addEventListener("click", () => {
            const core = new Core();
            if (!core.isProjectLoaded()) {
                alert("Please load a project first!");
                return;
            }
            eel.select_folder()((path) => {
                if (path) {
                    this.showLoadingIcon();
                    core.saveData(() => {
                        console.log("Exporting graph... to", path);
                        eel.export_graph(
                            path,
                            LabelManager.colorList
                        )(() => {
                            this.restoreIcon();
                        });
                    });
                }
            });
        });
    }

    enableExportAllButton() {
        this.exportAllButton.addEventListener("click", () => {
            const core = new Core();
            if (!core.isProjectLoaded()) {
                alert("Please load a project first!");
                return;
            }

            eel.select_folder()((path) => {
                if (path) {
                    this.showLoadingIcon();
                    core.saveData(() => {
                        console.log("Exporting graph... to", path);
                        eel.export_graph(
                            path,
                            LabelManager.colorList
                        )(() => {
                            console.log("Exporting excel ... to", path);
                            eel.export_excel(path)(() => {
                                eel.export_json(path)(() => {
                                    this.restoreIcon();
                                });
                            });
                        });
                    });
                }
            });
        });
    }

    showLoadingIcon() {
        const loadingDiv = document.createElement("div");
        loadingDiv.classList.add("loading-animation");

        this.iconContainer.innerHTML = "";
        this.iconContainer.appendChild(loadingDiv);
    }

    restoreIcon() {
        this.iconContainer.innerHTML = "";

        const image = document.createElement("img");
        image.src = "images/coralscan_icon.png";
        image.alt = "icon";

        this.iconContainer.appendChild(image);
    }
}
