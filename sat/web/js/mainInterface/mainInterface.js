import { navigateTo } from "../util/navigate.js";

export class MainInterface {
    constructor() {
        if (MainInterface.instance) {
            return MainInterface.instance;
        }
        MainInterface.instance = this;

        this.createProjectButton = document.getElementById(
            "create-project-button"
        );
        this.loadProjectButton = document.getElementById("load-project-button");
        this.quickStartButton = document.getElementById("quick-start-button");
    }

    init() {
        this.createProjectButton.addEventListener("click", () => {
            navigateTo("preprocess.html");
        });

        this.loadProjectButton.addEventListener("click", () => {
            navigateTo("label.html?askLoadProject=true");
        });

        this.quickStartButton.addEventListener("click", () => {
            navigateTo("quickstart.html");
        });
    }
}

function main() {
    const mainPage = new MainInterface();
    mainPage.init();
}

main();
