import { ActionManager } from "../action/actionManager.js";
import { MaskSelector } from "../maskSelector.js";
import { MaskCreator } from "../maskCreator.js";
import { ActionPanel, NavigationBar } from "./index.js";
import { Canvas } from "../canvas.js";
import { Core } from "../core.js";

export class QuadratPanel {
    constructor(actionPanelDom, quadratBarDom) {
        if (QuadratPanel.instance) {
            return QuadratPanel.instance;
        }
        QuadratPanel.instance = this;
        this.actionPanelDom = actionPanelDom;
        this.quadratBarDom = quadratBarDom;

        this.quadratButton =
            this.actionPanelDom.querySelector("#quadrat-button");

        this.clearButton = this.quadratBarDom.querySelector(
            "#quadrat-clear-button"
        );
        this.analysisButton = this.quadratBarDom.querySelector(
            "#quadrat-analysis-button"
        );
        this.backButton = this.quadratBarDom.querySelector(
            "#back-quadrat-button"
        );
    }

    init() {
        this.initQuadratButton();
        this.initClearButton();
        this.initAnalysisButton();
        this.initBackButton();
    }

    initQuadratButton() {
        this.quadratButton.addEventListener("click", () => {
            this.show();

            const actionManager = new ActionManager();
            actionManager.setState(ActionManager.STATE_CREATE_QUADRAT);

            const maskSelector = new MaskSelector();
            maskSelector.clearSelection();

            const maskCreator = new MaskCreator();
            maskCreator.clearPrompts();

            const actionPanel = new ActionPanel();
            actionPanel.hide();

            const canvas = new Canvas();
            canvas.setShowQuadrat(true);
        });
    }

    initClearButton() {
        this.clearButton.addEventListener("click", () => {
            const core = new Core();
            core.setQuadrat(null);
        });
    }

    initAnalysisButton() {
        this.analysisButton.addEventListener("click", () => {
            const core = new Core();
            const quadrat = core.getQuadrat();
            if (quadrat) {
                const navigationBar = new NavigationBar();
                navigationBar.showPage(NavigationBar.COMPLEXITY_PAGE);
            }
        });
    }

    initBackButton() {
        this.backButton.addEventListener("click", () => {
            const actionManager = new ActionManager();
            actionManager.setState(ActionManager.STATE_SELECT_MASK);

            this.hide();

            const actionPanel = new ActionPanel();
            actionPanel.show();

            const maskSelector = new MaskSelector();
            maskSelector.clearSelection();

            const maskCreator = new MaskCreator();
            maskCreator.clearPrompts();

            const canvas = new Canvas();
            canvas.setShowQuadrat(false);
        });
    }

    show() {
        this.clearButton.classList.remove("hidden");
        this.analysisButton.classList.remove("hidden");
        this.backButton.classList.remove("hidden");
    }

    hide() {
        this.clearButton.classList.add("hidden");
        this.analysisButton.classList.add("hidden");
        this.backButton.classList.add("hidden");
    }
}
