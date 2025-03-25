export class Rectangle {
    constructor(x1, y1, x2, y2) {
        // Ensure that x1, y1 refer to the top-left corner and x2, y2 refer to the bottom-right corner
        if (x1 > x2) {
            [x1, x2] = [x2, x1];
        }
        if (y1 > y2) {
            [y1, y2] = [y2, y1];
        }
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

    static isIntersect(rect1, rect2) {
        return (
            rect1.x1 < rect2.x2 &&
            rect1.x2 > rect2.x1 &&
            rect1.y1 < rect2.y2 &&
            rect1.y2 > rect2.y1
        );
    }

    isInside(anotherRectangle) {
        return (
            this.x1 >= anotherRectangle.x1 &&
            this.y1 >= anotherRectangle.y1 &&
            this.x2 <= anotherRectangle.x2 &&
            this.y2 <= anotherRectangle.y2
        );
    }
}
