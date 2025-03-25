import { Manager } from "../manager.js";

export class TopPanel {
    constructor(dom) {
        this.dom = dom;

        this.imageNameText = this.dom.querySelector("#progress-info-name");
    }

    init() {}

    update() {
        const manager = new Manager();

        const core = manager.getCore();
        const data = core.getData();

        const imageName = data.getImageName();
        const imageIdx = data.getIdx();
        this.imageNameText.textContent = `${imageIdx + 1}. ${imageName}`;
    }
}
