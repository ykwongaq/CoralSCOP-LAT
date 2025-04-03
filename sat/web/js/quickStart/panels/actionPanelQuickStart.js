import { ActionPanel } from "../../panels/index.js";
import { Manager } from "../../manager.js";
import { LoadingPopManager } from "../../util/index.js";
import { CreateProjectRequest } from "../../requests/index.js";

export class ActionPanelQuickStart extends ActionPanel {
    constructor(actionPanel, actionContainerDom) {
        super(actionPanel, actionContainerDom);
        this.detectCoralButton = this.actionPanelDom.querySelector(
            "#detect-coral-button"
        );
    }

    init() {
        super.init();
        this.initDetectCoralButton();
    }

    initDetectCoralButton() {
        this.detectCoralButton.addEventListener("click", () => {
            const loadingPopManager = new LoadingPopManager();
            loadingPopManager.clear();
            loadingPopManager.updateLargeText("Detecting Coral");
            loadingPopManager.updateText("Please wait ...");
            loadingPopManager.show();
            const manager = new Manager();
            const core = manager.getCore();

            console.log("Detecting Coral");
            core.save(
                () => {
                    // Reuse the create project request to store the configuration
                    const createProjectRequest = new CreateProjectRequest();
                    const configPage = manager
                        .getToolInterface()
                        .getConfigPage();
                    const config = configPage.getConfig();
                    createProjectRequest.setConfig(config);

                    core.detectCoral(
                        createProjectRequest,
                        () => {
                            loadingPopManager.hide();
                        },
                        () => {
                            loadingPopManager.hide();
                        }
                    );
                },
                (error) => {
                    loadingPopManager.hide();
                }
            );
        });
    }
}
