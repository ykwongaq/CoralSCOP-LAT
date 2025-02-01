class LoadingPopManager {
    static DEFAULT_TITLE = "Hold Tight!";
    static DEFAULT_CONTENT =
        "We're brewing up something amazing. It might take a few minutes, so sit back and relax. Better not to leave this page. Thanks for your patience! 😊";

    constructor() {
        if (LoadingPopManager.instance) {
            return LoadingPopManager.instance;
        }
        LoadingPopManager.instance = this;
        this.loadingWindow = document.getElementById("loading-pop");
        this.loadingPercentage = this.loadingWindow.querySelector(
            "#loading-percentage"
        );
        this.loadingLargeText =
            this.loadingWindow.querySelector("#loading-pop-title");
        this.loadingText = this.loadingWindow.querySelector(
            "#loading-pop-content"
        );

        this.buttonContainer = this.loadingWindow.querySelector(
            "#loading-pop-button-container"
        );

        return this;
    }

    addButton(buttonId, buttonText, buttonFunction) {
        const button = document.createElement("button");
        button.id = buttonId;
        button.textContent = buttonText;
        button.addEventListener("click", buttonFunction);
        button.classList.add("button");
        this.buttonContainer.appendChild(button);
    }

    updateLargeText(__text) {
        this.loadingLargeText.textContent = __text;
    }

    updateText(__text) {
        this.loadingText.textContent = __text;
    }

    updatePercentage(__text) {
        this.loadingPercentage.classList.remove("hidden");
        this.loadingPercentage.textContent = `${__text}%`;
    }

    clearButtons() {
        this.buttonContainer.innerHTML = "";
    }

    clear() {
        this.updateText("");
        this.updateLargeText("");
        this.updatePercentage("");
        this.clearButtons();
        this.loadingPercentage.classList.add("hidden");
    }

    show() {
        this.loadingWindow.classList.add("active");
    }

    hide() {
        this.loadingWindow.classList.remove("active");
    }
}
