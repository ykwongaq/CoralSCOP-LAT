import { Core } from "../core.js";
import { Canvas } from "../canvas.js";
import { StatisticPage } from "../panels/statisticPage.js";
import { LoadingPopManager } from "../../util/loadingPopManager.js";
import { FileDialogRequest } from "../../requests/filedialogRequest.js";
import { ConfigPage } from "../../preprocess/panels/configPage.js";
import { GeneralPopManager } from "../../util/generalPopManager.js";
import { QuickStartPage } from "../quickStartPage.js";

export class NavigationBar {
    static GALLERY_PAGE = "galleryPage";
    static ANNOTATION_PAGE = "annotationPage";
    static STATISTIC_PAGE = "statisticPage";
    static SETTING_PAGE = "settingPage";

    constructor(dom) {
        if (NavigationBar.instance) {
            return NavigationBar.instance;
        }
        NavigationBar.instance = this;
        this.dom = dom;

        this.importImageButton = this.dom.querySelector("#import-image-button");
        this.labelButton = this.dom.querySelector("#label-button");
        this.statisticButton = this.dom.querySelector("#statistic-button");
        this.settingButton = this.dom.querySelector("#setting-button");

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
        this.saveToButton = this.dom.querySelector("#save-to-button");
        this.saveDropDownMenu = this.dom.querySelector(
            "#file-dropdown-menu-save"
        );

        this.pages = document.querySelectorAll(".page");
        this.currentPageId = null;
    }

    init() {
        this.initImportImageButton();
        this.initLabelButton();
        this.initStatisticButton();
        this.initSettingButton();
        this.initExportButton();
        this.initSave();
    }

    initImportImageButton() {
        this.importImageButton.addEventListener("click", () => {
            // First confirm with user that they want to import image
            const generalPopManager = new GeneralPopManager();
            generalPopManager.clear();
            generalPopManager.updateLargeText("Import Image");
            generalPopManager.updateText(
                "Are you sure you want to import an image? This will clear the current image. Please make sure to save or export your work."
            );
            generalPopManager.addButton("back-button", "Back", () => {
                generalPopManager.hide();
            });
            generalPopManager.addButton("import-button", "Import", () => {
                const quickStartPage = new QuickStartPage();
                quickStartPage.getImageInput().click();
                generalPopManager.hide();
            });
            generalPopManager.show();
        });
    }

    initLabelButton() {
        this.labelButton.addEventListener("click", () => {
            this.showPage(NavigationBar.ANNOTATION_PAGE);
            const canvas = new Canvas();
            canvas.resetViewpoint();
        });
    }

    initStatisticButton() {
        this.statisticButton.addEventListener("click", () => {
            this.showPage(NavigationBar.STATISTIC_PAGE);

            const statisticPage = new StatisticPage();
            statisticPage.update();
        });
    }

    initSettingButton() {
        this.settingButton.addEventListener("click", () => {
            this.showPage(NavigationBar.SETTING_PAGE);
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
                this.disable();
                core.selectFolder(null, (fileFolder) => {
                    if (fileFolder === null) {
                        console.log("No folder selected");
                        this.enable();
                        return;
                    }

                    const loadingPopManager = new LoadingPopManager();
                    loadingPopManager.clear();
                    loadingPopManager.updateLargeText("Exporting");
                    loadingPopManager.updateText(
                        "Exporting the images. Please wait."
                    );
                    loadingPopManager.show();

                    core.exportImages(
                        fileFolder,
                        () => {
                            loadingPopManager.hide();
                            this.enable();
                        },
                        (error) => {
                            console.error(error);
                            loadingPopManager.hide();
                            this.enable();
                        }
                    );
                });
            });
        });

        this.exportAnnotatedImageButton.addEventListener("click", () => {
            const core = new Core();
            core.save(() => {
                this.disable();
                core.selectFolder(null, (fileFolder) => {
                    if (fileFolder === null) {
                        this.enable();
                        return;
                    }

                    const loadingPopManager = new LoadingPopManager();
                    loadingPopManager.clear();
                    loadingPopManager.updateLargeText("Exporting");
                    loadingPopManager.updateText(
                        "Exporting the annotated images. Please wait."
                    );
                    loadingPopManager.addButton("quit-button", "Quit", () => {
                        loadingPopManager.updateLargeText("Terminating");
                        loadingPopManager.updateText(
                            "Terminating the process. Please wait."
                        );
                        loadingPopManager.addProperty("terminate", true);
                    });
                    loadingPopManager.show();

                    core.exportAnnotatedImages(
                        fileFolder,
                        () => {
                            loadingPopManager.hide();
                            this.enable();
                        },
                        (error) => {
                            console.error(error);
                            loadingPopManager.hide();
                            this.enable();
                        }
                    );
                });
            });
        });

        this.exportCOCOButton.addEventListener("click", () => {
            const core = new Core();
            core.save(() => {
                this.disable();

                const request = new FileDialogRequest();
                request.setTitle("Select the folder to save the coco json");
                request.addFileType("COCO JSON File", ["*.json"]);
                request.setDefaultExt(".json");

                core.selectSaveFile(request, (filePath) => {
                    if (filePath === null) {
                        this.enable();
                        return;
                    }

                    const loadingPopManager = new LoadingPopManager();
                    loadingPopManager.clear();
                    loadingPopManager.updateLargeText("Exporting");
                    loadingPopManager.updateText(
                        "Exporting the coco json. Please wait."
                    );
                    loadingPopManager.show();

                    core.exportCOCO(
                        filePath,
                        () => {
                            loadingPopManager.hide();
                            this.enable();
                        },
                        (error) => {
                            console.error(error);
                            loadingPopManager.hide();
                            this.enable();
                        }
                    );
                });
            });
        });

        this.exportExcelButton.addEventListener("click", () => {
            const core = new Core();
            core.save(() => {
                this.disable();
                core.selectFolder(null, (fileFolder) => {
                    if (fileFolder === null) {
                        this.enable();
                        return;
                    }

                    const loadingPopManager = new LoadingPopManager();
                    loadingPopManager.clear();
                    loadingPopManager.updateLargeText("Exporting");
                    loadingPopManager.updateText(
                        "Exporting the excel files. Please wait."
                    );
                    loadingPopManager.show();

                    core.exportExcel(
                        fileFolder,
                        () => {
                            loadingPopManager.hide();
                            this.enable();
                        },
                        (error) => {
                            console.error(error);
                            loadingPopManager.hide();
                            this.enable();
                        }
                    );
                });
            });
        });

        this.exportChartsButton.addEventListener("click", () => {
            const core = new Core();
            core.save(() => {
                this.disable();
                core.selectFolder(null, async (fileFolder) => {
                    if (fileFolder === null) {
                        this.enable();
                        return;
                    }

                    const loadingPopManager = new LoadingPopManager();
                    loadingPopManager.clear();
                    loadingPopManager.updateLargeText("Exporting");
                    loadingPopManager.updateText(
                        "Exporting the charts. Please wait."
                    );
                    loadingPopManager.show();

                    core.exportCharts(
                        fileFolder,
                        () => {
                            loadingPopManager.hide();
                            this.enable();
                        },
                        (error) => {
                            console.error(error);
                            loadingPopManager.hide();
                            this.enable();
                        }
                    );
                });
            });
        });

        this.exportAllButton.addEventListener("click", () => {
            const core = new Core();
            core.save(() => {
                this.disable();
                core.selectFolder(null, (fileFolder) => {
                    if (fileFolder === null) {
                        this.enable();
                        return;
                    }

                    const loadingPopManager = new LoadingPopManager();
                    loadingPopManager.clear();
                    loadingPopManager.updateLargeText("Exporting");
                    loadingPopManager.updateText(
                        "Exporting all the files. Please wait."
                    );
                    loadingPopManager.show();

                    core.exportImages(
                        fileFolder,
                        () => {
                            core.exportAnnotatedImages(
                                fileFolder,
                                () => {
                                    core.exportCOCO(
                                        fileFolder,
                                        () => {
                                            core.exportExcel(
                                                fileFolder,
                                                () => {
                                                    core.exportCharts(
                                                        fileFolder,
                                                        () => {
                                                            loadingPopManager.hide();
                                                            this.enable();
                                                        },
                                                        (error) => {
                                                            console.error(
                                                                error
                                                            );
                                                            loadingPopManager.hide();
                                                            this.enable();
                                                        }
                                                    );
                                                },
                                                (error) => {
                                                    console.error(error);
                                                    loadingPopManager.hide();
                                                    this.enable();
                                                }
                                            );
                                        },
                                        (error) => {
                                            console.error(error);
                                            loadingPopManager.hide();
                                            this.enable();
                                        }
                                    );
                                },
                                (error) => {
                                    console.error(error);
                                    loadingPopManager.hide();
                                    this.enable();
                                }
                            );
                        },
                        (error) => {
                            console.error(error);
                            loadingPopManager.hide();
                            this.enable();
                        }
                    );
                });
            });
        });

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

        this.saveToButton.addEventListener("click", () => {
            const core = new Core();
            core.save(
                () => {
                    this.disable();
                    const fileDialogRequest = new FileDialogRequest();
                    fileDialogRequest.setTitle(
                        "Save CoralSCOP-LAT Project File"
                    );
                    fileDialogRequest.addFileType(
                        "CoralSCOP-LAT Project File",
                        "*.coral"
                    );
                    fileDialogRequest.setDefaultExt(".coral");

                    core.selectSaveFile(
                        fileDialogRequest,
                        (filePath) => {
                            if (filePath === null) {
                                this.enable();
                                return;
                            }

                            const loadingPopManager = new LoadingPopManager();
                            loadingPopManager.clear();
                            loadingPopManager.updateLargeText("Save");
                            loadingPopManager.updateText(
                                "Saving the current project. Please wait."
                            );
                            loadingPopManager.show();

                            core.saveDataset(
                                filePath,
                                () => {
                                    loadingPopManager.hide();
                                    this.enable();
                                },
                                (error) => {
                                    console.error(error);
                                    loadingPopManager.hide();
                                    this.enable();
                                }
                            );
                        },
                        (error) => {
                            console.error(error);
                            this.enable();
                        }
                    );
                },
                (error) => {
                    console.error(error);
                    this.enable();
                }
            );
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
            case NavigationBar.SETTING_PAGE:
                const configPage = new ConfigPage();
                configPage.displayConfig();
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
        this.labelButton.disabled = true;
        this.statisticButton.disabled = true;
        this.exportButton.disabled = true;
        this.disableExport();
        this.disableSave();
    }

    enable() {
        this.labelButton.disabled = false;
        this.statisticButton.disabled = false;
        this.exportButton.disabled = false;
        this.enableExport();
        this.enableSave();
    }

    disableExport() {
        this.exportImageButton.disabled = true;
        this.exportAnnotatedImageButton.disabled = true;
        this.exportCOCOButton.disabled = true;
        this.exportExcelButton.disabled = true;
        this.exportChartsButton.disabled = true;
        this.exportAllButton.disabled = true;
    }

    enableExport() {
        this.exportImageButton.disabled = false;
        this.exportAnnotatedImageButton.disabled = false;
        this.exportCOCOButton.disabled = false;
        this.exportExcelButton.disabled = false;
        this.exportChartsButton.disabled = false;
        this.exportAllButton.disabled = false;
    }

    disableSave() {
        this.saveToButton.disabled = true;
    }

    enableSave() {
        this.saveToButton.disabled = false;
    }
}
