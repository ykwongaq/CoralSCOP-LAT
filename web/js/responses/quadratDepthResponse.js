export class QuadratDepthResponse {
    static DEPTH_VIS_PATH = "depth_vis_path";
    static ENCODED_DEPTH = "encoded_depth";
    static COLS = "cols";
    static ROWS = "rows";

    constructor(response) {
        this.response = response;

        if (
            !this.response.hasOwnProperty(QuadratDepthResponse.DEPTH_VIS_PATH)
        ) {
            throw new Error("Depth visualization path is missing");
        }

        if (!this.response.hasOwnProperty(QuadratDepthResponse.ENCODED_DEPTH)) {
            throw new Error("Encoded depth is missing");
        }

        if (!this.response.hasOwnProperty(QuadratDepthResponse.COLS)) {
            throw new Error("Cols is missing");
        }

        if (!this.response.hasOwnProperty(QuadratDepthResponse.ROWS)) {
            throw new Error("Rows is missing");
        }

        this.depthVisPath = this.response[QuadratDepthResponse.DEPTH_VIS_PATH];
        this.rows = parseInt(this.response[QuadratDepthResponse.ROWS]);
        this.cols = parseInt(this.response[QuadratDepthResponse.COLS]);
        this.depthList = this.decodeString(
            this.response[QuadratDepthResponse.ENCODED_DEPTH]
        );
    }

    getDepthVisPath() {
        return encodeURIComponent(
            this.response[QuadratDepthResponse.DEPTH_VIS_PATH]
        );
    }

    getDepthList() {
        return this.depthList;
    }

    getRows() {
        return this.rows;
    }

    getCols() {
        return this.cols;
    }

    decodeString(str) {
        // Decode the base64-encoded array back into a Uint8Array
        const binaryString = atob(str);
        const byteArray = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            byteArray[i] = binaryString.charCodeAt(i);
        }

        return byteArray;
    }
}
