class NavigationBar {
    static GALLERY_PAGE = "galleryPage";
    static ANNOTATION_PAGE = "annotationPage";
    static STATISTIC_PAGE = "statisticPage";

    constructor(dom) {
        if (NavigationBar.instance) {
            return NavigationBar.instance;
        }
        NavigationBar.instance = this;
        this.dom = dom;

        this.galleryButton = this.dom.querySelector("#gallery-button");
        this.labelButton = this.dom.querySelector("#label-button");
        this.statisticButton = this.dom.querySelector("#statistic-button");
        this.exportButton = this.dom.querySelector("#file-button");

        this.pages = document.querySelectorAll(".page");
        this.currentPageId = null;
    }

    init() {
        this.initGalleryButton();
        this.initLabelButton();
        this.initStatisticButton();
        this.initExportButton();
    }

    initGalleryButton() {
        this.galleryButton.addEventListener("click", () => {
            this.showPage(NavigationBar.GALLERY_PAGE);
        });
    }

    initLabelButton() {
        this.labelButton.addEventListener("click", () => {
            this.showPage(NavigationBar.ANNOTATION_PAGE);
        });
    }

    initStatisticButton() {
        this.statisticButton.addEventListener("click", () => {
            this.showPage(NavigationBar.STATISTIC_PAGE);
        });
    }

    initExportButton() {
        this.exportButton.addEventListener("click", () => {
            // TODO: Implement export functionality
        });
    }

    showPage(pageId) {
        this.clearActiveState();
        switch (this.currentPageId) {
            case NavigationBar.GALLERY_PAGE:
                // TODO: Handle leaving the gallery page
                break;
            case NavigationBar.ANNOTATION_PAGE:
                // TODO: Handle leaving the annotation page
                break;
            case NavigationBar.STATISTIC_PAGE:
                // TODO: Handle leaving the annotation page
                break;
            default:
                break;
        }

        this.currentPageId = pageId;
        const page = document.getElementById(pageId);
        page.classList.add("active-page");
    }

    getCurrentPageId() {
        return this.currentPageId;
    }

    clearActiveState() {
        for (const page of this.pages) {
            page.classList.remove("active-page");
        }
    }

    disable() {
        this.galleryButton.disabled = true;
        this.labelButton.disabled = true;
        this.statisticButton.disabled = true;
        this.exportButton.disabled = true;
    }

    enable() {
        this.galleryButton.disabled = false;
        this.labelButton.disabled = false;
        this.statisticButton.disabled = false;
        this.exportButton.disabled = false;
    }
}
