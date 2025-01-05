class LabelPage {
    constructor() {
        this.dataset = new Dataset();
        this.topNavigationBar = new TopNavigationBar();
        this.bottomNavigationBar = new BottomNavigationBar();
        this.modeView = new ModeView();
        this.canvas = new Canvas();
        this.opacityView = new OpacityView();
        this.progressInfoView = new ProgressInfoView();
        this.labelView = new LabelView();
    }

    enable() {
        this.topNavigationBar.enable();
        this.modeView.enable();
        this.opacityView.enable();
        this.labelView.enable();
        this.bottomNavigationBar.enable();
    }
}

function main() {
    const labelPage = new LabelPage();
    labelPage.enable();
    labelPage.topNavigationBar.autoOpenFile();

    const core = new Core();
    document.addEventListener("DOMContentLoaded", () => {
        core.showPage("annotationPage");
    });
}

main();
