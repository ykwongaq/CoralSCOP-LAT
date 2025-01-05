// Load Google Charts
google.charts.load("current", { packages: ["corechart", "bar"] });
google.charts.setOnLoadCallback(drawCharts);

// Function to draw all charts
function drawCharts() {
    drawChart1();
    drawChart2();
    drawChart3();
    drawChart4();
    // Add more chart drawing functions as needed
}

// Example Chart Drawing Functions
function drawChart1() {
    var data = google.visualization.arrayToDataTable([
        ["Year", "Sales"],
        ["2016", 1000],
        ["2017", 1170],
        ["2018", 660],
        ["2019", 1030],
    ]);

    var container = document.getElementById("chart1");
    var chart = new google.visualization.ColumnChart(container);

    var options = {
        title: "Company Performance",
        legend: { position: "top" },
        chartArea: { left: "10%", top: "10%", width: "80%", height: "75%" }, // Adjusted to fill more space
        backgroundColor: "#fff",
        // Remove fixed width and height
        // Use 'width: container.offsetWidth' and 'height: container.offsetHeight' if needed
    };

    chart.draw(data, options);

    // Store chart instance for download and responsive redraw
    window.charts = window.charts || {};
    window.charts["chart1"] = { chart: chart, data: data, options: options };
}

function drawChart2() {
    var data = google.visualization.arrayToDataTable([
        ["Task", "Hours per Day"],
        ["Work", 8],
        ["Eat", 2],
        ["Commute", 2],
        ["Watch TV", 2],
        ["Sleep", 8],
    ]);

    var container = document.getElementById("chart2");
    var chart = new google.visualization.PieChart(container);

    var options = {
        title: "My Daily Activities",
        pieHole: 0.4,
        legend: { position: "right" },
        fontSize: 16,
        chartArea: { left: "10%", top: "10%", width: "100%", height: "100%" }, // Adjusted
        backgroundColor: "#fff",
    };

    chart.draw(data, options);

    window.charts = window.charts || {};
    window.charts["chart2"] = { chart: chart, data: data, options: options };
}

function drawChart3() {
    var data = google.visualization.arrayToDataTable([
        ["Month", "Visitors"],
        ["Jan", 1000],
        ["Feb", 1170],
        ["Mar", 660],
        ["Apr", 1030],
    ]);

    var container = document.getElementById("chart3");
    var chart = new google.visualization.LineChart(container);

    var options = {
        title: "Website Traffic",
        legend: { position: "bottom" },
        chartArea: { left: "10%", top: "10%", width: "80%", height: "75%" }, // Adjusted
        backgroundColor: "#fff",
    };

    chart.draw(data, options);

    window.charts = window.charts || {};
    window.charts["chart3"] = { chart: chart, data: data, options: options };
}

function drawChart4() {
    var data = google.visualization.arrayToDataTable([
        ["Product", "Revenue"],
        ["Product A", 500],
        ["Product B", 800],
        ["Product C", 600],
        ["Product D", 700],
    ]);

    var container = document.getElementById("chart4");
    var chart = new google.visualization.BarChart(container);

    var options = {
        title: "Product Revenue",
        legend: { position: "bottom" },
        chartArea: { left: "10%", top: "10%", width: "80%", height: "75%" }, // Adjusted
        backgroundColor: "#fff",
    };

    chart.draw(data, options);

    window.charts = window.charts || {};
    window.charts["chart4"] = { chart: chart, data: data, options: options };
}

// Download Chart as PNG
function downloadChart(chartId) {
    var chartObj = window.charts[chartId];
    if (chartObj && chartObj.chart) {
        var imgUri = chartObj.chart.getImageURI();
        var link = document.createElement("a");
        link.href = imgUri;
        link.download = chartId + ".png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert("Chart not found!");
    }
}

// Redraw charts on window resize for responsiveness
window.addEventListener("resize", function () {
    drawCharts();
});

// Debounce function to limit how often a function can run
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Debounced chart redraw function
const debouncedRedraw = debounce(function () {
    drawCharts();
}, 250); // Adjust the wait time as needed

// Redraw charts on window resize with debounce
window.addEventListener("resize", debouncedRedraw);
