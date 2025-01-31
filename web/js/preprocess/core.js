class Core {
    static ISSUE_URL = "https://github.com/ykwongaq/CoralSCOP-LAT/issues";

    constructor() {
        if (Core.instance) {
            return Core.instance;
        }
        Core.instance = this;
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

    createProject(createProjectRequest, callBack = null, errorCallBack = null) {
        eel.create_project(createProjectRequest.toJson())()
            .then(() => {
                if (callBack) {
                    callBack();
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

    terminateCreateProjectProcess(callBack = null, errorCallBack = null) {
        eel.terminate_create_project_process()()
            .then(() => {
                if (callBack) {
                    callBack();
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
}

/**
 * This function will be called in the server side
 * Update the precentage text shown in the loading pop window
 * @param {number} percentage
 */
eel.expose(updateProgressPercentage);
function updateProgressPercentage(percentage) {
    const loadingPopManager = new LoadingPopManager();
    loadingPopManager.updatePercentage(percentage);
}

/**
 * This function will be called in the server side.
 * It will be called after the project creation process is done.
 * @param {Object} status
 */
eel.expose(afterProjectCreation);
function afterProjectCreation(status) {
    const preprocessPage = new PreprocessPage();
    preprocessPage.afterProjectCreation(status);
}
