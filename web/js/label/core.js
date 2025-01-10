/**
 * Core of the frontend. It is used to communicate with the backend.
 */
class Core {
    constructor() {
        if (Core.instance) {
            return Core.instance;
        }
        Core.instance = this;
        this.data = null;

        return this;
    }

    loadProject() {
        eel.select_file()((filePath) => {
            if (filePath === null) {
                return;
            }

            eel.load_project(filePath)((galleryDataList) => {
                eel.get_current_data()((response) => {
                    // Update the category information
                    const categoryManager = new CategoryManager();
                    categoryManager.updateCategoryList(
                        response["category_info"]
                    );

                    const galleryPage = new GalleryPage();
                    galleryPage.updateGallery(galleryDataList);

                    const data = Data.parseResponse(response);
                    this.setData(data);
                    this.showData();

                    const navigationBar = new NavigationBar();
                    navigationBar.showPage(NavigationBar.ANNOTATION_PAGE);
                });
            });
        });
    }

    setData(data) {
        this.data = data;
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

        data["category_info"] = categoryInfo;

        eel.save_data(data)(() => {
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

                this.setData(Data.parseResponse(response));
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

                this.setData(Data.parseResponse(response));
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

                this.setData(Data.parseResponse(response));
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

    createPromptedMask(prompts) {
        return eel.create_mask(prompts)();
    }
}
