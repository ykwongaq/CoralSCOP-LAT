class GeneralPopManager {
    constructor() {
        if (GeneralPopManager.instance) {
            return GeneralPopManager.instance;
        }
        GeneralPopManager.instance = this;
        this.popup = document.getElementById("general-pop");
        this.largeText = this.popup.querySelector("#general-pop-large-text");
        this.text = this.popup.querySelector("#general-pop-text");
        this.buttonContainer = this.popup.querySelector("#button-container");

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

    clearButtons() {
        this.buttonContainer.innerHTML = "";
    }

    enableButton() {
        if (this.button) {
            this.button.addEventListener("click", () => {
                let willHide = true;
                if (this.fn) {
                    willHide = this.fn() || true;
                }
                if (!willHide) {
                    this.popup.classList.remove("active");
                }
            });
        }
    }

    updateLargeText(__text) {
        this.largeText.textContent = __text;
    }

    updateText(__text) {
        this.text.textContent = __text;
    }

    show() {
        this.popup.classList.add("active");
    }

    hide() {
        this.popup.classList.remove("active");
    }

    clear() {
        this.updateText("");
        this.updateLargeText("");
        this.clearButtons();
    }
}
