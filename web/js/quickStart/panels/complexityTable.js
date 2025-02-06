export class ComplexityTable {
    constructor(dom) {
        this.dom = dom;
        this.tableBody = this.dom.querySelector("tbody");
    }

    update(data) {
        for (let [key, value] of Object.entries(data)) {
            const row = document.createElement("tr");

            const keyCell = document.createElement("td");
            keyCell.textContent = key;
            row.appendChild(keyCell);

            const valueCell = document.createElement("td");
            if (!isNaN(value)) {
                value = value.toFixed(4);
            }
            valueCell.textContent = value;
            row.appendChild(valueCell);

            this.tableBody.appendChild(row);
        }
    }
}
