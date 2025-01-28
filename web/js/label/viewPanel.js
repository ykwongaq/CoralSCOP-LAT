class ViewPanel {
    constructor(dom) {
        this.dom = dom;

        this.zoomInButton = this.dom.querySelector("#zoomin-viewpoint-button");
        this.zoomOutButton = this.dom.querySelector(
            "#zoomout-viewpoint-button"
        );
        this.resetViewPointButton = this.dom.querySelector(
            "#reset-viewpoint-button"
        );
    }

    init() {
        this.initZoomInButton();
        this.initZoomOutButton();
        this.initResetViewPointButton();
    }

    initZoomInButton() {
        this.zoomInButton.addEventListener("click", () => {
            const canvas = new Canvas();
            canvas.zoomIn();
        });
    }

    initZoomOutButton() {
        this.zoomOutButton.addEventListener("click", () => {
            const canvas = new Canvas();
            canvas.zoomOut();
        });
    }

    initResetViewPointButton() {
        this.resetViewPointButton.addEventListener("click", () => {
            const canvas = new Canvas();
            canvas.resetViewpoint();
        });

        // Register the shortcut for the label toggle button.
        // We need ActionManager to handle the shortcut because
        // different state will have different short cut operation.
        const actionManager = new ActionManager();
        actionManager.registerShortCut(ActionManager.DEFAULT_STATE, "s", () => {
            this.resetViewPointButton.click();
        });
        actionManager.registerShortCut(
            ActionManager.STATE_CREATE_MASK,
            "s",
            () => {
                this.resetViewPointButton.click();
            }
        );
        document.addEventListener("keydown", (event) => {
            if (actionManager.haveRegisteredDocumentEvent(event)) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "s") {
                actionManager.handleShortCut(key, event);
                actionManager.addRegisteredDocumentEvent(event);
            }
        });
    }
}
