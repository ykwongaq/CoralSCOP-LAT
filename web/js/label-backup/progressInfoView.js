class ProgressInfoView {
    constructor() {
        if (ProgressInfoView.instance instanceof ProgressInfoView) {
            return ProgressInfoView.instance;
        }

        ProgressInfoView.instance = this;
        this.progressInfoName = document.getElementById("progress-info-name");
        this.progressInfoNumber = document.getElementById("progress-info-number");
        this.progressBar = document.getElementById("progress-bar");

        return this;
    }

    setProgressInfo(imageName, currentIndex, totalIndex) {
        this.progressInfoName.textContent = imageName;
        this.progressInfoNumber.textContent =  `(${currentIndex}/${totalIndex})`;
    }

    setProgressBar(currentIndex, totalIndex) {
        this.progressBar.style.width = `${(currentIndex / totalIndex) * 100}%`;
    }
}
