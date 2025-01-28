/**
 * Core of the frontend. It is used to communicate with the backend.
 */
class Core {
    DEFAULT_HISTORY_SIZE = 10;

    constructor() {
        if (Core.instance) {
            return Core.instance;
        }
        Core.instance = this;
        this.data = null;
        this.dataHistoryManager = null;

        this.dataModified = false;

        return this;
    }

    selectFile(callBack = null) {
        eel.select_file()((filePath) => {
            if (filePath === null) {
                return;
            }
            callBack(filePath);
        });
    }

    selectFolder(callBack = null) {
        eel.select_folder()((folderPath) => {
            if (folderPath === null) {
                return;
            }
            callBack(folderPath);
        });
    }

    loadProject(filePath = null, callBack = null) {
        const navigationBar = new NavigationBar();
        navigationBar.disable();

        const loadProject_ = (filePath_, callBack_) => {
            eel.load_project(filePath_)((galleryDataList) => {
                const generalPopManager = new GeneralPopManager();
                generalPopManager.clear();
                generalPopManager.updateLargeText("Loading project...");
                generalPopManager.updateText("Please wait...");
                generalPopManager.show();

                eel.get_current_data()((response) => {
                    // Update the category information
                    const categoryManager = new CategoryManager();
                    categoryManager.updateCategoryList(
                        response["category_info"]
                    );
                    categoryManager.updateStatus(response["status_info"]);

                    const galleryPage = new GalleryPage();
                    galleryPage.updateGallery(galleryDataList);

                    const data = Data.parseResponse(response);
                    this.setData(data);

                    this.dataHistoryManager = new HistoryManager(
                        Core.DEFAULT_HISTORY_SIZE
                    );
                    this.showData();

                    navigationBar.showPage(NavigationBar.ANNOTATION_PAGE);

                    generalPopManager.hide();
                    navigationBar.enable();

                    if (callBack_ != null) {
                        callBack_();
                    }
                });
            });
        };

        if (filePath === null) {
            this.selectFile((filePath_) => {
                if (filePath_ === null) {
                    navigationBar.enable();
                    return;
                }
                loadProject_(filePath_, callBack);
            });
        } else {
            loadProject_(filePath, callBack);
        }
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
        console.log("loading record:", record);
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
    save(callBack = null) {
        const data = this.data.toJson();

        const categoryManager = new CategoryManager();
        const categoryInfo = categoryManager.toJson();
        const statusInfo = categoryManager.getStatusInfo();

        data["category_info"] = categoryInfo;
        data["status_info"] = statusInfo;

        eel.save_data(data)(() => {
            this.setDataModified(false);
            if (callBack != null) {
                callBack();
            }
        });
    }

    nextData(callBack = null) {
        this.save(() => {
            eel.get_next_data()((response) => {
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
                    Core.DEFAULT_HISTORY_SIZE
                );
                this.showData();

                if (callBack != null) {
                    callBack();
                }
            });
        });
    }

    prevData(callBack = null) {
        this.save(() => {
            eel.get_prev_data()((response) => {
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
                    Core.DEFAULT_HISTORY_SIZE
                );
                this.showData();

                if (callBack != null) {
                    callBack();
                }
            });
        });
    }

    jumpData(idx, callBack = null) {
        this.save(() => {
            eel.get_data_by_idx(idx)((response) => {
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
                    Core.DEFAULT_HISTORY_SIZE
                );
                this.showData();

                if (callBack != null) {
                    callBack();
                }
            });
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

    saveDataset(output_dir, callBack = null) {
        eel.save_dataset(output_dir)(() => {
            if (callBack != null) {
                callBack();
            }
        });
    }

    createPromptedMask(prompts) {
        return eel.create_mask(prompts)();
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

        const otherIds = await eel.get_data_ids_by_category_id(
            category.getCategoryId()
        )();
        for (const id of otherIds) {
            // Ignore the current data, since the data is not saved
            if (id === data.getIdx()) {
                continue;
            }
            imageIds.add(id);
        }

        return imageIds;
    }

    exportImages(outputDir, callBack = null) {
        eel.export_images(outputDir)(() => {
            if (callBack != null) {
                callBack();
            }
        });
    }

    exportAnnotatedImages(outputDir, callBack = null) {
        this.getDataList(async (dataList) => {
            const annotatedDataInfoList = [];
            for (const data of dataList) {
                try {
                    const annotationRenderer = new AnnotationRenderer();
                    await annotationRenderer.render(data);
                    const encodedImage = annotationRenderer.getEncodedImage();
                    const imageName = data.getImageName();
                    const annotatedDataInfo = {
                        image_name: imageName,
                        encoded_image: encodedImage,
                    };
                    annotatedDataInfoList.push(annotatedDataInfo);
                } catch (error) {
                    console.error("Failed to export", data.getImageName());
                    console.error(error);
                }
            }

            eel.export_annotated_images(
                outputDir,
                annotatedDataInfoList
            )(() => {
                if (callBack != null) {
                    callBack();
                }
            });
        });
    }

    exportCOCO(outputDir, callBack = null) {
        eel.export_coco(outputDir)(() => {
            if (callBack != null) {
                callBack();
            }
        });
    }

    exportExcel(outputDir, callBack = null) {
        eel.export_excel(outputDir)(() => {
            if (callBack != null) {
                callBack();
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
    async exportCharts(outputDir, callBack = null) {
        const statisticPage = new StatisticPage();
        statisticPage.update();
        const exportImageUrls = await statisticPage.getExportImageUrls();

        const requests = [];
        for (const chartName in exportImageUrls) {
            const encodedChart = exportImageUrls[chartName];
            const request = {
                encoded_chart: encodedChart,
                chart_name: chartName,
            };
            requests.push(request);
        }

        eel.export_charts(
            outputDir,
            requests
        )(() => {
            if (callBack != null) {
                callBack();
            }
        });
    }

    getDataList(callBack = null) {
        eel.get_data_list()((dataInfoList) => {
            const dataList = [];
            for (const dataInfo of dataInfoList) {
                dataList.push(Data.parseResponse(dataInfo));
            }

            if (callBack != null) {
                callBack(dataList);
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
}
