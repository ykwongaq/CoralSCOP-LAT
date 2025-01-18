class StatisticPage {
    constructor() {
        if (StatisticPage.instance) {
            return StatisticPage.instance;
        }
        StatisticPage.instance = this;

        this.currentImageGrid = document.getElementById("current-image-grid");
        this.chartItemTemplate = document.getElementById("chart-item-template");

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

    loadGoogleLib() {
        const myPromise = new Promise((resolve, reject) => {
            // Asynchronous operation
            const success = true; // Simulate success or failure

            google.charts.load("current", { packages: ["corechart"] });

            google.charts.setOnLoadCallback(function () {
                if (success) {
                    resolve(true);
                }
            });
        });

        return myPromise;
    }

    update() {
        this.clearCharts();
        const dataset = new Dataset();
        const core = new Core();
        const topNavigationBar = new TopNavigationBar();
        topNavigationBar.showLoadingIcon();
        // const start = new Date().getTime();
        core.saveData(() => {
            dataset.getData((response) => {
                this.createCurrentImageStatistic(response);
                topNavigationBar.restoreIcon();
            });
        });
    }

    getHealthyCoralCount(jsonItem) {
        let count = 0;
        for (const category of jsonItem["categories"]) {
            if (LabelManager.isHealthyCoralName(category["name"])) {
                count += 1;
            }
        }
        return count;
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

    createCurrentImageStatistic(response) {
        const coralDistributionChartItem =
            this.createCoralColonyDistributionChartItem(response);
        if (coralDistributionChartItem != null) {
            this.currentImageGrid.appendChild(coralDistributionChartItem);
        }

        const coralCoverageChartItem =
            this.createCoralCoverageChartItem(response);
        if (coralCoverageChartItem != null) {
            this.currentImageGrid.appendChild(coralCoverageChartItem);
        }

        const coralSpeciesCoverageChartItem =
            this.createCoralSpeciesCoverageChartItem(response);
        if (coralSpeciesCoverageChartItem != null) {
            this.currentImageGrid.appendChild(coralSpeciesCoverageChartItem);
        }

        const coralConditionDistributionChartItem =
            this.createCoralConditionDistributionChartItem(response);
        if (coralConditionDistributionChartItem != null) {
            this.currentImageGrid.appendChild(
                coralConditionDistributionChartItem
            );
        }

        const jsonItem = response["json_item"];
        for (const category of jsonItem["categories"]) {
            const id = category["id"];
            if (
                LabelManager.isDeadCoral(id) ||
                LabelManager.isBleachCoral(id)
            ) {
                continue;
            }

            const coralSpeciesConditionDistributionChartItem =
                this.createCoralSpeciesConditionDistributionChartItem(
                    response,
                    id
                );

            if (coralSpeciesConditionDistributionChartItem != null) {
                this.currentImageGrid.appendChild(
                    coralSpeciesConditionDistributionChartItem
                );
            }
        }

        this.calChartBoxHeight();
    }

    createCoralColonyDistributionChartItem(response) {
        const jsonItem = response["json_item"];
        const filteredIndices = response["filtered_indices"];

        const chartItem = document.importNode(
            this.chartItemTemplate.content,
            true
        );
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        let totalCoralColonyCount = 0;
        let coralColonyDict = {};

        const id2Name = this.getId2Name(jsonItem);
        const healthyCoralCount = this.getHealthyCoralCount(jsonItem);

        for (const annotation of jsonItem["annotations"]) {
            let id = annotation["category_id"];
            const name = annotation["category_name"];
            const maskId = annotation["id"];

            if (!this.isIncluded(maskId, filteredIndices) || name == null) {
                continue;
            }

            if (LabelManager.isBleachedCoralName(name)) {
                id = id - healthyCoralCount;
            }

            if (!(id in coralColonyDict)) {
                coralColonyDict[id] = 0;
            }

            coralColonyDict[id] += 1;
            totalCoralColonyCount += 1;
        }

        if (totalCoralColonyCount == 0) {
            return null;
        }

        var dataTable = [];
        var colors = [];
        var slices = {};
        let sliceId = 0;

        dataTable.push(["Coral Colony", "Count"]);
        for (let id in coralColonyDict) {
            id = parseInt(id);
            dataTable.push([id2Name[id], coralColonyDict[id]]);
            colors.push(LabelManager.getColorById(id));
            let sliceColor = null;
            if (LabelManager.isDeadCoral(id)) {
                sliceColor = "#fff";
            } else {
                sliceColor = LabelManager.getTextColorById(id);
            }
            slices[sliceId] = { textStyle: { color: sliceColor } };
            sliceId += 1;
        }

        const names = dataTable.reduce((acc, item, index) => {
            if (index > 0) {
                acc.push(item[0]);
            }
            return acc;
        }, []);

        const data = google.visualization.arrayToDataTable(dataTable);

        const chart = new google.visualization.PieChart(chartContainer);
        const options = {
            ...this.glbOptions,
            ...{
                colors: colors,
                pieSliceText: "value",
                slices: slices,
            },
        };

        chart.draw(data, options);

        const legends = this.createLegends({ colors: colors, names: names });

        legends.forEach((legend) => {
            legendsContainer.appendChild(legend);
        });

        nameText.innerHTML = `Coral Colony Distribution <small>(Total: ${totalCoralColonyCount})</small>`;

        downloadButton.addEventListener("click", () => {
            const filename = response["filename"];
            this.download(chart, `coral_colony_distribution_${filename}`);
        });

        return chartItem;
    }

    createCoralCoverageChartItem(response) {
        const jsonItem = response["json_item"];
        const filteredIndices = response["filtered_indices"];

        const chartItem = document.importNode(
            this.chartItemTemplate.content,
            true
        );
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        const imageHeight = jsonItem["image"]["height"];
        const imageWidth = jsonItem["image"]["width"];
        const totalPixelCount = imageHeight * imageWidth;

        let coralPixelCount = 0;
        for (const annotation of jsonItem["annotations"]) {
            const id = annotation["category_id"];
            const maskId = annotation["id"];
            if (!this.isIncluded(maskId, filteredIndices) || id == null) {
                continue;
            }
            const area = annotation["area"];
            coralPixelCount += area;
        }

        if (coralPixelCount == 0) {
            return null;
        }

        const nonCoralPixelCount = totalPixelCount - coralPixelCount;

        const colors = ["#EAB308", "#1B68D3"];
        const names = ["Coral", "Non-Coral"];

        var data = [
            ["Type", "Count"],
            [names[0], coralPixelCount],
            [names[1], nonCoralPixelCount],
        ];

        var dataTable = google.visualization.arrayToDataTable(data);

        const chart = new google.visualization.PieChart(chartContainer);
        const options = {
            ...this.glbOptions,
            ...{
                colors: colors,
                slices: {
                    0: { textStyle: { color: "black" } },
                    1: { textStyle: { color: "#fff" } },
                },
            },
        };

        chart.draw(dataTable, options);

        const legends = this.createLegends({ colors: colors, names: names });

        legends.forEach((legend) => {
            legendsContainer.appendChild(legend);
        });

        nameText.innerHTML = `Coral Coverage`;

        downloadButton.addEventListener("click", () => {
            const filename = response["filename"];
            this.download(chart, `coral_coverage_${filename}`);
        });

        return chartItem;
    }

    createCoralSpeciesCoverageChartItem(response) {
        const jsonItem = response["json_item"];
        const filteredIndices = response["filtered_indices"];

        const chartItem = document.importNode(
            this.chartItemTemplate.content,
            true
        );
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        let totalCoralArea = 0;
        let coralAreaDict = {};

        const id2Name = this.getId2Name(jsonItem);
        const healthyCoralCount = this.getHealthyCoralCount(jsonItem);

        for (const annotation of jsonItem["annotations"]) {
            let id = annotation["category_id"];
            const name = annotation["category_name"];
            const maskId = annotation["id"];

            if (!this.isIncluded(maskId, filteredIndices) || name == null) {
                continue;
            }

            if (LabelManager.isBleachedCoralName(name)) {
                id = id - healthyCoralCount;
            }

            if (!(id in coralAreaDict)) {
                coralAreaDict[id] = 0;
            }

            coralAreaDict[id] += annotation["area"];
            totalCoralArea += annotation["area"];
        }

        if (totalCoralArea == 0) {
            return null;
        }

        var dataTable = [];
        var colors = [];
        var slices = {};
        let sliceId = 0;

        dataTable.push(["Coral Species", "Area"]);
        for (let id in coralAreaDict) {
            id = parseInt(id);
            dataTable.push([id2Name[id], coralAreaDict[id]]);
            colors.push(LabelManager.getColorById(id));
            let sliceColor = null;
            if (LabelManager.isDeadCoral(id)) {
                sliceColor = "#fff";
            } else {
                sliceColor = LabelManager.getTextColorById(id);
            }
            slices[sliceId] = { textStyle: { color: sliceColor } };
            sliceId += 1;
        }

        const names = dataTable.reduce((acc, item, index) => {
            if (index > 0) {
                acc.push(item[0]);
            }
            return acc;
        }, []);

        const data = google.visualization.arrayToDataTable(dataTable);

        //Coral Species Distribution
        const chart = new google.visualization.PieChart(chartContainer);
        const options = {
            ...this.glbOptions,
            ...{
                colors: colors,
                slices: slices,
            },
        };

        chart.draw(data, options);

        const legends = this.createLegends({ colors: colors, names: names });

        legends.forEach((legend) => {
            legendsContainer.appendChild(legend);
        });

        nameText.innerHTML = `Coral Species Distribution`;

        downloadButton.addEventListener("click", () => {
            const filename = response["filename"];
            this.download(chart, `coral_species_distribution_${filename}`);
        });

        return chartItem;
    }

    createCoralConditionDistributionChartItem(response) {
        // This time, we measure the distribution of coral conditions
        // (healthy, bleached, dead) in the image.
        // The chart should show the area percentage of each condition in the image over the total coral area.

        const jsonItem = response["json_item"];
        const filteredIndices = response["filtered_indices"];

        const chartItem = document.importNode(
            this.chartItemTemplate.content,
            true
        );
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        let totalCoralArea = 0;
        let coralAreaDict = {};

        for (const annotation of jsonItem["annotations"]) {
            let id = annotation["category_id"];
            const name = annotation["category_name"];
            const maskId = annotation["id"];

            if (!this.isIncluded(maskId, filteredIndices) || name == null) {
                continue;
            }

            let key = null;
            if (LabelManager.isHealthyCoralName(name)) {
                key = "healthy";
            } else if (LabelManager.isBleachedCoralName(name)) {
                key = "bleached";
            } else if (LabelManager.isDeadCoralName(name)) {
                key = "dead";
            } else {
                console.error("Unknown Coral Condition: ", name);
                continue;
            }

            if (!(key in coralAreaDict)) {
                coralAreaDict[key] = 0;
            }
            coralAreaDict[key] += annotation["area"];
            totalCoralArea += annotation["area"];
        }

        if (totalCoralArea == 0) {
            return null;
        }

        const names = ["Healthy", "Bleached", "Dead"];

        var dataTable = [];
        var colors = [];
        var slices = {};

        dataTable.push(["Coral Condition", "Area"]);
        dataTable.push([names[0], coralAreaDict["healthy"]]);
        dataTable.push([names[1], coralAreaDict["bleached"]]);
        dataTable.push([names[2], coralAreaDict["dead"]]);

        const data = google.visualization.arrayToDataTable(dataTable);
        var colors = ["blue", "gray", "black"];
        var slices = {
            0: { textStyle: { color: "black" } },
            1: { textStyle: { color: "black" } },
            2: { textStyle: { color: "red" } },
        };
        //Coral Condition Distribution
        const chart = new google.visualization.PieChart(chartContainer);
        const options = {
            ...this.glbOptions,
            ...{ colors: colors, slices: slices },
        };

        chart.draw(data, options);

        const legends = this.createLegends({ colors: colors, names: names });

        legends.forEach((legend) => {
            legendsContainer.appendChild(legend);
        });

        nameText.innerHTML = `Coral Condition Distribution`;

        downloadButton.addEventListener("click", () => {
            const filename = response["filename"];
            this.download(chart, `coral_condition_distribution_${filename}`);
        });

        return chartItem;
    }

    createCoralSpeciesConditionDistributionChartItem(response, targetId) {
        // This time, we measure the distribution of coral conditions
        // of one specific coral species in the image. The chart
        // should show the area percentage of each condition in the
        // image over the total coral area of that species.

        const jsonItem = response["json_item"];
        const filteredIndices = response["filtered_indices"];

        const chartItem = document.importNode(
            this.chartItemTemplate.content,
            true
        );
        const chartContainer = chartItem.querySelector(".chart");
        const downloadButton = chartItem.querySelector(".download-btn");
        const legendsContainer = chartItem.querySelector(".legends");
        const nameText = chartItem.querySelector(".chart-item__name");

        let totalCoralArea = 0;
        let coralAreaDict = {};

        const healthyCoralCount = this.getHealthyCoralCount(jsonItem);
        const id2Name = this.getId2Name(jsonItem);

        const bleachId = targetId + healthyCoralCount;

        for (const annotation of jsonItem["annotations"]) {
            let id = annotation["category_id"];
            const name = annotation["category_name"];
            const maskId = annotation["id"];

            if (!this.isIncluded(maskId, filteredIndices) || name == null) {
                continue;
            }

            if (id != targetId && id != bleachId) {
                continue;
            }

            let key = null;
            if (LabelManager.isHealthyCoralName(name)) {
                key = "healthy";
            } else if (LabelManager.isBleachedCoralName(name)) {
                key = "bleached";
            } else if (LabelManager.isDeadCoralName(name)) {
                key = "dead";
            } else {
                console.error("Unknown Coral Condition: ", name);
                continue;
            }

            if (!(key in coralAreaDict)) {
                coralAreaDict[key] = 0;
            }
            coralAreaDict[key] += annotation["area"];
            totalCoralArea += annotation["area"];
        }

        if (totalCoralArea == 0) {
            return null;
        }

        const names = ["Healthy", "Bleached"];

        var dataTable = [];
        dataTable.push(["Coral Condition", "Area"]);
        dataTable.push([names[0], coralAreaDict["healthy"]]);
        dataTable.push([names[1], coralAreaDict["bleached"]]);
        var data = google.visualization.arrayToDataTable(dataTable);

        var colors = [LabelManager.getColorById(targetId), "gray"];
        var slices = {
            0: { textStyle: { color: "black" } },
            1: { textStyle: { color: "black" } },
        };

        const chart = new google.visualization.PieChart(chartContainer);
        const options = {
            ...this.glbOptions,
            ...{
                colors: colors,
                slices: slices,
            },
        };
        chart.draw(data, options);

        const legends = this.createLegends({ colors: colors, names: names });

        legends.forEach((legend) => {
            legendsContainer.appendChild(legend);
        });

        nameText.innerHTML = `Coral Condition Distribution (${id2Name[targetId]})`;

        downloadButton.addEventListener("click", () => {
            const filename = response["filename"];
            this.download(
                chart,
                `coral_species_condition_distribution_${filename}`
            );
        });

        return chartItem;
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

    isIncluded(maskIdx, filteredIndices) {
        return filteredIndices.includes(parseInt(maskIdx));
    }

    getId2Name(jsonItem) {
        let id2Name = {};
        for (const category of jsonItem["categories"]) {
            id2Name[category["id"]] = category["name"];
        }
        return id2Name;
    }

    clearCharts() {
        this.currentImageGrid.innerHTML = "";
    }

    calChartBoxHeight() {
        // Select all elements with the class 'chart'
        const charts = document.querySelectorAll(".chart-item__top");

        // Create an object to hold groups of charts by their Y-offset
        const groupedCharts = {};

        // Iterate over each chart element to group them by their window Y-offset
        charts.forEach((chart) => {
            const rect = chart.getBoundingClientRect(); // Get the bounding rectangle
            const yOffset = rect.top + window.scrollY; // Calculate the Y-offset relative to the document

            // If the Y-offset is not already a key in the groupedCharts object, create an array for it
            if (!groupedCharts[yOffset]) {
                groupedCharts[yOffset] = [];
            }

            // Push the current chart into the appropriate group
            groupedCharts[yOffset].push(chart);
        });

        // Iterate over each group to calculate the maximum height and apply it
        Object.keys(groupedCharts).forEach((yOffset) => {
            const group = groupedCharts[yOffset];
            let maxHeight = 0;

            // Calculate the maximum height in the current group
            group.forEach((chart) => {
                const height = chart.offsetHeight; // Get the height of the element
                if (height > maxHeight) {
                    maxHeight = height; // Update maxHeight if current height is greater
                }
            });

            // Set the height of each chart in the group to the maximum height found
            group.forEach((chart) => {
                chart.style.height = maxHeight + "px"; // Apply the maximum height
            });
        });
    }
}
