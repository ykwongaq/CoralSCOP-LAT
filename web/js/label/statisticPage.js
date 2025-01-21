class StatisticPage {
    static SHALLOW_GRAY_COLOR = "#D3D3D3";
    static DEEP_GRAY_COLOR = "#7A7A7A";
    static GREEN_COLOR = "#28A745";
    static BLACK_COLOR = "#000000";
    static WHITE_COLOR = "#FFFFFF";

    constructor(dom) {
        if (StatisticPage.instance) {
            return StatisticPage.instance;
        }
        StatisticPage.instance = this;

        this.dom = dom;

        this.currentImageGrid = dom.querySelector("#current-image-grid");
        this.chartItemTemplate = dom.querySelector("#chart-item-template");
        this.ignoreUndefinedCoralButton = dom.querySelector(
            "#toogle-ignore-undefined-button"
        );

        this.glbOptions = {
            pieHole: 0.4,
            legend: { position: "none" },
            width: 330,
            height: 330,
            fontSize: 15,
            chartArea: {
                left: "10%", // Space on the left
                top: "10%", // Space on the top
                width: "80%", // Width of the chart area
                height: "80%", // Height of the chart area
            },
            backgroundColor: {
                fill: "transparent", // Sets the background to transparent
            },
        };

        this.ignoreUndefinedCoral_ = true;

        return this;
    }

    init() {
        // this.loadGoogleLib().then(() => {
        //     // Do nothing
        // });
        google.charts.load("current", { packages: ["corechart"] });
        // Set a callback function to run when the library is loaded
        google.charts.setOnLoadCallback(() => {});

        this.initIgnoreUndefinedCoralButton();
    }

    initIgnoreUndefinedCoralButton() {
        this.ignoreUndefinedCoralButton.addEventListener("change", (event) => {
            this.setIgnoreUndefinedCoral(event.target.checked);
            this.update();
        });
    }

    loadGoogleLib() {
        // If the library hasn't been loaded, create a promise to load it
        this.loadingPromise = new Promise((resolve, reject) => {
            try {
                google.charts.load("current", { packages: ["corechart"] });
                google.charts.setOnLoadCallback(() => {
                    resolve(true); // Resolve when the library is loaded
                });
            } catch (error) {
                reject(error); // Reject if there's an error
            }
        });

        return this.loadingPromise; // Return the promise (either resolved or in progress)
    }

    update() {
        const core = new Core();
        const data = core.getData();

        this.clearCharts();
        this.genCoralCoverage(data);
        this.genCoralColonyDistribution(data);
        this.genSpeciesCoverage(data);
        this.genOverallCondition(data);

        const categoryManager = new CategoryManager();
        const categoryList = categoryManager.getCategoryList();
        for (const category of categoryList) {
            if (category.isCoral() && category.isHealthy()) {
                this.genSpeciesCondition(data, category);
            }
        }
    }

    /**
     * Draw the coral coverage pie chart
     * @param {Data} data
     */
    genCoralCoverage(data) {
        const chartItem = this.createChartItem();
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        const imageHeight = data.getImageHeight();
        const imageWidth = data.getImageWidth();
        const imageArea = imageHeight * imageWidth;

        if (imageArea === 0) {
            console.error("Image area is 0");
            return;
        }

        let coralPixelCount = 0;
        let undefinedPixelCount = 0;

        for (const mask of data.getMasks()) {
            const category = mask.getCategory();
            const area = mask.getArea();

            if (category.isCoral()) {
                if (category.getStatus() === CategoryManager.STATUS_UNDEFINED) {
                    undefinedPixelCount += area;
                } else {
                    coralPixelCount += area;
                }
            }
        }

        let nonCoralPixelCount =
            imageArea - coralPixelCount - undefinedPixelCount;

        let chart = null;
        if (this.ignoreUndefinedCoral()) {
            const colors = ["#EAB308", StatisticPage.SHALLOW_GRAY_COLOR];
            const names = ["Coral", "Non-Coral"];

            var displayData = [
                ["Type", "Count"],
                [names[0], coralPixelCount],
                [names[1], undefinedPixelCount + nonCoralPixelCount],
            ];
            var dataTable = google.visualization.arrayToDataTable(displayData);

            chart = new google.visualization.PieChart(chartContainer);
            const options = {
                ...this.glbOptions,
                ...{
                    colors: colors,
                    0: { textStyle: { color: "black" } },
                    1: { textStyle: { color: "#fff" } },
                },
            };
            chart.draw(dataTable, options);

            const legends = this.createLegends({
                colors: colors,
                names: names,
            });
            legends.forEach((legend) => {
                legendsContainer.appendChild(legend);
            });
        } else {
            const undefinedCategory = new Category(Category.PREDICTED_CORAL_ID);

            const colors = [
                "#EAB308",
                undefinedCategory.getMaskColor(),
                StatisticPage.SHALLOW_GRAY_COLOR,
            ];
            const names = ["Coral", "Undefined Coral", "Non-Coral"];

            var displayData = [
                ["Type", "Count"],
                [names[0], coralPixelCount],
                [names[1], undefinedPixelCount],
                [names[2], nonCoralPixelCount],
            ];
            var dataTable = google.visualization.arrayToDataTable(displayData);

            chart = new google.visualization.PieChart(chartContainer);
            const options = {
                ...this.glbOptions,
                ...{
                    colors: colors,
                    0: { textStyle: { color: "black" } },
                    1: { textStyle: { color: "#fff" } },
                    2: { textStyle: { color: "black" } },
                },
            };
            chart.draw(dataTable, options);

            const legends = this.createLegends({
                colors: colors,
                names: names,
            });
            legends.forEach((legend) => {
                legendsContainer.appendChild(legend);
            });
        }

        nameText.textContent = "Coral Coverage";

        downloadButton.addEventListener("click", () => {
            const [filename, ext] = this.splitFilename(data.getImageName());
            const outputFilename = `${filename}_coral_coverage`;
            this.download(chart, outputFilename);
        });
        this.currentImageGrid.appendChild(chartItem);
    }

    genCoralColonyDistribution(data) {
        const chartItem = this.createChartItem();
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        const dataDistribution = {};
        for (const mask of data.getMasks()) {
            const category = mask.getCategory();
            const superCategoryName = category.getCategorySuperName();
            if (!(superCategoryName in dataDistribution)) {
                dataDistribution[superCategoryName] = [category, 0];
            }
            dataDistribution[superCategoryName][1] += 1;
        }

        if (this.ignoreUndefinedCoral()) {
            const undefinedCategory = new Category(Category.PREDICTED_CORAL_ID);
            delete dataDistribution[undefinedCategory.getCategorySuperName()];
        }

        const dataTable = [];
        const colors = [];
        const names = [];

        dataTable.push(["Coral Colony", "Count"]);
        for (const [superCategoryName, [category, count]] of Object.entries(
            dataDistribution
        )) {
            dataTable.push([superCategoryName, count]);
            colors.push(category.getMaskColor());
            names.push(superCategoryName);
        }

        const displayData = google.visualization.arrayToDataTable(dataTable);
        const chart = new google.visualization.PieChart(chartContainer);
        const options = {
            ...this.glbOptions,
            ...{
                colors: colors,
                pieSliceText: "value",
            },
        };
        chart.draw(displayData, options);

        const legends = this.createLegends({ colors: colors, names: names });
        legends.forEach((legend) => {
            legendsContainer.appendChild(legend);
        });

        nameText.textContent = "Coral Colony Distribution";

        downloadButton.addEventListener("click", () => {
            const [filename, ext] = this.splitFilename(data.getImageName());
            const outputFilename = `${filename}_coral_colony_distribution`;
            this.download(chart, outputFilename);
        });

        this.currentImageGrid.appendChild(chartItem);
    }

    genSpeciesCoverage(data) {
        const chartItem = this.createChartItem();
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        const speciesData = {};
        for (const mask of data.getMasks()) {
            const category = mask.getCategory();
            const area = mask.getArea();
            const superCategoryName = category.getCategorySuperName();

            if (!(superCategoryName in speciesData)) {
                speciesData[superCategoryName] = [category, 0];
            }

            speciesData[superCategoryName][1] += area;
        }

        if (this.ignoreUndefinedCoral()) {
            const undefinedCategory = new Category(Category.PREDICTED_CORAL_ID);
            delete speciesData[undefinedCategory.getCategorySuperName()];
        }

        const imageHeight = data.getImageHeight();
        const imageWidth = data.getImageWidth();
        const imageArea = imageHeight * imageWidth;
        let nonCoralArea = imageArea;
        for (const [superCategoryName, [category, area]] of Object.entries(
            speciesData
        )) {
            nonCoralArea -= area;
        }

        const dataTable = [];
        const colors = [];
        const names = [];

        dataTable.push(["Species", "Area"]);
        for (const [superCategoryName, [category, area]] of Object.entries(
            speciesData
        )) {
            dataTable.push([superCategoryName, area]);
            colors.push(category.getMaskColor());
            names.push(superCategoryName);
        }

        dataTable.push(["Non-Coral", nonCoralArea]);
        colors.push(StatisticPage.SHALLOW_GRAY_COLOR);
        names.push("Non-Coral");

        const displayData = google.visualization.arrayToDataTable(dataTable);
        const chart = new google.visualization.PieChart(chartContainer);
        const options = {
            ...this.glbOptions,
            ...{
                colors: colors,
            },
        };
        chart.draw(displayData, options);

        const legends = this.createLegends({ colors: colors, names: names });
        legends.forEach((legend) => {
            legendsContainer.appendChild(legend);
        });

        nameText.textContent = "Species Coverage";

        downloadButton.addEventListener("click", () => {
            const [filename, ext] = this.splitFilename(data.getImageName());
            const outputFilename = `${filename}_species_coverage`;
            this.download(chart, outputFilename);
        });

        this.currentImageGrid.appendChild(chartItem);
    }

    genOverallCondition(data) {
        const chartItem = this.createChartItem();
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        const categoryManager = new CategoryManager();

        const speciesData = {};
        for (const mask of data.getMasks()) {
            const category = mask.getCategory();
            const area = mask.getArea();
            const status = category.getStatus();
            const statusName = categoryManager.getStatusName(status);

            if (!(statusName in speciesData)) {
                speciesData[statusName] = [category, 0];
            }

            speciesData[statusName][1] += area;
        }

        if (this.ignoreUndefinedCoral()) {
            const undefinedCategory = new Category(Category.PREDICTED_CORAL_ID);
            const undefinedStatusName = categoryManager.getStatusName(
                undefinedCategory.getStatus()
            );
            delete speciesData[undefinedStatusName];
        }

        const imageHeight = data.getImageHeight();
        const imageWidth = data.getImageWidth();
        const imageArea = imageHeight * imageWidth;
        let nonCoralArea = imageArea;

        for (const [statusName, [category, area]] of Object.entries(
            speciesData
        )) {
            nonCoralArea -= area;
        }

        const dataTable = [];
        const colors = [];
        const names = [];

        dataTable.push(["Status", "Area"]);
        for (const [statusName, [category, area]] of Object.entries(
            speciesData
        )) {
            dataTable.push([statusName, area]);
            let color = null;
            switch (category.getStatus()) {
                case CategoryManager.STATUS_HEALTHY:
                    color = StatisticPage.GREEN_COLOR;
                    break;
                case CategoryManager.STATUS_DEAD:
                    color = StatisticPage.BLACK_COLOR;
                    break;
                case CategoryManager.STATUS_BLEACHED:
                    color = StatisticPage.DEEP_GRAY_COLOR;
                    break;
                default:
                    color = StatisticPage.SHALLOW_GRAY_COLOR;
            }
            colors.push(color);
            names.push(statusName);
        }

        dataTable.push(["Non-Coral", nonCoralArea]);
        colors.push(StatisticPage.SHALLOW_GRAY_COLOR);
        names.push("Non-Coral");

        const displayData = google.visualization.arrayToDataTable(dataTable);
        const chart = new google.visualization.PieChart(chartContainer);
        const options = {
            ...this.glbOptions,
            ...{
                colors: colors,
            },
        };
        chart.draw(displayData, options);

        const legends = this.createLegends({ colors: colors, names: names });
        legends.forEach((legend) => {
            legendsContainer.appendChild(legend);
        });

        nameText.textContent = "Health Status Distribution";

        downloadButton.addEventListener("click", () => {
            const [filename, ext] = this.splitFilename(data.getImageName());
            const outputFilename = `${filename}_health_status_distribution`;
            this.download(chart, outputFilename);
        });

        this.currentImageGrid.appendChild(chartItem);
    }

    genSpeciesCondition(data, category) {
        const chartItem = this.createChartItem();
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        if (!category.isCoral()) {
            return;
        }

        let healthyArea = 0;
        let bleachedArea = 0;

        for (const mask of data.getMasks()) {
            const category = mask.getCategory();
            if (
                category.getSuperCategoryId() != category.getSuperCategoryId()
            ) {
                continue;
            }

            const area = mask.getArea();
            if (category.getStatus() === CategoryManager.STATUS_HEALTHY) {
                healthyArea += area;
            } else if (
                category.getStatus() === CategoryManager.STATUS_BLEACHED
            ) {
                bleachedArea += area;
            }
        }

        const dataTable = [];
        const colors = [];
        const names = [];

        dataTable.push(["Status", "Area"]);
        dataTable.push(["Healthy", healthyArea]);
        colors.push(StatisticPage.GREEN_COLOR);
        names.push("Healthy");

        dataTable.push(["Bleached", bleachedArea]);
        colors.push(StatisticPage.DEEP_GRAY_COLOR);
        names.push("Bleached");

        const displayData = google.visualization.arrayToDataTable(dataTable);
        const chart = new google.visualization.PieChart(chartContainer);
        const options = {
            ...this.glbOptions,
            ...{
                colors: colors,
            },
        };
        chart.draw(displayData, options);

        const legends = this.createLegends({ colors: colors, names: names });
        legends.forEach((legend) => {
            legendsContainer.appendChild(legend);
        });

        const superCategoryName = category.getCategorySuperName();
        nameText.textContent = `${superCategoryName}`;

        downloadButton.addEventListener("click", () => {
            const [filename, ext] = this.splitFilename(data.getImageName());
            const outputFilename = `${filename}_${superCategoryName}_condition`;
            this.download(chart, outputFilename);
        });

        this.currentImageGrid.appendChild(chartItem);
    }

    clearCharts() {
        this.currentImageGrid.innerHTML = "";
    }

    setIgnoreUndefinedCoral(value) {
        this.ignoreUndefinedCoral_ = value;
    }

    ignoreUndefinedCoral() {
        return this.ignoreUndefinedCoral_;
    }

    createChartItem() {
        return document.importNode(this.chartItemTemplate.content, true);
    }

    createLegends(__legendsData) {
        const lengends = [];

        __legendsData.colors.forEach((color, index) => {
            const dom = document.createElement("p");
            dom.className = "legend-item";
            dom.style.setProperty("--color", color);
            dom.textContent = __legendsData.names[index];
            lengends.push(dom);
        });

        return lengends;
    }

    splitFilename(filename) {
        const parts = filename.split(".");
        if (parts.length > 1) {
            const extension = parts.pop();
            const name = parts.join(".");
            return [name, extension];
        } else {
            return [filename, ""];
        }
    }

    download(chart, downloadFilename) {
        var imgUrl = chart.getImageURI();
        var link = document.createElement("a");
        link.href = imgUrl;
        link.download = `${downloadFilename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
