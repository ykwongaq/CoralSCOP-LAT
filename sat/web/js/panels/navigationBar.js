import { navigateTo } from "../util/navigate.js";

export class NavigationBar {
    constructor() {
        this.mainPageBubtton = document.getElementById(
            "back-to-main-page-button"
        );

        this.pages = {};
        this.currentPage = null;
    }

    init() {
        this.mainPageBubtton.addEventListener("click", () => {
            navigateTo("main_page.html");
        });
    }

    showPage(pageId) {
        if (this.currentPage) {
            this.currentPage.leavePage();
        }
        this.clearActiveState();
        const [page, pageDom] = this.pages[pageId];
        pageDom.classList.add("active-page");
        page.enterPage();
        this.currentPage = page;
    }

    disable() {
        this.mainPageBubtton.disabled = true;
    }

    enable() {
        this.mainPageBubtton.disabled = false;
    }

    addPage(pageId, page, pageDom) {
        this.pages[pageId] = [page, pageDom];
    }

    clearPages() {
        this.pages = {};
    }

    clearActiveState() {
        for (const [page, pageDom] of Object.values(this.pages)) {
            pageDom.classList.remove("active-page");
        }
    }
}
