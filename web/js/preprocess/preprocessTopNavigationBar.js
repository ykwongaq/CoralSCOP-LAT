class PreprocessTopNavigationBar {
    constructor() {
        if (
            PreprocessTopNavigationBar.instance instanceof
            PreprocessTopNavigationBar
        ) {
            return PreprocessTopNavigationBar.instance;
        }

        PreprocessTopNavigationBar.instance = this;
        this.iconContainer = document.getElementById("icon");

        return this;
    }

    enable() {}

    showLoadingIcon() {
        const loadingDiv = document.createElement("div");
        loadingDiv.classList.add("loading-animation");

        this.iconContainer.innerHTML = "";
        this.iconContainer.appendChild(loadingDiv);
    }

    restoreIcon() {
        this.iconContainer.innerHTML = "";

        const image = document.createElement("img");
        image.src = "images/coralscan_icon.png";
        image.alt = "icon";

        this.iconContainer.appendChild(image);
    }
}
