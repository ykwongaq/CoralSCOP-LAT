import { NavigationBar } from "./navigationBar.js";
import { Core } from "../core.js";
import { PointCloudCanvas } from "./pointCloudCanvas.js";

export class ComplexityPage {
    constructor(dom) {
        this.dom = dom;

        this.noQuadratContent = document.getElementById("no-quadrat-content");
        this.haveQuadratContent = document.getElementById(
            "have-quadrat-content"
        );
        this.backLabelButton = document.getElementById(
            "complexity-label-button"
        );

        this.pointCloudCanvasDom =
            document.getElementById("point-cloud-canvas");
        this.pointCloudCanvas = new PointCloudCanvas(this.pointCloudCanvasDom);
    }

    init() {
        this.initBackLabelButton();
        this.pointCloudCanvas.init();
    }

    initBackLabelButton() {
        this.backLabelButton.addEventListener("click", () => {
            const navigationBar = new NavigationBar();
            navigationBar.showPage(NavigationBar.ANNOTATION_PAGE);
        });
    }

    update() {
        // Hide all content
        this.noQuadratContent.style.display = "none";
        this.haveQuadratContent.style.display = "none";

        const core = new Core();
        const quadrat = core.getQuadrat();
        if (quadrat) {
            this.haveQuadratContent.style.display = "block";
            this.pointCloudCanvas.startRender();
        } else {
            this.noQuadratContent.style.display = "block";
        }
    }
}
