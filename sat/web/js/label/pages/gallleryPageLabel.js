import { GalleryPage } from "../../pages/index.js";
import { Manager } from "../../manager.js";
import { NavigationBarLabel } from "../panels/index.js";

export class GalleryPageLabel extends GalleryPage {
    constructor(dom) {
        super(dom);
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

        // Add click event
        item.addEventListener("click", () => {
            this.disableItems();
            const manager = new Manager();
            const core = manager.getCore();
            core.jumpData(galleryData.idx, () => {
                const navigationBar = manager
                    .getToolInterface()
                    .getNavigationBar();
                navigationBar.showPage(NavigationBarLabel.ANNOTATION_PAGE);
                this.enableItems();
            });
        });

        return galleryItem;
    }
}
