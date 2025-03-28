import { Core } from "./core.js";
import { CategoryManager } from "../data/index.js";
import { MaskCreator, MaskSelector } from "../action/index.js";
import { Manager } from "../manager.js";
import { Record, HistoryManager } from "../action/historyManager.js";
import { AnnotationRenderer } from "../panels/annotationRenderer.js";
import { LoadingPopManager } from "../util/loadingPopManager.js";
import { Data } from "../data/index.js";

export class AnnotationCore extends Core {
    static DEFAULT_HISTORY_SIZE = 10;

    constructor() {
        super();
        this.data = null;
        this.dataHistoryManager = new HistoryManager(
            AnnotationCore.DEFAULT_HISTORY_SIZE
        );

        this.quadrat = null;
    }

    setData(data) {
        this.data = data;
    }

    getData() {
        return this.data;
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
        const manager = new Manager();
        const annotationPage = manager.getToolInterface().getAnnotationPage();

        const canvas = annotationPage.getCanvas();
        canvas.showData(this.data);

        const labelPanel = annotationPage.getLabelPanel();
        labelPanel.updateCategoryButtons();

        const actionPanel = annotationPage.getActionPanel();
        actionPanel.updateCategoryButtons();

        const topPanel = annotationPage.getTopPanel();
        topPanel.update();
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
                } else {
                    this.popUpError(error);
                }
            });
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
                } else {
                    this.popUpError(error);
                }
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
                            } else {
                                this.popUpError(error);
                            }
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
                    } else {
                        this.popUpError(error);
                    }
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
                } else {
                    this.popUpError(error);
                }
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
                } else {
                    this.popUpError(error);
                }
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
                } else {
                    this.popUpError(error);
                }
            });
    }
}
