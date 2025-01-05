class LabelManager {
    constructor() {}

    static selectedColor = "#0000FF"; // blue
    static removeColor = "#00FF00"; // green
    static defaultColor = "#FF0000"; // red

    static bleachedBorderColor = "#D3D3D3";
    static deadBorderColor = "#000000"; // black

    static deadCoralIdxes = new Set();
    static healthyCoralIdxes = new Set();
    static bleachCoralIdxees = new Set();

    static deadCoralId = 0;
    static deadCoralName = "Dead Coral";
    static bleachedPrefix = "Bleached ";

    static labels = {};

    static colorList = [
        "#000000",
        "#F6C3CB",
        "#EB361C",
        "#225437",
        "#F7D941",
        "#73FBFE",
        "#9EFCD6",
        "#2B00F7",
        "#F2AA34",
        "#EF7C76",
        "#BADFE5",
        "#BED966",
        "#CCE1FD",
        "#F188E9",
        "#6CFB45",
        "#7FCBAC",
        "#C9BFB6",
        "#163263",
        "#751608",
        "#54AFAA",
        "#5F0F63",
    ];

    static fontColorList = [
        "#fff",
        "#000",
        "#fff",
        "#fff",
        "#000",
        "#000",
        "#000",
        "#fff",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#000",
        "#fff",
        "#fff",
        "#fff",
        "#fff",
    ];

    static getColorById(id) {
        if (id === null) {
            return this.defaultColor;
        }

        let id_ = id;
        if (LabelManager.isBleachCoral(id_)) {
            id_ = LabelManager.getHealthyLabelIdOf(id_);
        }
        const colorNumber = id_ % this.colorList.length;
        return this.colorList[colorNumber];
    }

    static getTextColorById(id) {
        if (id === null) {
            return this.defaultColor;
        }

        let id_ = id;
        if (LabelManager.isBleachCoral(id_)) {
            id_ = LabelManager.getHealthyLabelIdOf(id_);
        }
        const colorNumber = id_ % this.fontColorList.length;
        return this.fontColorList[colorNumber];
    }

    static exportJson() {
        const category = [];
        for (const key in LabelManager.labels) {
            const id = parseInt(key);
            const name = LabelManager.labels[key];
            let superCategory = name;
            if (LabelManager.isBleachCoral(id)) {
                const healthyCoralName =
                    LabelManager.bleachedCoralNameToCoralName(name);
                superCategory = healthyCoralName;
            }

            category.push({
                id: id,
                name: name,
                supercategory: superCategory,
            });
        }
        return category;
    }

    static getBorderColorById(id) {
        if (this.isBleachCoral(id)) {
            return this.bleachedBorderColor;
        } else if (this.isDeadCoral(id)) {
            return this.deadBorderColor;
        } else if (this.isHealthyCoral(id)) {
            return this.getColorById(id);
        } else if (id === null) {
            return this.defaultColor;
        } else {
            console.error("Invalid label id: ", id, typeof id);
            return this.default;
        }
    }

    static loadLabels(labels) {
        // Check that the input label dictionary have continuous keys starting from 0
        const keys = Object.keys(labels).map((key) => parseInt(key));
        const keysArray = Array.from(keys);
        const sortedKeys = keysArray.sort((a, b) => a - b);
        for (let i = 0; i < sortedKeys.length; i++) {
            if (sortedKeys[i] !== i) {
                alert("Invalid label dictionary");
                return;
            }
        }

        // Ensure that the first label is the Dead Coral label
        if (labels[0] !== LabelManager.deadCoralName) {
            alert("The first label must be Dead Coral");
            return;
        }

        // Ensure that the remaining labels have even so that they can be distributed evenly
        if ((Object.keys(labels).length - 1) % 2 !== 0) {
            alert("The number of labels must be even");
            return;
        }

        // The first half of the labels (except dead coral) should be healthy coral
        // The second half of the labels should be bleached coral.
        const healthyCoralLength = (Object.keys(labels).length - 1) / 2;

        // Ensure that the all the healthy coral have the corresponding bleached coral
        for (let i = 1; i <= healthyCoralLength; i++) {
            const coralName = labels[i];
            const bleachedCoralName = labels[i + healthyCoralLength];

            if (
                bleachedCoralName !==
                LabelManager.coralNameToBleachedCoralName(coralName)
            ) {
                alert(
                    `The bleached coral name for ${coralName} should be ${LabelManager.coralNameToBleachedCoralName(
                        coralName
                    )}`
                );
                return;
            }
        }

        LabelManager.deadCoralIdxes = new Set();
        LabelManager.deadCoralIdxes.add(LabelManager.deadCoralId);

        LabelManager.healthyCoralIdxes = new Set();
        for (let i = 1; i <= healthyCoralLength; i++) {
            LabelManager.healthyCoralIdxes.add(i);
        }

        LabelManager.bleachCoralIdxees = new Set();
        for (let i = 1; i <= healthyCoralLength; i++) {
            LabelManager.bleachCoralIdxees.add(i + healthyCoralLength);
        }

        LabelManager.labels = labels;
    }

    static coralNameToBleachedCoralName(coralName) {
        return `Bleached ${coralName}`;
    }

    static bleachedCoralNameToCoralName(bleachedCoralName) {
        return bleachedCoralName.replace(LabelManager.bleachedPrefix, "");
    }

    static addLabel(newLabelName) {
        // Ensure that the label name is not empty
        if (newLabelName === "") {
            return;
        }

        // Ensure that the label name does not start with "Bleached "
        if (newLabelName.startsWith(LabelManager.bleachedPrefix)) {
            alert("Label name cannot start with 'Bleached '");
            return;
        }

        // If the label name already exists, return
        for (const key in LabelManager.labels) {
            if (LabelManager.labels[key] === newLabelName) {
                return;
            }
        }

        const oldLabelsCopy = { ...LabelManager.labels };
        const newLables = {};
        newLables[LabelManager.deadCoralId] = LabelManager.deadCoralName;

        let newLabelId = 1;
        for (const key in oldLabelsCopy) {
            if (LabelManager.healthyCoralIdxes.has(parseInt(key))) {
                newLables[newLabelId] = oldLabelsCopy[key];
                newLabelId++;
            }
        }
        newLables[newLabelId] = newLabelName;

        LabelManager.healthyCoralIdxes = new Set();
        for (let i = 1; i <= newLabelId; i++) {
            LabelManager.healthyCoralIdxes.add(i);
        }

        const healthyCoralLength = newLabelId;

        LabelManager.bleachCoralIdxees = new Set();
        for (let i = 1; i <= healthyCoralLength; i++) {
            LabelManager.bleachCoralIdxees.add(i + healthyCoralLength);
        }
        for (let i = 1; i <= healthyCoralLength; i++) {
            newLables[i + healthyCoralLength] =
                this.coralNameToBleachedCoralName(newLables[i]);
        }

        LabelManager.labels = newLables;

        const dataset = new Dataset();
        dataset.updateAnnotationId(LabelManager.labels);

        const labelView = new LabelView();
        labelView.updateButtons();

        const canvas = new Canvas();
        canvas.updateMasks();
    }

    static setToSortedList(inputSet) {
        const numberArray = Array.from(inputSet);
        return numberArray.sort((a, b) => a - b);
    }

    static isDeadCoral(labelId) {
        return LabelManager.deadCoralIdxes.has(labelId);
    }

    static isHealthyCoral(labelId) {
        return LabelManager.healthyCoralIdxes.has(labelId);
    }

    static isBleachCoral(labelId) {
        return LabelManager.bleachCoralIdxees.has(labelId);
    }

    static getDeadCoralIdxes() {
        return LabelManager.setToSortedList(LabelManager.deadCoralIdxes);
    }

    static getHealthyCoralIdxes() {
        // return LabelManager.healthyCoralIdxes;
        return LabelManager.setToSortedList(LabelManager.healthyCoralIdxes);
    }

    static getBleachedCoralIdxes() {
        // return LabelManager.bleachCoralIdxees;
        return LabelManager.setToSortedList(LabelManager.bleachCoralIdxees);
    }

    static tryRenameLabel(labelId_1, labelId_2) {
      // Ensure that the labelId is not 0
      if (labelId_1 === 0) {
        alert("Cannot rename Dead Coral label");
        return false;
      }

      if (labelId_2 === 0) {
        alert("Cannot rename Dead Coral label");
        return false;
      }

      // Check if the labelId exists in current image
      

     
    }

    static tryRemoveLabel(labelId_1, labelId_2) {
        // Ensure that the labelId is not 0
        if (labelId_1 === 0) {
            alert("Cannot remove Dead Coral label");
            return false;
        }

        if (labelId_2 === 0) {
            alert("Cannot remove Dead Coral label");
            return false;
        }

        // Check if the labelId exists in current image
        const dataset = new Dataset();
        const data = dataset.getCurrentData();
        for (const mask of data.getMasks()) {
            if (mask.getCategoryId() === labelId_1) {
                alert(
                    `Cannot remove label ${labelId_1} because it is used in current image. Note that when you remove the label, the corresponding health or bleached version will be remove as well.`
                );
                return;
            } else if (mask.getCategoryId() === labelId_2) {
                alert(
                    `Cannot remove label ${labelId_2} because it is used in current image. Note that when you remove the label, the corresponding health or bleached version will be remove as well.`
                );
                return;
            }
        }

        // Check if other image contain this label
        eel.have_mask_belong_to_category(labelId_1)((result) => {
            const has_mask = result["has_mask_belong_to_category"];
            if (has_mask) {
                const image_idx = result["image_idx"];
                alert(
                    `Cannot remove label ${labelId_1} because it is used in image ${
                        image_idx + 1
                    }. Note that when you remove the label, the corresponding health or bleached version will be remove as well.`
                );
            } else {
                eel.have_mask_belong_to_category(labelId_2)((result) => {
                    const has_mask = result["has_mask_belong_to_category"];
                    if (has_mask) {
                        const image_idx = result["image_idx"];
                        alert(
                            `Cannot remove label ${labelId_2} because it is used in image ${
                                image_idx + 1
                            }. Note that when you remove the label, the corresponding health or bleached version will be remove as well.`
                        );
                    } else {
                        this.removeLabel_(labelId_1);
                        this.removeLabel_(labelId_2);

                        const dataset = new Dataset();
                        dataset.updateAnnotationId(LabelManager.labels);

                        const labelView = new LabelView();
                        labelView.updateButtons();

                        const canvas = new Canvas();
                        canvas.updateMasks();
                    }
                });
            }
        });
    }

    static getCategoryDisplayId(categoryId) {
        if (LabelManager.isBleachCoral(categoryId)) {
            return `${LabelManager.getHealthyLabelIdOf(categoryId)}B`;
        }
        return `${categoryId}`;
    }

    static removeLabel_(labelId) {
        const oldLabelsCopy = { ...LabelManager.labels };
        const newLabels = {};
        newLabels[LabelManager.deadCoralId] = LabelManager.deadCoralName;

        let newLabelId = 1;
        for (const key in oldLabelsCopy) {
            if (parseInt(key) !== labelId) {
                if (LabelManager.healthyCoralIdxes.has(parseInt(key))) {
                    newLabels[newLabelId] = oldLabelsCopy[key];
                    newLabelId++;
                }
            }
        }

        LabelManager.healthyCoralIdxes = new Set();
        for (let i = 1; i < newLabelId; i++) {
            LabelManager.healthyCoralIdxes.add(i);
        }

        const healthyCoralLength = newLabelId - 1;
        LabelManager.bleachCoralIdxees = new Set();
        for (let i = 1; i <= healthyCoralLength; i++) {
            LabelManager.bleachCoralIdxees.add(i + healthyCoralLength);
        }

        for (let i = 1; i <= healthyCoralLength; i++) {
            newLabels[i + healthyCoralLength] =
                this.coralNameToBleachedCoralName(newLabels[i]);
        }

        LabelManager.labels = newLabels;
    }

    static renameLabel(labelId) {
        if (labelId === 0) {
          alert("Cannot rename Dead Coral label");
          return;
        }
        let labelToRename_1 = null;
        let labelToRename_2 = null;
        if (LabelManager.isHealthyCoral(labelId)) {
          labelToRename_1 = labelId;
          labelToRename_2 = LabelManager.getBleachedLabelIdOf(labelId);
        } else if (LabelManager.isBleachCoral(labelId)) {
          labelToRename_1 = labelId;
          labelToRename_2 = LabelManager.getHealthyLabelIdOf(labelId);
        } else {
          console.error("Invalid label id: ", labelId);
          return;
        }

        this.tryRenameLabel(labelToRename_1, labelToRename_2);
    }

    static removeLabel(labelId) {
        // Ensure that the labelId is not 0
        if (labelId === 0) {
            alert("Cannot remove Dead Coral label");
            return;
        }

        // When removing the lable, we also need to remov the corresponding healthy or bleach label
        let labelToRemove_1 = null;
        let labelToRemove_2 = null;
        if (LabelManager.isHealthyCoral(labelId)) {
            labelToRemove_1 = labelId;
            labelToRemove_2 = LabelManager.getBleachedLabelIdOf(labelId);
        } else if (LabelManager.isBleachCoral(labelId)) {
            labelToRemove_1 = labelId;
            labelToRemove_2 = LabelManager.getHealthyLabelIdOf(labelId);
        } else {
            console.error("Invalid label id: ", labelId);
            return;
        }

        this.tryRemoveLabel(labelToRemove_1, labelToRemove_2);
    }

    static updateLabel(labelId) {
    }

    static getLabels() {
        return LabelManager.labels;
    }

    static getBleachedLabelIdOf(healthyLabelId) {
        if (LabelManager.isHealthyCoral(healthyLabelId)) {
            const healthyCoralLength = LabelManager.healthyCoralIdxes.size;
            return healthyCoralLength + healthyLabelId;
        } else {
            console.error(
                "Given coral label id is not healthy coral: ",
                healthyLabelId
            );
            return null;
        }
    }

    static getHealthyLabelIdOf(bleachedLabelId) {
        if (LabelManager.isBleachCoral(bleachedLabelId)) {
            const healthyCoralLength = LabelManager.healthyCoralIdxes.size;
            return bleachedLabelId - healthyCoralLength;
        } else {
            console.error(
                "Given coral label id is not bleached coral: ",
                bleachedLabelId
            );
            return null;
        }
    }

    static isBleachedCoralName(coralName) {
        if (coralName === null) {
            return false;
        }
        return coralName.startsWith(LabelManager.bleachedPrefix);
    }

    static isDeadCoralName(coralName) {
        if (coralName === null) {
            return false;
        }
        return coralName === LabelManager.deadCoralName;
    }

    static isHealthyCoralName(coralName) {
        if (coralName === null) {
            return false;
        }
        return (
            !LabelManager.isBleachedCoralName(coralName) &&
            !LabelManager.isDeadCoralName(coralName)
        );
    }
}

class Label {
    constructor(labelId, labelName) {
        if (labelId === null || labelId === undefined) {
            this.labelId = null;
        } else {
            this.labelId = parseInt(labelId);
        }

        if (labelName === null || labelName === undefined) {
            this.labelName = null;
        } else {
            this.labelName = labelName;
        }
    }

    getLabelId() {
        return this.labelId;
    }

    getLabelName() {
        return this.labelName;
    }

    setLabelId(labelId) {
        this.labelId = labelId;
    }

    setLabelName(labelName) {
        this.labelName = labelName;
    }
}
