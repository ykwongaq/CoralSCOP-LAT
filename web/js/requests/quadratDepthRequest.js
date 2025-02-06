import { Request } from "./request.js";

export class QuadratDepthRequest extends Request {
    constructor() {
        super();
        this.x1 = null;
        this.y1 = null;
        this.x2 = null;
        this.y2 = null;
    }

    setX1(x1) {
        this.x1 = x1;
    }

    setY1(y1) {
        this.y1 = y1;
    }

    setX2(x2) {
        this.x2 = x2;
    }

    setY2(y2) {
        this.y2 = y2;
    }

    toJson() {
        return {
            coordinates: [this.x1, this.y1, this.x2, this.y2],
        };
    }
}
