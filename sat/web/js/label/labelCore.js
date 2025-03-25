import { Record, HistoryManager } from "../action/historyManager.js";

import { MaskSelector } from "../action/maskSelector.js";
import { MaskCreator } from "../action/maskCreator.js";
import { FileDialogRequest } from "../requests/index.js";
import { AnnotationRenderer } from "../panels/annotationRenderer.js";
import { Manager } from "../manager.js";

import { Data, CategoryManager } from "../data/index.js";
import { ErrorPopManager, LoadingPopManager } from "../util/index.js";

import { ActionPanel, LabelPanel, TopPanel } from "../panels/index.js";
import { navigateTo } from "../util/navigate.js";
import { GalleryPage, StatisticPage } from "../pages/index.js";
import { AnnotationCore } from "../core/annotationCore.js";
import { NavigationBarLabel } from "./panels/navigationBarLabel.js";

/**
 * Core of the frontend. It is used to communicate with the backend.
 */
export class LabelCore extends AnnotationCore {
    constructor() {
        super();
        this.data = null;
        this.dataHistoryManager = null;
        this.dataModified = false;
    }

    loadProject(filePath = null, callBack = null, errorCallBack = null) {
        const manager = new Manager();

        const navigationBar = manager.getToolInterface().getNavigationBar();
        navigationBar.disable();

        const loadProject_ = (filePath_, callBack_) => {
            const loadingPopManager = new LoadingPopManager();
            loadingPopManager.clear();
            loadingPopManager.updateLargeText("Loading project...");
            loadingPopManager.updateText("Please wait...");
            loadingPopManager.show();

            eel.load_project(filePath_)()
                .then((galleryDataList) => {
                    eel.get_current_data()()
                        .then((response) => {
                            loadingPopManager.hide();

                            // Update the category information
                            const categoryManager = new CategoryManager();
                            categoryManager.updateCategoryList(
                                response["category_info"]
                            );

                            const galleryPage = manager
                                .getToolInterface()
                                .getGalleryPage();
                            galleryPage.updateGallery(galleryDataList);

                            const data = Data.parseResponse(response);
                            this.setData(data);

                            this.dataHistoryManager = new HistoryManager(
                                AnnotationCore.DEFAULT_HISTORY_SIZE
                            );
                            this.showData();

                            navigationBar.showPage(
                                NavigationBarLabel.ANNOTATION_PAGE
                            );

                            navigationBar.enable();

                            if (callBack_ != null) {
                                callBack_();
                            }
                        })
                        .catch((error) => {
                            loadingPopManager.hide();
                            if (errorCallBack != null) {
                                errorCallBack(error);
                            } else {
                                this.popUpError(error);
                            }
                        });
                })
                .catch((error) => {
                    loadingPopManager.hide();
                    if (errorCallBack != null) {
                        errorCallBack(error);
                    } else {
                        this.popUpError(error);
                    }
                });
        };

        if (filePath === null) {
            const fileDialogRequest = new FileDialogRequest();
            fileDialogRequest.setTitle("Save SAT Project File");
            fileDialogRequest.addFileType("SAT Project File", "*.sat");
            this.selectFile(
                fileDialogRequest,
                (filePath_) => {
                    if (filePath_ === null) {
                        navigationBar.enable();
                        navigateTo("main_page.html");
                        return;
                    }
                    loadProject_(filePath_, callBack);
                },
                (error) => {
                    if (errorCallBack != null) {
                        errorCallBack(error);
                    } else {
                        const errorPopManager = new ErrorPopManager();
                        errorPopManager.clear();
                        errorPopManager.updateLargeText("Error");
                        errorPopManager.updateText(
                            `Please re-launch the application. Or report the issue to the developer via <a href="${Core.ISSUE_URL}" target="_blank">Github</a>`
                        );
                        errorPopManager.addButton("OK", "OK", () => {
                            errorPopManager.hide();
                            navigateTo("main_page.html");
                        });

                        let errorMsg =
                            "Error Message:\n\n" +
                            error.errorText +
                            "\n\n" +
                            error.errorTraceback;
                        errorPopManager.updateTextBox(errorMsg);
                        errorPopManager.show();
                    }
                }
            );
        } else {
            loadProject_(filePath, callBack);
        }
    }

    nextData(callBack = null, errorCallBack = null) {
        this.save(() => {
            eel.get_next_data()()
                .then((response) => {
                    if (response === null) {
                        alert("Failed to load next data");
                        return;
                    }

                    // Clear all selected masks
                    const maskSelector = new MaskSelector();
                    maskSelector.clearSelection();

                    // Clear all prompting masks
                    const maskCreator = new MaskCreator();
                    maskCreator.clearPrompts();

                    this.setData(Data.parseResponse(response));

                    this.dataHistoryManager = new HistoryManager(
                        LabelCore.DEFAULT_HISTORY_SIZE
                    );
                    this.showData();

                    if (callBack != null) {
                        callBack();
                    }
                })
                .catch((error) => {
                    if (errorCallBack != null) {
                        errorCallBack(error);
                    }
                    this.popUpError(error);
                });
        });
    }

    prevData(callBack = null, errorCallBack = null) {
        this.save(() => {
            eel.get_prev_data()()
                .then((response) => {
                    if (response === null) {
                        alert("Failed to load previous data");
                        return;
                    }

                    // Clear all selected masks
                    const maskSelector = new MaskSelector();
                    maskSelector.clearSelection();

                    // Clear all prompting masks
                    const maskCreator = new MaskCreator();
                    maskCreator.clearPrompts();

                    this.setData(Data.parseResponse(response));
                    this.dataHistoryManager = new HistoryManager(
                        LabelCore.DEFAULT_HISTORY_SIZE
                    );
                    this.showData();

                    if (callBack != null) {
                        callBack();
                    }
                })
                .catch((error) => {
                    if (errorCallBack != null) {
                        errorCallBack(error);
                    }
                    this.popUpError(error);
                });
        });
    }

    jumpData(idx, callBack = null, errorCallBack = null) {
        this.save(() => {
            eel.get_data_by_idx(idx)()
                .then((response) => {
                    if (response === null) {
                        alert("Failed to load data");
                        return;
                    }

                    // Clear all selected masks
                    const maskSelector = new MaskSelector();
                    maskSelector.clearSelection();

                    // Clear all prompting masks
                    const maskCreator = new MaskCreator();
                    maskCreator.clearPrompts();

                    this.setData(Data.parseResponse(response));
                    this.dataHistoryManager = new HistoryManager(
                        LabelCore.DEFAULT_HISTORY_SIZE
                    );
                    this.showData();

                    if (callBack != null) {
                        callBack();
                    }
                })
                .catch((error) => {
                    if (errorCallBack != null) {
                        errorCallBack(error);
                    }
                    this.popUpError(error);
                });
        });
    }

    setDataModified(modified) {
        this.dataModified = modified;
    }

    isDataModified() {
        return this.dataModified;
    }

    /**
     * Get the list of id of the images that
     * contain the category
     * @param {Category} category
     * @returns {Array} List of image ids that contain the category
     */
    async getImageIdsByCategory(category) {
        const imageIds = new Set();
        const categoryId = category.getCategoryId();

        // Check current data
        const data = this.getData();
        for (const mask of data.getMasks()) {
            if (mask.getCategory().getCategoryId() === categoryId) {
                imageIds.add(data.getIdx());
            }
        }

        const otherIds = await eel
            .get_data_ids_by_category_id(category.getCategoryId())()
            .catch((error) => {
                this.popUpError(error);
            });
        for (const id of otherIds) {
            // Ignore the current data, since the data is not saved
            if (id === data.getIdx()) {
                continue;
            }
            imageIds.add(id);
        }

        return imageIds;
    }

    exportExcel(outputDir, callBack = null, errorCallBack = null) {
        eel.export_excel(outputDir)()
            .then(() => {
                if (callBack != null) {
                    callBack();
                }
            })
            .catch((error) => {
                if (errorCallBack != null) {
                    errorCallBack(error);
                } else {
                    this.popUpError(error);
                }
            });
    }

    /**
     * Send a list of requst to server side to export the chart.
     *
     * Request format:
     * {
     *  "encoded_chart": string,
     *  "chart_name": string
     * }
     * @param {string} outputDir
     * @param {function} callBack
     */
    async exportCharts(outputDir, callBack = null, errorCallBack = null) {
        const statisticPage = new StatisticPage();
        statisticPage.update();
        const exportImageUrls = await statisticPage.getExportImageUrls();
        console.log(exportImageUrls);

        const requests = [];
        for (const chartName in exportImageUrls) {
            const encodedChart = exportImageUrls[chartName];
            const request = {
                encoded_chart: encodedChart,
                chart_name: chartName,
            };
            requests.push(request);
        }

        eel.export_charts(outputDir, requests)()
            .then(() => {
                if (callBack != null) {
                    callBack();
                }
            })
            .catch((error) => {
                if (errorCallBack != null) {
                    errorCallBack(error);
                } else {
                    this.popUpError(error);
                }
            });
    }
}
