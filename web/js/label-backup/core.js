class Core {
    constructor() {
        if (Core.instance instanceof Core) {
            return Core.instance;
        }

        Core.instance = this;

        this.projectIsLoaded = false;
        this.defaultPage = document.getElementById("defaultPage");

        return this;
    }

    setProjectLoaded(isLoaded) {
        this.projectIsLoaded = isLoaded;
    }

    isProjectLoaded() {
        return this.projectIsLoaded;
    }

    setCurrentDataByIdx(idx) {
        console.log("Current Data Idx: ", idx);
        let start_time = new Date().getTime();
        const dataset = new Dataset();
        dataset.setCurrentDataIdx(idx);

        var end_time = new Date().getTime();
        console.log("Time to set current data idx: ", end_time - start_time);

        const topNavigationBar = new TopNavigationBar();
        topNavigationBar.showLoadingIcon();
        dataset.getData((response) => {
            var end_time = new Date().getTime();
            console.log("Time to get data: ", end_time - start_time);

            const imageUrl = response["image"];
            const jsonItem = response["json_item"];
            const imageFileName = response["filename"];
            const filteredIndics = response["filtered_indices"];

            if ("filter_config" in response) {
                const filter_config = response["filter_config"];
                const settingPage = new SettingPage();
                settingPage.loadConfig(filter_config);
            }

            const data = new Data(
                imageUrl,
                jsonItem,
                imageFileName,
                filteredIndics
            );

            dataset.setCurrentData(data);

            const canvas = new Canvas();
            canvas.setData(data);
            canvas.draw();

            var end_time = new Date().getTime();
            console.log("Time to draw canvas: ", end_time - start_time);

            eel.set_editting_image_by_idx(idx);

            this.clearEdittedMask();

            this.updateProgressInfo(imageFileName, idx, dataset.totalImages);

            topNavigationBar.restoreIcon();

            var end_time = new Date().getTime();
            console.log("Time to load image: ", end_time - start_time);
        });
    }

    autoStart() {
        eel.get_dataset_size()((size) => {
            if (size > 0) {
                const dataset = new Dataset();
                dataset.setTotalImages(size);
                eel.get_current_image_idx()((idx) => {
                    const topNavigationBar = new TopNavigationBar();
                    topNavigationBar.showLoadingIcon();
                    eel.gen_iou_matrix_by_id(idx)(() => {
                        this.setCurrentDataByIdx(idx);
                    });
                });

                eel.get_label_list()((labelList) => {
                    if (labelList.size === 0) {
                        return;
                    }
                    LabelManager.loadLabels(labelList);

                    const labelView = new LabelView();
                    labelView.updateButtons();
                });
            }
        });
    }

    clearEdittedMask() {
        eel.clear_edit_mask_input_points()(() => {
            const canvas = new Canvas(null);
            canvas.updateEditingResult(null, [], []);
            canvas.setEdittingLabel(null);

            // TODO: Update Label View
            const labelView = new LabelView();
            labelView.removeSelectedColor();
        });
    }

    updateProgressInfo(imageName, currentIdx, totalIdx) {
        const progressInfoView = new ProgressInfoView();
        progressInfoView.setProgressInfo(imageName, currentIdx + 1, totalIdx);
        progressInfoView.setProgressBar(currentIdx + 1, totalIdx);
    }

    loadProject() {
        eel.select_folder()((folder_path) => {
            if (folder_path === null) {
                return;
            }

            eel.is_valid_project_folder(folder_path)((response) => {
                const success = response["success"];
                if (success) {
                    eel.load_project(folder_path)((errorMessage) => {
                        if (errorMessage != null) {
                            alert(errorMessage);
                            return;
                        }

                        this.autoStart();
                        this.setProjectLoaded(true);
                        this.showPage("annotationPage");

                        const popup = new GenernalPopManager();
                        popup.hide();
                    });
                } else {
                    const errorMessage = response["error_message"];
                    alert(errorMessage);
                }
            });
        });
    }

    saveData(callback = null) {
        const dataset = new Dataset();
        const currentData = dataset.getCurrentData();
        const currentDataIdx = dataset.currentDataIdx;
        const json_item = currentData.exportJson();
        eel.save_data(
            json_item,
            currentDataIdx,
            LabelManager.getLabels()
        )(() => {
            if (callback) {
                callback();
            }
        });
    }

    showPage(pageId) {
        const pages = document.querySelectorAll(".page");
        pages.forEach((page) => {
            page.classList.remove("active-page");
        });

        if (this.isProjectLoaded()) {
            const page = document.getElementById(pageId);
            page.classList.add("active-page");

            const bottomBar = new BottomNavigationBar();
            const galleryPage = new GalleryPage();
            galleryPage.disable();

            if (pageId === "annotationPage") {
                const canvas = new Canvas();
                canvas.resetViewpoint();
                bottomBar.reEnable();
                galleryPage.reEnableBackFromLabelButton();
                // galleryPage.setImageTotalImages();
            } else if (pageId === "statisticPage") {
                const statisticPage = new StatisticPage();

                statisticPage.loadGoogleLib().then((data) => {
                    statisticPage.update();
                });

                bottomBar.disable();
            } else if (pageId === "settingPage") {
                const settingPage = new SettingPage();
                settingPage.displayConfig();
                bottomBar.disable();
            } else if (pageId === "galleryPage") {
                galleryPage.reEnable();
                galleryPage.createGalleryList();
            }
        } else {
            this.defaultPage.classList.add("active-page");
        }
    }
}
