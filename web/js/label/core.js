class Core {
    constructor() {
        if (Core.instance) {
            return Core.instance;
        }
        Core.instance = this;
        this.data = null;

        return this;
    }

    loadProject() {
        eel.select_file()((filePath) => {
            if (filePath === null) {
                return;
            }

            eel.load_project(filePath)((response) => {
                if (response === null) {
                    alert("Failed to load project");
                    return;
                }

                // Update the category information
                const categoryManager = new CategoryManager();
                categoryManager.updateCategoryList(response["category_info"]);

                const data = Data.parseResponse(response);
                this.setData(data);
                this.showData();

                const labelPanel = new LabelPanel();
                labelPanel.updateButtons();

                const actionPanel = new ActionPanel();
                actionPanel.updateButtons();
            });
        });
    }

    setData(data) {
        this.data = data;
    }

    getData() {
        return this.data;
    }

    setDataByIdx(idx) {}

    showData() {
        const canvas = new Canvas();
        canvas.showData(this.data);
    }
}
