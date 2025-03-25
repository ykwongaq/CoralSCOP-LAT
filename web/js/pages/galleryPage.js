import { LabelCore } from "../label/labelCore.js";
import { NavigationBarLabel } from "../label/panels/navigationBarLabel.js";
import { Page } from "./page.js";

export class GalleryPage extends Page {
    constructor(dom) {
        super();
        this.dom = dom;

        this.galleryContainer = this.dom.querySelector("#gallery-container");
        this.galleryItemTemplate = this.dom.querySelector(
            "#gallery-item-template"
        );
    }

    init() {}

    /**
     * Update the gallery page. The gallery data follows the format:
     * {
     *      "image_name": Name of the image
     *      "image_path": Path to the image,
     *      "idx": index of the data,
     *  }
     * @param {Object} galleryDataList - List of dictionary that containing the gallery data
     */
    updateGallery(galleryDataList) {
        this.clearGallery();
        for (const galleryData of galleryDataList) {
            const galleryItem = this.createGalleryItem(galleryData);
            this.galleryContainer.appendChild(galleryItem);
        }
    }

    createGalleryItem(galleryData) {
        const galleryItem = document.importNode(
            this.galleryItemTemplate.content,
            true
        );
        const item = galleryItem.querySelector(".gallery-item");

        // Show image
        const imageElement = item.querySelector("img");
        imageElement.src = encodeURIComponent(galleryData.image_path);

        // Show filename
        const idx = galleryData.idx;
        const imageName = galleryData.image_name;
        const filenameElement = item.querySelector(".gallery-item__name");
        filenameElement.textContent = `${idx + 1}. ${imageName}`;

        return galleryItem;
    }

    clearGallery() {
        this.galleryContainer.innerHTML = "";
    }

    disableItems() {
        const buttons = this.galleryContainer.querySelectorAll(
            ".gallery-list__item"
        );
        for (const button of buttons) {
            button.disable = true;
        }
    }

    enableItems() {
        const buttons = this.galleryContainer.querySelectorAll(
            ".gallery-list__item"
        );
        for (const button of buttons) {
            button.disable = false;
        }
    }
}
