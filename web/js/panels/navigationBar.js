import { navigateTo } from "../util/navigate.js";

export class NavigationBar {
    constructor() {
        this.mainPageBubtton = document.getElementById(
            "back-to-main-page-button"
        );
    }

    init() {
        this.mainPageBubtton.addEventListener("click", () => {
            navigateTo("main_page.html");
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

    disable() {
        this.mainPageBubtton.disabled = true;
    }

    enable() {
        this.mainPageBubtton.disabled = false;
    }
}
