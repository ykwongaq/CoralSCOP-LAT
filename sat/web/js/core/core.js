import { ErrorPopManager } from "../util/index.js";
import { FileDialogRequest } from "../requests/filedialogRequest.js";

export class Core {
    static ISSUE_URL = "https://github.com/ykwongaq/CoralSCOP-LAT/issues";

    constructor() {}

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
