class LabelPage {
    constructor() {
        // Init core
        const core = new Core();
    }

    init() {
        // Label Panel
        const labelPanelDom = document.getElementById("label-panel");
        const labelPanel = new LabelPanel(labelPanelDom);
        labelPanel.init();

        // Top Panel
        const topPanelDom = document.getElementById("top-panel");
        const topPanel = new TopPanel(topPanelDom);
        // topPanel.init();

        // Canvas
        const canvasDom = document.getElementById("canvas");
        const canvas = new Canvas(canvasDom);
        canvas.init();

        // Action Panel
        const actionPanelDom = document.getElementById("action-panel");
        const actionPanel = new ActionPanel(actionPanelDom);
        // actionPanel.init();

        const viewPanelDom = document.getElementById("view-panel");
        const viewPanel = new ViewPanel(viewPanelDom);
        viewPanel.init();
    }
}

function main() {
    const labelPage = new LabelPage();
    labelPage.init();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("askLoadProject") === "true") {
        const popUpWindow = new GeneralPopManager();
        popUpWindow.clearButtons();
        popUpWindow.updateText("Please select a created project.");
        popUpWindow.addButton("back-button", "Back", () => {
            navigateTo("main_page.html");
        });
        popUpWindow.addButton("load-project-button", "Load Project", () => {
            const core = new Core();
            core.loadProject();
            popUpWindow.hide();
        });
        popUpWindow.show();
    }
}

main();
