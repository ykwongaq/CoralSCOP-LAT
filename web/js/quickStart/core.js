import { Record, HistoryManager } from "./historyManager.js";
import { Canvas } from "./canvas.js";
import { MaskSelector } from "./maskSelector.js";
import { MaskCreator } from "./maskCreator.js";
import { FileDialogRequest, CreateProjectRequest } from "../requests/index.js";
import { AnnotationRenderer } from "./annotationRenderer.js";

import { Data, CategoryManager } from "./data/index.js";

import { LabelPanel } from "./panels/index.js";
import { ActionPanel, TopPanel, NavigationBar } from "./panels/index.js";

import { ErrorPopManager, LoadingPopManager } from "../util/index.js";

/**
 * Core of the frontend. It is used to communicate with the backend.
 */
export class Core {
    static DEFAULT_HISTORY_SIZE = 10;
    static ISSUE_URL = "https://github.com/ykwongaq/CoralSCOP-LAT/issues";

    constructor() {
        if (Core.instance) {
            return Core.instance;
        }
        Core.instance = this;
        this.data = null;
        this.dataHistoryManager = null;

        this.dataModified = false;
        this.quadrat = null;

        return this;
    }

    /**
     * Select a path to the file
     * @param {FileDialogRequest} request
     * @param {function} callBack
     */
    selectFile(request, callBack = null, errorCallBack = null) {
        if (request === null) {
            request = new FileDialogRequest();
            request.setTitle("Select File");
        }

        eel.select_file(request.toJson())()
            .then((filePath) => {
                if (callBack) {
                    callBack(filePath);
                }
            })
            .catch((error) => {
                if (errorCallBack) {
                    errorCallBack(error);
                } else {
                    this.popUpError(error);
                }
            });
    }

    /**
     * Select a path to the folder
     * @param {FileDialogRequest} request
     * @param {function} callBack
     */
    selectFolder(request, callBack = null, errorCallBack = null) {
        if (request === null) {
            request = new FileDialogRequest();
            request.setTitle("Select Folder");
        }

        eel.select_folder(request.toJson())()
            .then((folderPath) => {
                if (callBack) {
                    callBack(folderPath);
                }
            })
            .catch((error) => {
                if (errorCallBack) {
                    errorCallBack(error);
                } else {
                    this.popUpError(error);
                }
            });
    }

    /**
     * Select a file path to save a file
     * @param {FileDialogRequest} request
     * @param {function} callBack
     */
    selectSaveFile(request, callBack = null, errorCallBack = null) {
        eel.select_save_file(request.toJson())()
            .then((filePath) => {
                if (callBack) {
                    callBack(filePath);
                }
            })
            .catch((error) => {
                if (errorCallBack) {
                    errorCallBack(error);
                } else {
                    this.popUpError(error);
                }
            });
    }

    quickStart(imageUrl, imageName, callback = null, errorCallBack = null) {
        const createProjectRequest = new CreateProjectRequest();
        createProjectRequest.setOutputPath(null);
        createProjectRequest.setConfig(null);
        createProjectRequest.setNeedSegmentation(false);
        createProjectRequest.addInput(imageUrl, imageName);

        eel.create_project(createProjectRequest.toJson())()
            .then(() => {
                if (callback) {
                    callback();
                }
            })
            .catch((error) => {
                if (errorCallBack) {
                    errorCallBack(error);
                }
                this.popUpError(error);
            });
    }

    setData(data) {
        this.data = data;
    }

    /**
     * Record current data into the history
     */
    recordData() {
        const categoryManager = new CategoryManager();
        const categoryInfo = structuredClone(categoryManager.toJson());
        const data = this.getData();
        const record = new Record(data.deepCopy(), categoryInfo);
        this.dataHistoryManager.record(record);
    }

    loadRecord(record) {
        // Clear all selected masks
        const maskSelector = new MaskSelector();
        maskSelector.clearSelection();

        // Clear all prompting masks
        const maskCreator = new MaskCreator();
        maskCreator.clearPrompts();

        const data = record.getData();
        const categoryInfo = record.getCategoryInfo();

        const categoryManager = new CategoryManager();
        categoryManager.updateCategoryList(categoryInfo);

        this.setData(data);
        this.showData();
    }

    getData() {
        return this.data;
    }

    /**
     * Save the current data
     * {
     *   "images": List[Dict]
     *   "annotations": List[Dict]
     *   "category_info": List[Dict]
     * }
     * @param {function} callBack
     */
    save(callBack = null, errorCallBack = null) {
        const data = this.data.toJson();

        const categoryManager = new CategoryManager();
        const categoryInfo = categoryManager.toJson();
        const statusInfo = categoryManager.getStatusInfo();

        data["category_info"] = categoryInfo;
        data["status_info"] = statusInfo;

        eel.save_data(data)()
            .then(() => {
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
    }

    showData() {
        const canvas = new Canvas();
        canvas.showData(this.data);

        const labelPanel = new LabelPanel();
        labelPanel.updateCategoryButtons();

        const actionPanel = new ActionPanel();
        actionPanel.updateCategoryButtons();

        const topPanel = new TopPanel();
        topPanel.update();
    }

    saveDataset(filePath, callBack = null, errorCallBack = null) {
        eel.save_dataset(filePath)()
            .then(() => {
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
    }

    createPromptedMask(prompts, callBack = null, errorCallBack = null) {
        eel.create_mask(prompts)()
            .then((annotation) => {
                if (callBack != null) {
                    callBack(annotation);
                }
            })
            .catch((error) => {
                if (errorCallBack != null) {
                    errorCallBack(error);
                }
                this.popUpError(error);
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

    exportImages(outputDir, callBack = null, errorCallBack = null) {
        eel.export_images(outputDir)()
            .then(() => {
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
    }

    exportAnnotatedImages(outputDir, callBack = null, errorCallBack = null) {
        this.getDataList(async (dataList) => {
            const loadingPopManager = new LoadingPopManager();

            let idx = 0;
            const dataLen = dataList.length;

            for (const data of dataList) {
                try {
                    const annotatedDataInfoList = [];
                    const annotationRenderer = new AnnotationRenderer();
                    await annotationRenderer.render(data);
                    const encodedImage = annotationRenderer.getEncodedImage();
                    const imageName = data.getImageName();
                    const annotatedDataInfo = {
                        image_name: imageName,
                        encoded_image: encodedImage,
                    };
                    annotatedDataInfoList.push(annotatedDataInfo);

                    await eel
                        .export_annotated_images(
                            outputDir,
                            annotatedDataInfoList
                        )()
                        .catch((error) => {
                            if (errorCallBack != null) {
                                errorCallBack(error);
                            }
                            this.popUpError(error);
                            return;
                        });

                    idx += 1;
                    if (loadingPopManager.isShowing()) {
                        loadingPopManager.updatePercentage(
                            ((idx / dataLen) * 100).toFixed(2)
                        );
                    }

                    const terminate =
                        loadingPopManager.getProperty("terminate");
                    if (terminate) {
                        loadingPopManager.hide();
                        return;
                    }
                } catch (error) {
                    if (errorCallBack != null) {
                        errorCallBack(error);
                    }
                    this.popUpError(error);
                }
            }

            if (callBack != null) {
                callBack();
            }
        });
    }

    exportCOCO(outputPath, callBack = null, errorCallBack = null) {
        eel.export_coco(outputPath)()
            .then(() => {
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
                }
                this.popUpError(error);
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
                }
                this.popUpError(error);
            });
    }

    getDataList(callBack = null, errorCallBack = null) {
        eel.get_data_list()()
            .then((dataInfoList) => {
                const dataList = [];
                for (const dataInfo of dataInfoList) {
                    dataList.push(Data.parseResponse(dataInfo));
                }

                if (callBack != null) {
                    callBack(dataList);
                }
            })
            .catch((error) => {
                if (errorCallBack != null) {
                    errorCallBack(error);
                }
                this.popUpError(error);
            });
    }

    undo() {
        const data = this.getData();

        const categoryManager = new CategoryManager();
        const categoryInfo = structuredClone(categoryManager.toJson());
        const record = new Record(data.deepCopy(), categoryInfo);

        const prevRecord = this.dataHistoryManager.undo(record);
        if (prevRecord === null) {
            return;
        }
        this.loadRecord(prevRecord);
    }

    redo() {
        const nextRecord = this.dataHistoryManager.redo();
        if (nextRecord === null) {
            return;
        }
        this.loadRecord(nextRecord);
    }

    popUpError(error, shownMessage = null) {
        const errorPopManager = new ErrorPopManager();
        errorPopManager.clear();
        errorPopManager.updateLargeText("Error");
        errorPopManager.updateText(
            shownMessage
                ? shownMessage
                : `Please re-launch the application. Or report the issue to the developer via <a href="${Core.ISSUE_URL}" target="_blank">Github</a>`
        );
        errorPopManager.addButton("OK", "OK", () => {
            errorPopManager.hide();
        });

        let errorMsg =
            "Error Message:\n\n" +
            error.errorText +
            "\n\n" +
            error.errorTraceback;
        errorPopManager.updateTextBox(errorMsg);
        errorPopManager.show();
        console.error(error);
    }

    loadProject(filePath = null, callBack = null, errorCallBack = null) {
        const navigationBar = new NavigationBar();
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
                            categoryManager.updateStatus(
                                response["status_info"]
                            );

                            const data = Data.parseResponse(response);
                            this.setData(data);

                            this.dataHistoryManager = new HistoryManager(
                                Core.DEFAULT_HISTORY_SIZE
                            );
                            this.showData();

                            navigationBar.showPage(
                                NavigationBar.ANNOTATION_PAGE
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
                            }
                            this.popUpError(error);
                        });
                })
                .catch((error) => {
                    loadingPopManager.hide();
                    if (errorCallBack != null) {
                        errorCallBack(error);
                    }
                    this.popUpError(error);
                });
        };

        loadProject_(filePath, callBack);
    }

    detectCoral(request, callBack = null, errorCallBack = null) {
        eel.detect_coral(request.toJson())()
            .then((response) => {
                this.recordData();

                const importedData = Data.parseResponse(response);
                const data = this.getData();
                for (const mask of importedData.getMasks()) {
                    data.addMask(mask);
                }

                const canvas = new Canvas();
                canvas.updateMasks();

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
    }

    setCurrentDataFromServer(callback = null, errorCallback = null) {
        eel.get_current_data()()
            .then((response) => {})
            .catch((error) => {
                if (errorCallback) {
                    errorCallback(error);
                }
                this.popUpError();
            });
    }

    getQuadrat() {
        return this.quadrat;
    }

    setQuadrat(quadrat) {
        this.quadrat = quadrat;
        console.log("setting quadrat", quadrat);
    }
}

/**
 * This function will be called in the server side
 * Update the precentage text shown in the loading pop window
 * @param {number} percentage
 */
eel.expose(updateProgressPercentage);
function updateProgressPercentage(percentage) {
    // Do nothing
}

/**
 * This function will be called in the server side.
 * It will be called after the project creation process is done.
 * @param {Object} status
 */
eel.expose(afterProjectCreation);
function afterProjectCreation(status) {
    const loadingPopManager = new LoadingPopManager();
    loadingPopManager.hide();

    if (status["finished"]) {
        const core = new Core();
        core.loadProject();
    } else {
        const errorPopManager = new ErrorPopManager();
        errorPopManager.clear();
        errorPopManager.updateLargeText("Error");
        errorPopManager.updateText(
            "Image embedding generation failed. Please try again."
        );
        errorPopManager.addButton("OK", "OK", () => {
            errorPopManager.hide();
        });
        errorPopManager.show();
    }
}
