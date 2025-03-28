import { NavigationBar } from "../../panels/index.js";

export class NavigationBarPreprocess extends NavigationBar {
    static GALLERY_PAGE = "galleryPage";
    static SETTING_PAGE = "settingPage";

    constructor(navigationBarDom) {
        super();
        this.dom = navigationBarDom;

        this.settingButton = navigationBarDom.querySelector("#setting-button");
        this.galleryButton = navigationBarDom.querySelector("#gallery-button");

        this.pages = {};
        this.currentPage = null;
    }

    init() {
        super.init();
        this.initSettingButton();
        this.initGalleryButton();
    }

    initSettingButton() {
        this.settingButton.addEventListener("click", () => {
            this.showPage(NavigationBarPreprocess.SETTING_PAGE);
        });
    }

    initGalleryButton() {
        this.galleryButton.addEventListener("click", () => {
            this.showPage(NavigationBarPreprocess.GALLERY_PAGE);
        });
    }

    disable() {
        super.disable();
        this.settingButton.disabled = true;
        this.galleryButton.disabled = true;
    }

    enable() {
        super.enable();
        this.settingButton.disabled = false;
        this.galleryButton.disabled = false;
    }
}
