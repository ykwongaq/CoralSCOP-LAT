export class Quadrat {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    getX1() {
        return this.x1;
    }

    getY1() {
        return this.y1;
    }

    getX2() {
        return this.x2;
    }

    getY2() {
        return this.y2;
    }

    toJson() {
        return {
            x1: this.x1,
            y1: this.y1,
            x2: this.x2,
            y2: this.y2,
        };
    }
}
