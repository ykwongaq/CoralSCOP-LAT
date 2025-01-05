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
    }
}
