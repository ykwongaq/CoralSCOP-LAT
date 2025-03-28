import { AnnotationCore } from "../core/annotationCore.js";
import { Manager } from "../manager.js";
import { CreateProjectRequest } from "../requests/index.js";
import { LoadingPopManager } from "../util/index.js";
import { QuickStartInterface } from "./quickStartInterface.js";
import { CategoryManager } from "../data/categoryManager.js";
import { Data } from "../data/data.js";
import { HistoryManager } from "../action/historyManager.js";
import { NavigationBarQuickStart } from "./panels/navigationBarQuickStart.js";

export class QuickStartCore extends AnnotationCore {
    constructor() {
        super();
        this.data = null;
        this.dataHistoryManager = null;
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
                            categoryManager.updateStatus(
                                response["status_info"]
                            );

                            const data = Data.parseResponse(response);
                            this.setData(data);

                            this.dataHistoryManager = new HistoryManager(
                                AnnotationCore.DEFAULT_HISTORY_SIZE
                            );
                            this.showData();

                            navigationBar.showPage(
                                NavigationBarQuickStart.ANNOTATION_PAGE
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

        loadProject_(filePath, callBack);
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
        const manager = new Manager();
        const core = manager.getCore();
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
