import { Core } from "./core.js";
import { Canvas } from "./canvas.js";
import { ActionManager } from "./action/actionManager.js";
import { GeneralPopManager } from "../util/index.js";

import {
    LabelPanel,
    TopPanel,
    ActionPanel,
    ViewPanel,
    NavigationBar,
    GalleryPage,
    StatisticPage,
} from "./panels/index.js";

export class LabelPage {
    constructor() {
        this.core = new Core();
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

        // Gallery Page
        const galleryPageDom = document.getElementById(
            NavigationBar.GALLERY_PAGE
        );
        const galleryPage = new GalleryPage(galleryPageDom);
        galleryPage.init();

        // Statistic Page
        const statisticPageDom = document.getElementById(
            NavigationBar.STATISTIC_PAGE
        );
        const statisticPage = new StatisticPage(statisticPageDom);
        statisticPage.init();

        // Action Manager
        const actionManager = new ActionManager();
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
    } else {
        const projectPath = urlParams.get("project_path");
        if (projectPath !== null) {
            const generalPopManager = new GeneralPopManager();
            generalPopManager.clear();
            generalPopManager.updateLargeText("Hold Tight!");
            generalPopManager.updateText("Loading Project...");
            generalPopManager.show();
            const core = new Core();
            core.loadProject(
                projectPath,
                () => {
                    generalPopManager.hide();
                },
                (error) => {
                    generalPopManager.hide();
                }
            );
        }
    }

    window.onbeforeunload = function (event) {
        // const message = "Are you sure you want to leave?";
        // event.returnValue = message;
        // return message;

        const core = new Core();
        console.log(core.getData());
        return core.isDataModified();
    };
}

document.addEventListener("DOMContentLoaded", main);
