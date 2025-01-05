class ImageSelector {
    constructor() {
        this.imageNames = [];
        this.selectedImageNames = [];
        this.imageDoms = {};
    }

    clearAllData() {
        this.imageNames = [];
        this.selectedImageNames = [];
        this.imageDoms = {};
    }

    clearUnselectedData() {
        // Remove the unselecte image and imageTag from the list
        this.imageNames = this.imageNames.filter((image) => {
            return this.selectedImageNames.includes(image);
        });
        let newImageTags = {};
        for (let image of this.imageNames) {
            newImageTags[image] = this.imageDoms[image];
        }
        this.imageDoms = newImageTags;
    }

    addData(imageName, imageDom) {
        this.imageNames.push(imageName);
        this.imageDoms[imageName] = imageDom;
    }

    getImageDomByImageName(imageName) {
        return this.imageDoms[imageName];
    }

    selectImage(imageName) {
        if (this.selectedImageNames.includes(imageName)) {
            return false;
        }
        this.selectedImageNames.push(imageName);
        return true;
    }

    deselectImage(imageName) {
        this.selectedImageNames = this.selectedImageNames.filter(
            (selectedImage) => {
                return selectedImage !== imageName;
            }
        );
    }

    getSelectedImageNames() {
        return this.selectedImageNames;
    }

    isSelected(imageName) {
        return this.selectedImageNames.includes(imageName);
    }
}
