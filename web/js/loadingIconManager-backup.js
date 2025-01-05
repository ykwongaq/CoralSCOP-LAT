class LoadingIconManager {
    constructor() {
        if (LoadingIconManager.instance) {
            return LoadingIconManager.instance;
        }
        LoadingIconManager.instance = this;
        this.loadingIcon = null;

        this.launchCount = 0;
        return this;
    }

    showLoadingIcon() {
        if (this.loadingIcon) {
            this.launchCount++;
            this.loadingIcon.style.display = "block";
        }
    }

    setLoadingIcon(loadingIcon) {
        this.loadingIcon = loadingIcon;
    }

    hideLoadingIcon() {
        if (this.loadingIcon) {
            this.launchCount--;
            if (this.launchCount <= 0) {
                this.launchCount = 0;
                this.loadingIcon.style.display = "none";
            }
        }
    }
}
