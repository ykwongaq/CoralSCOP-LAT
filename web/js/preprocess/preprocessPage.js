/**
 * PreprocessPage class
 */
class PreprocessPage {
    constructor() {
        // Home Button
        this.backMainPageButton = document.getElementById(
            "back-to-main-page-button"
        );

        // File input area
        this.dropAreaDom = document.getElementById("drop-container");

        // Gallery to store the uploaded items
        this.galleryItemContainer = document.getElementById(
            "gallery-item-container"
        );

        // Buttons
        this.selectAllButton = document.getElementById("select-all-button");
        this.deselectAllButton = document.getElementById("deselect-all-button");
        this.createProjectButton = document.getElementById(
            "create-project-button"
        );

        // Image selector is used to managed which image is selected
        this.imageSelector = new ImageSelector();

        // Initialize the general popup manager
        const genernalPopManager = new GeneralPopManager();
        genernalPopManager.clearButtons();

        // Navigation Bar
        const navigationBarDom = document.getElementById("navigation-bar");
        const navigationBar = new NavigationBar(navigationBarDom);
        navigationBar.init();

        // Settting Page
        const settingPage = document.getElementById("settingPage");
        this.configPage = new ConfigPage(settingPage);
        this.configPage.init();

        this.galleryItems = [];
    }

    enableCancelButton() {
        if (this.cancelButton) {
            this.cancelButton.addEventListener("click", (event) => {
                event.preventDefault();
                const loadingIcon = new LoadingPopManager();
                loadingIcon.updateLargeText("Quiting");
                this.annotationProcessor.setShouldSkip(true);
                this.cancelButton.disabled = true;
            });
        }
    }

    /**
     * Initialize the drop area.
     * Drop area support user to select the target image by
     * 1. Drag and drop the image
     * 2. Upload images from folder
     */
    initDropArea() {
        // Helper function to read the directory
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

        // Helper function to load one image
        const processFileEntry = (fileEntry) => {
            fileEntry.file((file) => {
                if (file.type.startsWith("image/")) {
                    this.loadImage(file);
                }
            });
        };

        const dropArea = new DropArea(this.dropAreaDom);

        // Handle the case when user upload images by folder
        dropArea.handleClick = (e) => {
            e.preventDefault();
            const files = e.target.files;
            // Load every image in the folder
            Array.from(files).forEach((file) => {
                if (file.type.startsWith("image/")) {
                    this.loadImage(file);
                }
            });
        };

        // Handle the case when user drop the images or folder containing images
        dropArea.handleDrop = (e) => {
            e.preventDefault();

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
        };

        dropArea.enable();
    }

    /**
     * Select all the images in the gallery
     */
    initSelectAllButton() {
        this.selectAllButton.addEventListener("click", () => {
            this.galleryItems.forEach((galleryItem) => {
                const imageFile = galleryItem.querySelector(
                    ".gallery-item__name"
                ).textContent;
                this.selectImage(imageFile);
                galleryItem.querySelector("input").checked = true;
            });
            this.updateCreateProjectButton();
        });
    }

    /**
     * Deselect all the images in the gallery
     */
    initDeselectAllButton() {
        this.deselectAllButton.addEventListener("click", () => {
            this.galleryItems.forEach((galleryItem) => {
                const imageFile = galleryItem.querySelector(
                    ".gallery-item__name"
                ).textContent;
                this.deselectImage(imageFile);
                galleryItem.querySelector("input").checked = false;
            });
            this.updateCreateProjectButton();
        });
    }

    /**
     * Disable the create project button
     */
    disableCreateProjectButton() {
        this.createProjectButton.disabled = true;
    }

    /**
     * Enable the create project button
     */
    enableCreateProjectButton() {
        this.createProjectButton.disabled = false;
    }

    /**
     * Initialize the create project button
     * It will create a project based on the selected images
     * Users will be asked to provide the project folder to save the project
     */
    initProcessButton() {
        this.createProjectButton.addEventListener("click", () => {
            // Prevent user from clicking the button multiple times
            this.disableCreateProjectButton();
            this.disableNavigationButton();

            // Ask user to select the project folder
            eel.select_folder()((projectPath) => {
                // If user does not select any folder, do nothing
                if (projectPath === null) {
                    this.enableCreateProjectButton();
                    this.enableNavigationButton();
                    return;
                }

                // Configure the loading pop up window
                const loadingPopManager = new LoadingPopManager();
                loadingPopManager.updateLargeText("Hold Tight!");
                loadingPopManager.show();
                loadingPopManager.updateButtonFn(() => {
                    console.log("Quit button clicked.");
                    loadingPopManager.updateLargeText("Terminating...");
                    eel.terminate_create_project_process()();
                });

                /**
                 * Pass the selected images to the server side.
                 * From the server side, the following function will be called:
                 * 1. updateProgressPercentage
                 * 2. afterProjectCreation
                 */
                const createProjectRequest = new CreateProjectRequest();
                createProjectRequest.setOutputDir(projectPath);
                const selectedImageNames =
                    this.imageSelector.getSelectedImageNames();
                selectedImageNames.sort((a, b) => a.localeCompare(b));
                for (const selectedImageName of selectedImageNames) {
                    const imageDom =
                        this.imageSelector.getImageDomByImageName(
                            selectedImageName
                        );
                    const image_url = imageDom.src;
                    createProjectRequest.addInput(image_url, selectedImageName);
                }

                const config = this.configPage.getConfig();
                createProjectRequest.setConfig(config);

                eel.create_project(createProjectRequest.toDict())();
            });
        });
    }

    /**
     * This function will be called after the project creation process is done.
     * @param {Object} status
     */
    afterProjectCreation(status) {
        this.enableCreateProjectButton();
        this.enableNavigationButton();

        const loadingPopManager = new LoadingPopManager();
        loadingPopManager.hide();

        const generalPopup = new GeneralPopManager();
        generalPopup.clear();
        generalPopup.updateLargeText("Terminated.");
        generalPopup.updateText("Project creation is terminated.");

        if (status["finished"]) {
            generalPopup.updateLargeText("Compeleted.");
            generalPopup.updateText("Project creation is compeleted.");
            generalPopup.addButton("back-button", "Back", () => {
                navigateTo("main_page.html");
            });
            generalPopup.addButton("continue-button", "Continue", () => {
                const projectPath = status["project_path"];
                navigateTo(
                    "label.html?askLoadProject=false&project_path=" +
                        projectPath
                );
            });
        } else {
            generalPopup.updateLargeText("Terminated.");
            generalPopup.updateText("Project creation is terminated.");
            generalPopup.addButton("back-button", "Back", () => {
                generalPopup.hide();
            });
        }

        generalPopup.show();
    }

    /**
     * Create one gallery item based on the template
     * @returns Created gallery item
     */
    createGalleryItem() {
        const tempalte = document.getElementById("gallery-item-template");
        const galleryItem = document.importNode(tempalte.content, true);
        return galleryItem;
    }

    /**
     * Create project button is only enabled when there is at least one image selected
     */
    updateCreateProjectButton() {
        if (this.imageSelector.getSelectedImageNames().length > 0) {
            this.enableCreateProjectButton();
        } else {
            this.disableCreateProjectButton();
        }
    }

    /**
     * Load one image file
     * @param {File} imageFile
     */
    loadImage(imageFile) {
        // Do not load the image if it is already in the gallery
        const fileName = imageFile.name;
        if (this.imageSelector.imageNames.includes(fileName)) {
            return;
        }

        // Create a gallery item to store the image
        const galleryItemFragment = this.createGalleryItem();
        const galleryItem = galleryItemFragment.querySelector(".gallery-item");

        // Display the filename in the gallery item
        const filenameElement = galleryItem.querySelector(
            ".gallery-item__name"
        );
        filenameElement.textContent = fileName;

        // Display the image in the gallery item
        const imgElement = galleryItem.querySelector("img");
        const reader = new FileReader();
        reader.onload = (e) => {
            imgElement.src = e.target.result;
        };
        reader.readAsDataURL(imageFile);

        // Enable checkbox to select or deselect the image
        const checkboxElement = galleryItem.querySelector("input");
        checkboxElement.addEventListener("change", () => {
            if (this.imageSelector.isSelected(fileName)) {
                this.deselectImage(fileName);
            } else {
                this.selectImage(fileName);
            }
            this.updateCreateProjectButton();
        });

        this.imageSelector.addData(fileName, imgElement);
        this.galleryItemContainer.appendChild(galleryItem);
        this.galleryItems.push(galleryItem);
    }

    /**
     * Select the image
     * @param {String} imageFileName
     */
    selectImage(imageFileName) {
        this.imageSelector.selectImage(imageFileName);
    }

    /**
     * Deselect the image
     * @param {String} imageFileName
     */
    deselectImage(imageFileName) {
        this.imageSelector.deselectImage(imageFileName);
    }

    enableNavigationButton() {
        this.backMainPageButton.enabled = true;
    }

    disableNavigationButton() {
        this.backMainPageButton.enabled = false;
    }
}

/**
 * This function will be called in the server side
 * Update the precentage text shown in the loading pop window
 * @param {number} percentage
 */
eel.expose(updateProgressPercentage);
function updateProgressPercentage(percentage) {
    const loadingPopManager = new LoadingPopManager();
    loadingPopManager.updatePercentage(percentage);
}

/**
 * This function will be called in the server side.
 * It will be called after the project creation process is done.
 * @param {Object} status
 */
eel.expose(afterProjectCreation);
function afterProjectCreation(status) {
    const preprocessPage = new PreprocessPage();
    preprocessPage.afterProjectCreation(status);
}

function main() {
    const preprocessPage = new PreprocessPage();
    preprocessPage.initDropArea();
    preprocessPage.initSelectAllButton();
    preprocessPage.initDeselectAllButton();
    preprocessPage.initProcessButton();
    preprocessPage.enableCancelButton();
}

main();
