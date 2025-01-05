class LabelConfig {
    constructor() {
        if (LabelConfig.instance) {
            return LabelConfig.instance;
        }

        LabelConfig.instance = this;
        this.minArea = null;
        this.maxIOU = null;
        this.minConfidence = null;
        return this;
    }

    setMinArea(minArea) {
        this.minArea = minArea;
    }

    setMaxIOU(maxIOU) {
        this.maxIOU = maxIOU;
    }

    setMinConfidence(minConfidence) {
        this.minConfidence = minConfidence;
    }

    getMinArea() {
        return this.minArea;
    }

    getMaxIOU() {
        return this.maxIOU;
    }

    getMinConfidence() {
        return this.minConfidence;
    }

    exportJson() {
        return {
            minArea: this.minArea,
            maxIOU: this.maxIOU,
            minConfidence: this.minConfidence,
        };
    }

    importJson(json) {
        this.minArea = json.minArea;
        this.maxIOU = json.maxIOU;
        this.minConfidence = json.minConfidence;
    }
}
