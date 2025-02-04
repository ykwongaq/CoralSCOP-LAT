import { Request } from "./request.js";

export class FileDialogRequest extends Request {
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
