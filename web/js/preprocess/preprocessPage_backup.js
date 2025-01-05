const gallery = document.getElementById("gallery");
const fileInput = document.getElementById("file-input");
const selectFolder = document.getElementById("select-folder");

class PreprocessPage {
    constructor() {
        this.imageSelector = new ImageSelector();
        this.annotationProcessor = new AnnotationProcesser();

        this.deselectedGallery = document.getElementById("deselected-gallery");
        this.selectedGallery = document.getElementById("selected-gallery");

        this.dropAreaDom = document.getElementById("drop-container");

        this.selectAllButton = document.getElementById("select-all-button");
        this.deselectAllButton = document.getElementById("deselect-all-button");
        this.cancelButton = document.getElementById("loading-pop-quit");

        this.processButton = document.getElementById("process-button");

        // this.imageCountText = document.getElementById(
        //     "selected-image-count-text"
        // );
        this.progressBar = document.getElementById("image-progress-bar");
        this.progressText = document.getElementById("progress-text");
        this.processedCount = 0;

        // this.continueButton = document.getElementById("continue-button");
        this.backMainPageButton = document.getElementById(
            "back-to-main-page-button"
        );
        this.galleryItems = [];

        // this.projectPathInput = document.getElementById("project-path-input");
    }

    enableCancelButton() {
        if (this.cancelButton) {
            this.cancelButton.addEventListener("click", (event) => {
                event.preventDefault();
                const loadingIcon = new LoadingIconManager();
                loadingIcon.updateLargeText("Quiting");
                this.annotationProcessor.setShouldSkip(true);
                this.cancelButton.disabled = true;
            });
        }
    }

    enableChangeInGallery() {
        // Create a MutationObserver instance
        const observer = new MutationObserver((mutationsList, observer) => {
            for (let mutation of mutationsList) {
                if (mutation.type === "childList") {
                    const childCount = this.getSelectedImagesCount();
                    this.imageCountText.textContent = `Selected Images: ${childCount}`;
                }
            }
        });

        // Configure the observer to listen for changes in the child nodes
        observer.observe(this.selectedGallery, { childList: true });
    }

    getSelectedImagesCount() {
        return this.selectedGallery.childElementCount;
    }

    enableDropArea() {
        function readDirectory(directoryEntry) {
            const dirReader = directoryEntry.createReader();
            dirReader.readEntries((entries) => {
                for (let entry of entries) {
                    if (entry.isDirectory) {
                        readDir(entry);
                    } else if (entry.isFile) {
                        processFileEntry(entry);
                    }
                }
            });
        }

        const processFileEntry = (fileEntry) => {
            fileEntry.file((file) => {
                if (file.type.startsWith("image/")) {
                    this.loadImage(file);
                }
            });
        };

        const dropArea = new DropArea(this.dropAreaDom);

        dropArea.handleClick = (e) => {
            e.preventDefault();
            // this.clearUnselectedItem();
            const files = e.target.files;
            Array.from(files).forEach((file) => {
                if (file.type.startsWith("image/")) {
                    this.loadImage(file);
                }
            });
            // dropArea.getDropText().style.display = "none";
        };

        dropArea.handleDrop = (e) => {
            e.preventDefault();

            // this.clearUnselectedItem();

            let dt = e.dataTransfer;
            let items = dt.items;

            for (let i = 0; i < items.length; i++) {
                let itemEntry = items[i].webkitGetAsEntry(); // Get the entry
                if (itemEntry) {
                    if (itemEntry.isDirectory) {
                        // Read directory contents
                        readDirectory(itemEntry);
                    } else if (itemEntry.isFile) {
                        // Process file
                        processFileEntry(itemEntry);
                    }
                }
            }
            // dropArea.getDropText().style.display = "none";
        };
        dropArea.enable();
    }

    clearUnselectedItem() {
        this.imageSelector.clearUnselectedData();
        this.deselectedGallery.innerHTML = "";
    }
    enableSelectAllButton() {
        this.selectAllButton.addEventListener("click", () => {
            this.galleryItems.forEach((galleryItem) => {
                const imageFile = galleryItem.querySelector(
                    ".gallery-item__name"
                ).textContent;
                this.selectImage(imageFile, galleryItem);
                galleryItem.querySelector("input").checked = true;
            });
            this.updateProcessButonStatusTo();
        });
    }

    enableDeselectAllButton() {
        this.deselectAllButton.addEventListener("click", () => {
            this.galleryItems.forEach((galleryItem) => {
                const imageFile = galleryItem.querySelector(
                    ".gallery-item__name"
                ).textContent;
                this.deselectImage(imageFile, galleryItem);
                galleryItem.querySelector("input").checked = false;
            });
            this.updateProcessButonStatusTo();
        });
    }

    disableProcessButton() {
        this.processButton.disabled = true;
    }

    reEnableProcessButton() {
        this.processButton.disabled = false;
    }

    // disableContinueButton() {
    // this.continueButton.disabled = true;
    // this.continueButton.style.borderColor = "gray";
    // this.continueButton.style.color = "gray";
    // this.continueButton.style.cursor = "not-allowed";
    // }

    // reEnableContinueButton() {
    // this.continueButton.disabled = false;
    // this.continueButton.style.borderColor = "black";
    // this.continueButton.style.color = "black";
    // this.continueButton.style.cursor = "pointer";
    // }

    disableBackMainPageButton() {
        return;
        this.backMainPageButton.disabled = true;
        this.backMainPageButton.style.borderColor = "gray";
        this.backMainPageButton.style.color = "gray";
        this.backMainPageButton.style.cursor = "not-allowed";
    }

    reEnableBackMainPageButton() {
        return;
        this.backMainPageButton.disabled = false;
        this.backMainPageButton.style.borderColor = "black";
        this.backMainPageButton.style.color = "black";
        this.backMainPageButton.style.cursor = "pointer";
    }

    endProcessing() {
        this.reEnableProcessButton();
        // this.reEnableContinueButton();
        this.reEnableBackMainPageButton();

        const genernalPopup = new GeneralPopManager();

        genernalPopup.updateText(
            "Please back to home page and load the project."
        );
        genernalPopup.updateLargeText("Processed Completed.");
        genernalPopup.show();
        genernalPopup.setButtonFn(() => {
            navigateTo("main_page.html");
        });
    }

    async process(response, selectedImages, projectPath) {
        let isValid = response["success"];
        let error_message = response["error_message"];
        const loadingIcon = new LoadingIconManager();

        if (isValid) {
            const imageSrc = [];
            const imageFiles = [];

            this.processedCount = 0;
            loadingIcon.updatePercentage(0);

            for (const imageFile of selectedImages) {
                if (this.annotationProcessor.isShouldSkip()) {
                    loadingIcon.hideLoadingIcon(true);
                    this.endProcessing();
                    break;
                }

                const imageTag =
                    this.imageSelector.getImageDomByImageName(imageFile);
                const data_url = imageTag.src;

                loadingIcon.showLoadingIcon(true);

                const result = await eel.preprocess(
                    data_url,
                    imageFile,
                    projectPath
                )();

                this.processedCount++;
                const percentage =
                    (this.processedCount / selectedImages.length) * 100;

                loadingIcon.updatePercentage(`${percentage.toFixed(2)}`);

                if (this.processedCount === selectedImages.length) {
                    loadingIcon.hideLoadingIcon(true);
                    this.endProcessing();
                }
            }

            // Make sure that the annotation processer will work next time.
            this.annotationProcessor.setShouldSkip(false);
        } else {
            alert(
                "Invalid project path: " +
                    projectPath +
                    " with error: " +
                    error_message
            );
            this.reEnableProcessButton();
            // this.reEnableContinueButton();
            this.reEnableBackMainPageButton();
            return;
        }
    }

    enableProcessButton() {
        this.processButton.addEventListener("click", () => {
            this.disableProcessButton();
            // this.disableContinueButton();
            // this.disableBackMainPageButton();

            const selectedImages = this.imageSelector.getSelectedImageNames();
            // Sort the selected images by filename
            selectedImages.sort((a, b) => {
                return a.localeCompare(b);
            });

            // const projectPath = this.projectPathInput.value;

            eel.select_folder()((projectPath) => {
                if (projectPath === null) {
                    console.log("No folder selected");
                    this.reEnableProcessButton();
                    return;
                }

                eel.check_valid_folder(projectPath)(async (response) => {
                    this.process(response, selectedImages, projectPath);
                });
            });
        });
    }

    createGalleryItem() {
        const tempalte = document.getElementById("gallery-item-template");
        const galleryItem = document.importNode(tempalte.content, true);
        return galleryItem;
    }

    updateProcessButonStatusTo() {
        if (this.imageSelector.getSelectedImageNames().length > 0) {
            this.reEnableProcessButton();
        } else {
            this.disableProcessButton();
        }
    }

    loadImage(imageFile) {
        console.log("Load image: ", imageFile);
        // Check if the imageFile added already
        const fileName = imageFile.name;
        if (this.imageSelector.imageNames.includes(fileName)) {
            return;
        }

        const galleryItemFragment = this.createGalleryItem();
        const galleryItem = galleryItemFragment.querySelector(".gallery-item");
        const imgElement = galleryItem.querySelector("img");
        const filenameElement = galleryItem.querySelector(
            ".gallery-item__name"
        );
        const checkboxElement = galleryItem.querySelector("input");
        const reader = new FileReader();
        reader.onload = (e) => {
            imgElement.src = e.target.result;
        };
        reader.readAsDataURL(imageFile);

        filenameElement.textContent = fileName;

        // When the gallery item is double clicked,
        // check is it selected or not. If selected, deselect it.
        // If not selected, select it.
        checkboxElement.addEventListener("change", () => {
            if (this.imageSelector.isSelected(fileName)) {
                this.deselectImage(fileName, galleryItem);
            } else {
                this.selectImage(fileName, galleryItem);
            }

            this.updateProcessButonStatusTo();
        });

        this.imageSelector.addData(fileName, imgElement);
        this.deselectedGallery.appendChild(galleryItem);
        this.galleryItems.push(galleryItem);
    }

    selectImage(imageFile, galleryItem) {
        const success = this.imageSelector.selectImage(imageFile);
        return;

        if (success) {
            // Add it to the selected gallery
            this.selectedGallery.appendChild(galleryItem);
        }

        // Remove it from the deselected gallery
        if (this.deselectedGallery.contains(galleryItem)) {
            this.deselectedGallery.removeChild(galleryItem);
        }
    }

    deselectImage(imageFile, galleryItem) {
        this.imageSelector.deselectImage(imageFile);

        // Add it to the deselected gallery
        // this.deselectedGallery.appendChild(galleryItem);

        // Remove it from the selected gallery
        // if (this.selectedGallery.contains(galleryItem)) {
        //     this.selectedGallery.removeChild(galleryItem);
        // }
    }

    addSelectedImageToGallery(imageFile) {
        return;
        const container = document.createElement("div");
        container.classList.add("gallery-item");

        const imgElement = document.createElement("img");
        imgElement.src = URL.createObjectURL(imageFile);

        const filenameElement = document.createElement("div");
        filenameElement.textContent = imageFile.name;

        container.appendChild(imgElement);
        container.appendChild(filenameElement);

        this.selectedGallery.appendChild(container);
    }
}

function main() {
    const preprocessPage = new PreprocessPage();
    preprocessPage.initDropArea();
    preprocessPage.initSelectAllButton();
    preprocessPage.initDeselectAllButton();
    preprocessPage.initProcessButton();
    // preprocessPage.configPage.enable();
    preprocessPage.enableChangeInGallery();
    preprocessPage.enableCancelButton();
}

main();
