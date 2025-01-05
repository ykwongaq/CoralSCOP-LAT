class LabelView {
    static HEALTHY_STATUS = 0;
    static BLEACHED_STATUS = 1;
    static DEAD_STATUS = 2;

    constructor() {
        if (LabelView.instance instanceof LabelView) {
            return LabelView.instance;
        }

        LabelView.instance = this;

        this.searchInput = document.getElementById("search-input");
        this.searchButton = document.getElementById("search-button");

        this.addCategoryInput = document.getElementById("add-category-input");
        this.addCategoryButton = document.getElementById("add-category-button");

        this.labelContainer = document.getElementById("label-container");
        this.labelButtonTemplate = document.getElementById(
            "label-button-template"
        );

        this.labelDropdown = document.getElementById("label-dropdown-menu");
        this.deleteLabelButton = document.getElementById("delete-label-button");
        this.currentStatus = LabelView.HEALTHY_STATUS;

        this.selectedDeleteId = null;

        return this;
    }

    enable() {
        this.updateButtons();
        this.enableSearchButton();
        this.enableAddCategoryButton();
        this.enableDeleteAction();
        this.enableDocument();
        this.enableStatesButtons();
    }

    enableStatesButtons() {
        let statusRadios = document.querySelectorAll("input[name='status']");
        for (const radio of statusRadios) {
            radio.addEventListener("change", () => {
                const value = parseInt(radio.value);
                if (value === LabelView.HEALTHY_STATUS) {
                    this.currentStatus = LabelView.HEALTHY_STATUS;
                } else if (value === LabelView.BLEACHED_STATUS) {
                    this.currentStatus = LabelView.BLEACHED_STATUS;
                } else if (value === LabelView.DEAD_STATUS) {
                    this.currentStatus = LabelView.DEAD_STATUS;
                } else {
                    console.error("Invalid status value: ", value);
                }
                this.updateButtons();
            });
        }
    }

    enableSearchButton() {
        this.searchInput.addEventListener("keyup", () => {
            const searchValue = this.searchInput.value.toLowerCase();
            const buttons =
                this.labelContainer.querySelectorAll(".labelButton");
            for (const button of buttons) {
                const labelText = button.querySelector(".labelText").innerHTML;
                if (labelText.toLowerCase().includes(searchValue)) {
                    button.classList.remove("hidden");
                } else {
                    button.classList.add("hidden");
                }
            }
        });
    }

    enableAddCategoryButton() {
        this.addCategoryButton.addEventListener("click", () => {
            const labelName = this.addCategoryInput.value;
            // Strip the label name
            const strippedLabelName = labelName.replace(/\s/g, "");
            if (strippedLabelName.length == 0) {
                return;
            }
            LabelManager.addLabel(labelName);
            this.updateButtons();
            this.addCategoryInput.value = "";
        });

        this.addCategoryInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                this.addCategoryButton.click();
            }
        });
    }

    enableDeleteAction() {
        this.deleteLabelButton.addEventListener("click", () => {
            LabelManager.removeLabel(this.selectedDeleteId, () => {
                this.updateButtons();
            });
            this.deleteLabelButton.style.display = "none";
            this.labelDropdown.style.display = "none";
        });
    }

    enableDocument() {
        document.addEventListener("click", (event) => {
            if (
                event.target !== this.deleteLabelButton &&
                event.target !== this.labelDropdown
            ) {
                this.labelDropdown.style.display = "none";
                this.deleteLabelButton.style.display = "none";
            }
        });
    }

    updateButtons() {
        this.clearButtonContainer();
        const labels = LabelManager.getLabels();
        let labelIds = null;
        if (this.currentStatus === LabelView.HEALTHY_STATUS) {
            labelIds = LabelManager.getHealthyCoralIdxes();
        } else if (this.currentStatus === LabelView.BLEACHED_STATUS) {
            labelIds = LabelManager.getBleachedCoralIdxes();
        } else if (this.currentStatus === LabelView.DEAD_STATUS) {
            labelIds = LabelManager.getDeadCoralIdxes();
        } else {
            console.error("Invalid status value: ", this.currentStatus);
            return;
        }

        for (const labelId of labelIds) {
            const labelName = labels[labelId];

            // Create the label button from template
            const labelButton = this.createLabelButton();
            const colorBox = labelButton.querySelector(".colorBox");
            const labelText = labelButton.querySelector(".labelText");

            // Set the label button properties
            const color = LabelManager.getColorById(labelId);
            labelText.innerHTML = `${LabelManager.getCategoryDisplayId(
                labelId
            )}. ${labelName}`;
            colorBox.style.backgroundColor = color;
            const borderColor = LabelManager.getBorderColorById(labelId);
            colorBox.style.borderColor = borderColor;

            // Add listeners to the label button
            colorBox.addEventListener("click", () =>
                this.labelButtonLeftClicked(labelId, labelName, labelText)
            );
            labelText.addEventListener("click", () =>
                this.labelButtonLeftClicked(labelId, labelName, labelText)
            );
            labelButton.addEventListener("click", () =>
                this.labelButtonLeftClicked(labelId, labelName, labelText)
            );
            colorBox.addEventListener("contextmenu", (event) => {
                this.labelButtonRightClicked(event, labelId);
            });
            labelText.addEventListener("contextmenu", (event) => {
                this.labelButtonRightClicked(event, labelId);
            });
            labelButton.addEventListener("contextmenu", (event) => {
                this.labelButtonRightClicked(event, labelId);
            });

            this.labelContainer.appendChild(labelButton);
        }
    }

    labelButtonLeftClicked(labelId, labelName, button) {
        if (Annotator.getCurrentMode() === Annotator.LABEL_MASK) {
            this.markLabel(labelId, labelName);
            const canvas = new Canvas(null);
            canvas.updateMasks();
        } else if (Annotator.getCurrentMode() === Annotator.ADD_MASK) {
            this.setEdittingLabel(labelId, labelName, button);
        }
    }

    labelButtonRightClicked(event, labelId) {
        event.preventDefault();
        this.labelDropdown.style.display = "block";
        this.deleteLabelButton.style.display = "block";
        this.labelDropdown.style.left = event.pageX + "px";
        this.labelDropdown.style.top = event.pageY + "px";
        this.selectedDeleteId = parseInt(labelId);
    }

    clearButtonContainer() {
        this.labelContainer.innerHTML = "";
    }

    createLabelButton() {
        const labelButton = document.importNode(
            this.labelButtonTemplate.content,
            true
        );
        return labelButton;
    }

    markLabel(labelId, labelName) {
        const selectedMasks = Annotator.getSelectedMasks();
        for (const mask of selectedMasks) {
            mask.setCategoryId(parseInt(labelId));
            mask.setCategoryName(labelName);
        }
        Annotator.clearSelection();
    }

    setEdittingLabel(labelId, labelName, button) {
        this.removeSelectedColor();
        button.classList.add("selected");
        const label = new Label(labelId, labelName);
        const canvas = new Canvas();
        canvas.setEdittingLabel(label);
    }

    removeSelectedColor() {
        const selectedButton = this.labelContainer.querySelector(".selected");
        if (selectedButton) {
            selectedButton.classList.remove("selected");
        }
    }
}
