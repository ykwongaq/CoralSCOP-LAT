import { Core } from "../core.js";

export class TopPanel {
    constructor(dom) {
        if (TopPanel.instance) {
            return TopPanel.instance;
        }
        TopPanel.instance = this;

        this.dom = dom;

        this.imageNameText = this.dom.querySelector("#progress-info-name");
    }

    init() {}

    update() {
        const core = new Core();
        const data = core.getData();

        const imageName = data.getImageName();
        const imageIdx = data.getIdx();
        this.imageNameText.textContent = `${imageIdx + 1}. ${imageName}`;
    }
}
