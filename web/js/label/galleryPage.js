class GalleryPage {
    constructor(dom) {
        if (GalleryPage.instance) {
            return GalleryPage.instance;
        }
        GalleryPage.instance = this;

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

        // Add click event
        item.addEventListener("click", () => {
            this.disableItems();
            const core = new Core();
            core.jumpData(galleryData.idx, () => {
                const navigationBar = new NavigationBar();
                navigationBar.showPage(NavigationBar.ANNOTATION_PAGE);
                this.enableItems();
            });
        });

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
