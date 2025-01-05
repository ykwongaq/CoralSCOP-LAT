class GalleryPage {
    constructor() {
        if (GalleryPage.instance instanceof GalleryPage) {
            return GalleryPage.instance;
        }

        GalleryPage.instance = this;

        this.backFromLabelButton = document.getElementById("back-from-label");
        this.numberText = document.querySelectorAll(".image-total-text");
        this.galleryContainer = document.getElementById("gallery-container");

        return this;
    }

    updates() {}

    reEnable() {
        this.reEnableBackFromLabelButton();
    }

    enable() {
        this.enableBackFromLabelButton();
    }

    disable() {
        this.backFromLabelButton.disabled = true;
    }

    disableBackFromLabelButton() {
        this.backFromLabelButton.disabled = true;
    }

    reEnableBackFromLabelButton() {
        this.backFromLabelButton.disabled = false;
    }

    createGalleryList() {
        const dataset = new Dataset();
        // dataset.getAllData((dataList) => {
        dataset.getAllDataWithoutAnnotation((dataList) => {
            this.galleryContainer.innerHTML = "";
            for (const [index, data] of dataList.entries()) {
                this.loadImage(data, index);
            }
            this.numberText.forEach((item) => {
                item.textContent = `${dataList.length}`;
            });
        });
    }

    setImageTotalImages() {
        const dataset = new Dataset();
        dataset.getAllDataWithoutAnnotation((dataList) => {
            this.numberText.forEach((item) => {
                item.textContent = `${dataList.length}`;
            });
        });
    }

    enableBackFromLabelButton() {
        this.backFromLabelButton.addEventListener("click", (event) => {
            event.preventDefault();
            const core = new Core();
            const loading = new LoadingIconManager();
            loading.showLoadingIcon();
            core.saveData();
            const dataset = new Dataset();
            if (dataset.currentDataIdx > 0) {
                core.setCurrentDataByIdx(dataset.currentDataIdx - 1);
            }
            loading.hideLoadingIcon();
            core.showPage("galleryPage");
            this.disableBackFromLabelButton();
        });
    }

    createGalleryItem() {
        const tempalte = document.getElementById("gallery-item-template");
        const galleryItem = document.importNode(tempalte.content, true);
        return galleryItem;
    }

    loadImage(imageFile, idx) {
        // Check if the imageFile added already
        const galleryItemFragment = this.createGalleryItem();
        const galleryItem = galleryItemFragment.querySelector(".gallery-item");
        const imgElement = galleryItem.querySelector("img");
        const filenameElement = galleryItem.querySelector(
            ".gallery-item__name"
        );
        imgElement.src = imageFile.image;

        // filenameElement.textContent = imageFile.json_item.image.filename;
        filenameElement.textContent = imageFile.filename;

        galleryItem.addEventListener("click", () => {
            const core = new Core();
            core.setCurrentDataByIdx(idx);
            const topNavigationBar = new TopNavigationBar();
            topNavigationBar.clearActiveState();
            core.showPage("annotationPage");
            topNavigationBar.labelButton.classList.add("active");
        });

        this.galleryContainer.appendChild(galleryItem);
    }
}

function main() {
    const galleryPage = new GalleryPage();
    galleryPage.enable();
    // galleryPage.createGalleryList();

    document.getElementById("label-button").classList.add("active");
}

main();
