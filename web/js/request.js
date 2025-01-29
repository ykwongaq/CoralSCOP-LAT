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
    static OUTPUT_FILE = "output_file";
    static CONFIG = "config";

    static IMAGE_URL = "image_url";
    static IMAGE_FILE_NAME = "image_file_name";

    constructor() {
        super();
        this.request = {};
        this.request[CreateProjectRequest.INPUTS] = [];
        this.request[CreateProjectRequest.OUTPUT_FILE] = "";
        this.request[CreateProjectRequest.CONFIG] = "";
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

    toJson() {
        return this.request;
    }
}

class FileDialogRequest extends Request {
    static DEFAULT_EXT = "defaultextension";
    static FILE_TYPES = "fileTypes";
    static DESCRIPTION = "description";
    static EXTENSIONS = "extensions";
    static TITLE = "title";

    constructor() {
        super();
        this.request = {};
        this.request[FileDialogRequest.TITLE] = null;
        this.request[FileDialogRequest.DEFAULT_EXT] = null;
        this.request[FileDialogRequest.FILE_TYPES] = [];
    }

    setDefaultExt(defaultExt) {
        this.request[FileDialogRequest.DEFAULT_EXT] = defaultExt;
    }

    setTitle(title) {
        this.request[FileDialogRequest.TITLE] = title;
    }

    addFileType(description, extensions) {
        let item = {};
        item[FileDialogRequest.DESCRIPTION] = description;
        item[FileDialogRequest.EXTENSIONS] = extensions;
        this.request[FileDialogRequest.FILE_TYPES].push(item);
    }

    toJson() {
        return this.request;
    }
}
