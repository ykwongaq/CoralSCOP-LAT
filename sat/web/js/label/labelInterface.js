import { LabelCore } from "./labelCore.js";
import { Manager } from "../manager.js";
import { GeneralPopManager } from "../util/index.js";

import { NavigationBarLabel, TopPanelLabel } from "./panels/index.js";

import { LabelPanel, ActionPanel, ViewPanel, Canvas } from "../panels/index.js";

import { navigateTo } from "../util/navigate.js";
import { AnnotationPage, StatisticPage } from "../pages/index.js";
import { GalleryPageLabel } from "./pages/gallleryPageLabel.js";

export class LabelInterface {
    constructor() {
        this.core = null;
        this.annotationPage = null;
        this.galleryPage = null;
        this.statisticPage = null;
        this.navigationBar = null;
    }

    getAnnotationPage() {
        return this.annotationPage;
    }

    getGalleryPage() {
        return this.galleryPage;
    }

    getNavigationBar() {
        return this.navigationBar;
    }

    getStatisticPage() {
        return this.statisticPage;
    }

    init() {
        const manager = new Manager();

        const labelCore = new LabelCore();
        manager.setCore(labelCore);
        manager.setToolInterface(this);

        // AnnotationPage
        const annotationPageDom = document.getElementById("annotationPage");
        this.annotationPage = new AnnotationPage(annotationPageDom);

        // Canvas
        const canvasDom = document.getElementById("canvas");
        const canvas = new Canvas(canvasDom);
        canvas.init();
        this.annotationPage.setCanvas(canvas);

        // Label Panel
        const labelPanelDom = document.getElementById("label-panel");
        const labelPanel = new LabelPanel(labelPanelDom);
        labelPanel.init();
        this.annotationPage.setLabelPanel(labelPanel);

        // Top Panel
        const topPanelDom = document.getElementById("top-panel");
        const topPanel = new TopPanelLabel(topPanelDom);
        topPanel.init();
        this.annotationPage.setTopPanel(topPanel);

        // Action Panel
        const actionPanelDom = document.getElementById("action-panel");
        const actionContainerDom = document.getElementById(
            "actionContainer-bar"
        );
        const actionPanel = new ActionPanel(actionPanelDom, actionContainerDom);
        actionPanel.init();
        this.annotationPage.setActionPanel(actionPanel);

        // View Control Panel
        const viewPanelDom = document.getElementById("view-panel");
        const viewPanel = new ViewPanel(viewPanelDom);
        viewPanel.init();
        this.annotationPage.setViewPanel(viewPanel);

        // Gallery Page
        const galleryPageDom = document.getElementById(
            NavigationBarLabel.GALLERY_PAGE
        );
        this.galleryPage = new GalleryPageLabel(galleryPageDom);
        this.galleryPage.init();

        // Statistic Page
        const statisticPageDom = document.getElementById(
            NavigationBarLabel.STATISTIC_PAGE
        );
        this.statisticPage = new StatisticPage(statisticPageDom);
        this.statisticPage.init();

        // Navigation Bar
        const navigationBarDom = document.getElementById("navigation-bar");
        this.navigationBar = new NavigationBarLabel(navigationBarDom);
        this.navigationBar.init();

        this.navigationBar.addPage(
            NavigationBarLabel.ANNOTATION_PAGE,
            this.annotationPage,
            annotationPageDom
        );
        this.navigationBar.addPage(
            NavigationBarLabel.GALLERY_PAGE,
            this.galleryPage,
            galleryPageDom
        );
        this.navigationBar.addPage(
            NavigationBarLabel.STATISTIC_PAGE,
            this.statisticPage,
            statisticPageDom
        );
    }
}

function main() {
    const labelPage = new LabelInterface();
    labelPage.init();

    const urlParams = new URLSearchParams(window.location.search);
    const manager = new Manager();

    if (urlParams.get("askLoadProject") === "true") {
        const popUpWindow = new GeneralPopManager();
        popUpWindow.clearButtons();
        popUpWindow.updateText("Please select a created project.");
        popUpWindow.addButton("back-button", "Back", () => {
            navigateTo("main_page.html");
        });
        popUpWindow.addButton("load-project-button", "Load Project", () => {
            const core = manager.getCore();
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
            const core = manager.getCore();
            core.loadProject(
                projectPath,
                () => {
                    generalPopManager.hide();
                },
                (error) => {
                    generalPopManager.hide();
                    core.popUpError(error);
                }
            );
        }
    }

    window.onbeforeunload = function (event) {
        // const message = "Are you sure you want to leave?";
        // event.returnValue = message;
        // return message;

        return true;
    };
}

document.addEventListener("DOMContentLoaded", main);
