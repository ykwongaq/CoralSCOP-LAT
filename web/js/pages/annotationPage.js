import { Page } from "./page.js";

export class AnnotationPage extends Page {
    constructor(dom) {
        super();
        this.dom = null;
        this.canvas = null;
        this.labelPanel = null;
        this.topPanel = null;
        this.actionPanel = null;
        this.viewPanel = null;
    }

    getCanvas() {
        return this.canvas;
    }

    getLabelPanel() {
        return this.labelPanel;
    }

    getTopPanel() {
        return this.topPanel;
    }

    getActionPanel() {
        return this.actionPanel;
    }

    getViewPanel() {
        return this.viewPanel;
    }

    setCanvas(canvas) {
        this.canvas = canvas;
    }

    setLabelPanel(labelPanel) {
        this.labelPanel = labelPanel;
    }

    setTopPanel(topPanel) {
        this.topPanel = topPanel;
    }

    setActionPanel(actionPanel) {
        this.actionPanel = actionPanel;
    }

    setViewPanel(viewPanel) {
        this.viewPanel = viewPanel;
    }

    enterPage() {
        this.canvas.resetViewpoint();
    }
}
