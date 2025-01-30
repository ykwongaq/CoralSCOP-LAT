class ErrorPopManager {
    constructor() {
        if (ErrorPopManager.instance) {
            return ErrorPopManager.instance;
        }
        ErrorPopManager.instance = this;

        this.popup = document.getElementById("error-pop");
        this.largeText = this.popup.querySelector("#error-pop-large-text");
        this.text = this.popup.querySelector("#error-pop-text");
        this.textArea = this.popup.querySelector("#error-pop-textarea");
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

    updateLargeText(text) {
        this.largeText.textContent = text;
    }

    updateText(text) {
        this.text.innerHTML = text;
    }

    updateTextBox(text) {
        this.textArea.value = text;
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
        this.updateTextBox("");
        this.clearButtons();
    }
}
