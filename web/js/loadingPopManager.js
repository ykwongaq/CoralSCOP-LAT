class LoadingPopManager {
    constructor() {
        if (LoadingPopManager.instance) {
            return LoadingPopManager.instance;
        }
        LoadingPopManager.instance = this;
        this.loadingWindow = document.getElementById("loading-pop");
        this.loadindPercentage = this.loadingWindow.querySelector(
            "#loading-percentage"
        );
        this.loadingLargeText =
            this.loadingWindow.querySelector("#loading-pop-text");
        this.quitButton = this.loadingWindow.querySelector("#loading-pop-quit");
        // this.loadingIcon = document.getElementById("loading-pop");
        // this.loadindPercentage = document.getElementById("loading-percentage");
        // this.loadingLargeText = document.getElementById("loading-pop-text");
        // this.quitButton = document.getElementById("loading-pop-quit");
        this.fn = null;

        // this.launchCount = 0;
        this.loading;

        return this;
    }

    updateButtonFn(__fn) {
        if (__fn && this.quitButton) {
            this.quitButton.addEventListener("click", (event) => {
                event.preventDefault();
                __fn();
            });
        }
    }

    updateLargeText(__text) {
        this.loadingLargeText.textContent = __text;
    }

    updatePercentage(__text) {
        this.loadindPercentage.textContent = `${__text}%`;
    }

    show() {
        this.loadingWindow.classList.add("active");
    }

    hide() {
        this.loadingWindow.classList.remove("active");
    }
}
