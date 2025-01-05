class PreprocessConfig {
    static DEFAULT_OUTPUT_DIR = ".";
    constructor() {
        if (PreprocessConfig.instance) {
            return PreprocessConfig.instance;
        }

        PreprocessConfig.instance = this;
        this.outputDir = PreprocessConfig.DEFAULT_OUTPUT_DIR;
        return this;
    }

    setOutputDir(outputDir) {
        this.outputDir = outputDir;
    }

    getOutputDir() {
        return this.outputDir;
    }

    exportJson() {
        return {
            output_dir: this.outputDir,
        };
    }

    importJson(json) {
        this.outputDir = json.output_dir;
    }
}
