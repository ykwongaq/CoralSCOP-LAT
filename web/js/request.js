class Request {
    constructor() {}

    toJson() {
        throw new Error("toJson() must be implemented");
    }
}

/**
 * Store the request to create a project.
 * The request contain the following information:
 * 1. List of input images
 * 2. Path to the output directory
 * 3. Coral segmentation configuration
 */
class CreateProjectRequest extends Request {
    static INPUTS = "inputs";
    static OUTPUT_DIR = "output_dir";
    static CONFIG = "config";

    static IMAGE_URL = "image_url";
    static IMAGE_FILE_NAME = "image_file_name";

    constructor() {
        super();
        this.request = {};
        this.request[CreateProjectRequest.INPUTS] = [];
        this.request[CreateProjectRequest.OUTPUT_DIR] = "";
        this.request[CreateProjectRequest.CONFIG] = "";
    }

    addInput(imageUrl, imageFileName) {
        let item = {};
        item[CreateProjectRequest.IMAGE_URL] = imageUrl;
        item[CreateProjectRequest.IMAGE_FILE_NAME] = imageFileName;
        this.request[CreateProjectRequest.INPUTS].push(item);
    }

    setOutputDir(outputDir) {
        this.request[CreateProjectRequest.OUTPUT_DIR] = outputDir;
    }

    setConfig(config) {
        this.request[CreateProjectRequest.CONFIG] = config;
    }

    toDict() {
        return this.request;
    }
}
