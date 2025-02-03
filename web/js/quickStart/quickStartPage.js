class QuickStartPage {
    constructor() {
        const core = new Core();
        this.imageInput = document.getElementById("image-input");
    }

    init() {
        // Canvas
        const canvasDom = document.getElementById("canvas");
        const canvas = new Canvas(canvasDom);
        canvas.init();

        // Label Panel
        const labelPanelDom = document.getElementById("label-panel");
        const labelPanel = new LabelPanel(labelPanelDom);
        labelPanel.init();

        // Top Panel
        const topPanelDom = document.getElementById("top-panel");
        const topPanel = new TopPanel(topPanelDom);
        topPanel.init();

        // Action Panel
        const actionPanelDom = document.getElementById("action-panel");
        const actionContainerDom = document.getElementById(
            "actionContainer-bar"
        );
        const actionPanel = new ActionPanel(actionPanelDom, actionContainerDom);
        actionPanel.init();

        // View Control Panel
        const viewPanelDom = document.getElementById("view-panel");
        const viewPanel = new ViewPanel(viewPanelDom);
        viewPanel.init();

        // Navigation Bar
        const navigationBarDom = document.getElementById("navigation-bar");
        const navigationBar = new NavigationBar(navigationBarDom);
        navigationBar.init();

        // Statistic Page
        const statisticPageDom = document.getElementById(
            NavigationBar.STATISTIC_PAGE
        );
        const statisticPage = new StatisticPage(statisticPageDom);
        statisticPage.init();

        // Action Manager
        const actionManager = new ActionManager();

        this.imageInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const loadingPopManager = new LoadingPopManager();
                    loadingPopManager.clear();
                    loadingPopManager.updateLargeText(
                        LoadingPopManager.DEFAULT_TITLE
                    );
                    loadingPopManager.updateText(
                        "Generating image embedding ..."
                    );
                    loadingPopManager.show();

                    const dataUrl = e.target.result;
                    const fileName = file.name;

                    const core = new Core();
                    core.quickStart(
                        dataUrl,
                        fileName,
                        () => {
                            // Do nothing
                        },
                        (error) => {
                            loadingPopManager.hide();
                        }
                    );
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function main() {
    const quickStartPage = new QuickStartPage();
    quickStartPage.init();

    // Ask user for input image
    const generalPopManager = new GeneralPopManager();
    generalPopManager.clear();
    generalPopManager.updateText("Please select an image to start.");
    generalPopManager.addButton("back-button", "Back", () => {
        navigateTo("main_page.html");
    });
    generalPopManager.addButton("select-image-button", "Select Image", () => {
        generalPopManager.hide();
        quickStartPage.imageInput.click();
    });
    generalPopManager.show();
}

document.addEventListener("DOMContentLoaded", main, { once: true });
