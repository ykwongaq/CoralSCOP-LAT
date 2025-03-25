import { Request } from "./request.js";

/**
 * Store the request to create a project.
 * The request contain the following information:
 * 1. List of input images
 * 2. Path to the output directory
 * 3. Coral segmentation configuration
 */
export class CreateProjectRequest extends Request {
    static INPUTS = "inputs";
    static OUTPUT_FILE = "output_file";
    static CONFIG = "config";

    static IMAGE_URL = "image_url";
    static IMAGE_FILE_NAME = "image_file_name";

    static NEED_SEGMENTATION = "need_segmentation";

    constructor() {
        super();
        this.request = {};
        this.request[CreateProjectRequest.INPUTS] = [];
        this.request[CreateProjectRequest.OUTPUT_FILE] = "";
        this.request[CreateProjectRequest.CONFIG] = "";
        this.request[CreateProjectRequest.NEED_SEGMENTATION] = true;
    }

    addInput(imageUrl, imageFileName) {
        let item = {};
        item[CreateProjectRequest.IMAGE_URL] = imageUrl;
        item[CreateProjectRequest.IMAGE_FILE_NAME] = imageFileName;
        this.request[CreateProjectRequest.INPUTS].push(item);
    }

    setOutputPath(outputFile) {
        this.request[CreateProjectRequest.OUTPUT_FILE] = outputFile;
    }

    setConfig(config) {
        this.request[CreateProjectRequest.CONFIG] = config;
    }

    setNeedSegmentation(needSegmentation) {
        this.request[CreateProjectRequest.NEED_SEGMENTATION] = needSegmentation;
    }

    toJson() {
        return this.request;
    }
}
