import { LoadingPopManager } from "../../util/loadingPopManager.js";
import { FileDialogRequest } from "../../requests/filedialogRequest.js";
import { NavigationBar } from "../../panels/navigationBar.js";
import { Manager } from "../../manager.js";

export class NavigationBarQuickStart extends NavigationBar {
    static ANNOTATION_PAGE = "annotationPage";
    static STATISTIC_PAGE = "statisticPage";
    static SETTING_PAGE = "settingPage";

    constructor(dom) {
        super();
        this.dom = dom;

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
        this.saveButton = this.dom.querySelector("#save-button");
        this.saveToButton = this.dom.querySelector("#save-to-button");
        this.saveDropDownMenu = this.dom.querySelector(
            "#file-dropdown-menu-save"
        );

        this.pages = {};
        this.currentPage = null;
    }

    init() {
        super.init();
        this.initLabelButton();
        this.initStatisticButton();
        this.initSettingButton();
        this.initExportButton();
        this.initSave();
    }

    initLabelButton() {
        this.labelButton.addEventListener("click", () => {
            this.showPage(NavigationBarQuickStart.ANNOTATION_PAGE);
        });
    }

    initSettingButton() {
        this.settingButton.addEventListener("click", () => {
            this.showPage(NavigationBarQuickStart.SETTING_PAGE);
        });
    }

    initStatisticButton() {
        this.statisticButton.addEventListener("click", () => {
            this.showPage(NavigationBarQuickStart.STATISTIC_PAGE);
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
            const manager = new Manager();
            const core = manager.getCore();
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
                            core.popUpError(error);
                        }
                    );
                });
            });
        });

        this.exportAnnotatedImageButton.addEventListener("click", () => {
            const manager = new Manager();
            const core = manager.getCore();
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
                            core.popUpError(error);
                        }
                    );
                });
            });
        });

        this.exportCOCOButton.addEventListener("click", () => {
            const manager = new Manager();
            const core = manager.getCore();
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
                            core.popUpError(error);
                        }
                    );
                });
            });
        });

        this.exportExcelButton.addEventListener("click", () => {
            const manager = new Manager();
            const core = manager.getCore();
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
                            core.popUpError(error);
                        }
                    );
                });
            });
        });

        this.exportChartsButton.addEventListener("click", () => {
            const manager = new Manager();
            const core = manager.getCore();
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
                            core.popUpError(error);
                        }
                    );
                });
            });
        });

        this.exportAllButton.addEventListener("click", () => {
            const manager = new Manager();
            const core = manager.getCore();
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
                                            loadingPopManager.hide();
                                            this.enable();
                                        },
                                        (error) => {
                                            console.error(error);
                                            loadingPopManager.hide();
                                            this.enable();
                                            core.popUpError(error);
                                        }
                                    );
                                },
                                (error) => {
                                    console.error(error);
                                    loadingPopManager.hide();
                                    this.enable();
                                    core.popUpError(error);
                                }
                            );
                        },
                        (error) => {
                            console.error(error);
                            loadingPopManager.hide();
                            this.enable();
                            core.popUpError(error);
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
            const manager = new Manager();
            const core = manager.getCore();
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
                                    core.popUpError(error);
                                }
                            );
                        },
                        (error) => {
                            console.error(error);
                            this.enable();
                            core.popUpError(error);
                        }
                    );
                },
                (error) => {
                    console.error(error);
                    this.enable();
                    core.popUpError(error);
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
        if (this.currentPage) {
            this.currentPage.leavePage();
        }
        this.clearActiveState();
        const [page, pageDom] = this.pages[pageId];
        pageDom.classList.add("active-page");
        page.enterPage();
        this.currentPage = page;
    }

    addPage(pageId, page, pageDom) {
        this.pages[pageId] = [page, pageDom];
    }

    clearPages() {
        this.pages = {};
    }

    getCurrentPageId() {
        return this.currentPageId;
    }

    clearActiveState() {
        for (const [page, pageDom] of Object.values(this.pages)) {
            pageDom.classList.remove("active-page");
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
        this.exportAllButton.disabled = false;
        this.exportExcelButton.disabled = false;
        this.exportChartsButton.disabled = false;
    }

    disableSave() {
        this.saveToButton.disabled = true;
    }

    enableSave() {
        this.saveToButton.disabled = false;
    }
}
