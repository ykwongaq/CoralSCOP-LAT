import { LoadingPopManager } from "../util/index.js";
import { PreprocessInterface } from "./preprocessInterface.js";
import { Core } from "../core/core.js";

export class PreprocessCore extends Core {
    constructor() {
        super();
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
    const preprocessPage = new PreprocessInterface();
    preprocessPage.afterProjectCreation(status);
}
