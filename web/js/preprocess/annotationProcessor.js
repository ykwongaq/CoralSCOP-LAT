class AnnotationProcesser {
    constructor() {
        if (AnnotationProcesser.instance) {
            return AnnotationProcesser.instance;
        }
        AnnotationProcesser.instance = this;
        this.shouldSkip = false;
    }

    isShouldSkip() {
        return this.shouldSkip;
    }

    setShouldSkip(shouldSkip) {
        /*
        Exammple usage
        const processor = new AnnotationProcesser();
        processor.setShouldSkip(true);
        */
        this.shouldSkip = shouldSkip;
    }

    generateEmbedding(data_url, imageFile) {
        console.log("Generating embedding for", imageFile);
        eel.generate_embedding(data_url, imageFile)(this.response);
    }

    async process(data_url, imageFile, projectPath, callBack = null) {
        if (this.shouldSkip) {
            return;
        }
        console.log("Processing", imageFile);
        const result = await eel.preprocess(data_url, imageFile, projectPath);
        return result;
    }

    checkProjectPath(projectPath) {
        console.log("Checking project path", projectPath);
        eel.check_project_path(projectPath)(this.response);
    }

    response(result) {
        console.log(result);
    }
}
