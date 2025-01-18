class StatisticPage {
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
            const colors = ["#EAB308", "#808080"];
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
            const colors = ["#EAB308", "#1B68D3", "#808080"];
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

    genCoralColonyDistribution(data) {}

    genSpeciesCoverage(data) {}

    genOverallCondition(data) {}

    genSpeciesCondition(data, category) {}

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
