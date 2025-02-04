import { ActionManager } from "../action/actionManager.js";
import { MaskSelector } from "../maskSelector.js";
import { MaskCreator } from "../maskCreator.js";
import { ActionPanel } from "./actionPanel.js";
import { Canvas } from "../canvas.js";

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
        this.confirmButton = this.quadratBarDom.querySelector(
            "#quadrat-confirm-button"
        );
        this.backButton = this.quadratBarDom.querySelector(
            "#back-quadrat-button"
        );
    }

    init() {
        this.initQuadratButton();
        this.initClearButton();
        this.initConfirmButton();
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

    initClearButton() {}

    initConfirmButton() {}

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
        this.confirmButton.classList.remove("hidden");
        this.backButton.classList.remove("hidden");
    }

    hide() {
        this.clearButton.classList.add("hidden");
        this.confirmButton.classList.add("hidden");
        this.backButton.classList.add("hidden");
    }
}
