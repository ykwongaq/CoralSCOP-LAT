import { LabelCore } from "../labelCore.js";
import { LoadingPopManager } from "../../util/loadingPopManager.js";
import { FileDialogRequest } from "../../requests/filedialogRequest.js";
import { NavigationBar } from "../../panels/navigationBar.js";
import { Manager } from "../../manager.js";
import { NavigationBarQuickStart } from "../../quickStart/panels/navigationBarQuickStart.js";

export class NavigationBarLabel extends NavigationBarQuickStart {
    static GALLERY_PAGE = "galleryPage";

    constructor(dom) {
        super(dom);

        this.galleryButton = this.dom.querySelector("#gallery-button");
        this.saveButton = this.dom.querySelector("#save-button");
    }

    init() {
        super.init();
        this.initGalleryButton();
    }

    initGalleryButton() {
        this.galleryButton.addEventListener("click", () => {
            this.showPage(NavigationBarLabel.GALLERY_PAGE);
        });
    }

    initSave() {
        super.initSave();

        this.saveButton.addEventListener("click", () => {
            this.disable();
            const loadingPopManager = new LoadingPopManager();
            loadingPopManager.clear();
            loadingPopManager.updateLargeText("Save");
            loadingPopManager.updateText(
                "Saving the current project. Please wait."
            );
            loadingPopManager.show();

            const manager = new Manager();
            const core = manager.getCore();
            // Save the current data first and then save the dataset
            core.save(
                () => {
                    core.saveDataset(
                        null,
                        () => {
                            loadingPopManager.hide();
                            this.enable();
                        },
                        (error) => {
                            console.error(error);
                            loadingPopManager.hide();
                            this.enable();
                            core.popUpError(error);
                        }
                    );
                },
                (error) => {
                    console.error(error);
                    loadingPopManager.hide();
                    this.enable();
                    core.popUpError(error);
                }
            );
        });
    }

    disable() {
        super.disable();
        this.galleryButton.disabled = true;
    }

    enable() {
        super.enable();
        this.galleryButton.disabled = false;
    }

    disableSave() {
        super.disableSave();
        this.saveButton.disabled = true;
    }

    enableSave() {
        super.enableSave();
        this.saveButton.disabled = false;
    }
}
