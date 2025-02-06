import { NavigationBar } from "./navigationBar.js";
import { Core } from "../core.js";
import { PointCloudCanvas, ImageBlock, ComplexityTable } from "./index.js";
import { QuadratDepthResponse } from "../../responses/quadratDepthResponse.js";

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

        const quadratImageBlockDom = document.getElementById("quadrat-block");
        this.quadratImageBlock = new ImageBlock(quadratImageBlockDom);

        const depthBlockDom = document.getElementById("depth-block");
        this.depthImageBlock = new ImageBlock(depthBlockDom);

        const complexityTableDom = document.getElementById("complexity-table");
        this.complexityTable = new ComplexityTable(complexityTableDom);
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
        this.noQuadratContent.classList.add("hidden");
        this.haveQuadratContent.classList.add("hidden");

        const core = new Core();
        const quadrat = core.getQuadrat();
        if (quadrat) {
            this.haveQuadratContent.classList.remove("hidden");
            core.getQuadratDepth(quadrat, (response) => {
                const quadratDepthResponse = new QuadratDepthResponse(response);

                this.quadratImageBlock.updateImage(
                    core.getData().getImagePath(),
                    quadrat.getX1(),
                    quadrat.getY1(),
                    quadrat.getX2(),
                    quadrat.getY2()
                );

                this.depthImageBlock.updateImage(
                    quadratDepthResponse.getDepthVisPath(),
                    quadrat.getX1(),
                    quadrat.getY1(),
                    quadrat.getX2(),
                    quadrat.getY2()
                );

                const depthList = quadratDepthResponse.getDepthList();
                const cols = quadratDepthResponse.getCols();
                const rows = quadratDepthResponse.getRows();

                this.pointCloudCanvas
                    .extractColorList(
                        core.getData().getImagePath(),
                        quadrat.getX1(),
                        quadrat.getY1(),
                        quadrat.getX2(),
                        quadrat.getY2()
                    )
                    .then((colorList) => {
                        this.pointCloudCanvas.renderPointCloud(
                            colorList,
                            depthList,
                            rows,
                            cols
                        );
                    })
                    .catch((error) => {
                        core.popUpError(error);
                    });

                core.analyzeComplexity(quadrat, (reportDict) => {
                    this.complexityTable.update(reportDict);
                });
            });
        } else {
            this.noQuadratContent.classList.remove("hidden");
        }
    }
}
