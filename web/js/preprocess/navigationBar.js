class NavigationBar {
    constructor(navigationBar) {
        this.settingButton = navigationBar.querySelector("#setting-button");
        this.galleryButton = navigationBar.querySelector("#gallery-button");
    }

    init() {
        this.initSettingButton();
        this.initGalleryButton();
    }

    initSettingButton() {
        this.settingButton.addEventListener("click", () => {
            this.showPage("settingPage");
        });
    }

    initGalleryButton() {
        this.galleryButton.addEventListener("click", () => {
            this.showPage("galleryPage");
        });
    }

    showPage(pageId) {
        const pages = document.querySelectorAll(".page");
        pages.forEach((page) => {
            page.classList.remove("active-page");
        });

        const page = document.getElementById(pageId);
        page.classList.add("active-page");
    }
}
