class Record {
    constructor(data, categoryInfo) {
        this.data = data;
        this.categoryInfo = categoryInfo;
    }

    getData() {
        return this.data;
    }

    getCategoryInfo() {
        return this.categoryInfo;
    }

    deepCopy() {
        return new Record(
            this.data.deepCopy(),
            structuredClone(this.categoryInfo)
        );
    }
}

class HistoryManager {
    constructor(maxMemory = 10) {
        this.history = []; // Stack to store old states for undo
        this.redoStack = []; // Stack to store states for redo
        this.maxMemory = maxMemory; // Maximum number of states to store
    }

    record(newRecord) {
        if (!(newRecord instanceof Record)) {
            throw new Error("newRecord should be an instance of Record");
        }
        // Push the current state into the undo history
        this.history.push(newRecord.deepCopy());

        // Enforce the maximum memory limit
        if (this.history.length > this.maxMemory) {
            this.history.shift(); // Remove the oldest state
        }

        // Clear the redo stack because new changes invalidate redo history
        this.redoStack = [];
    }

    undo(currentRecord) {
        if (!(currentRecord instanceof Record)) {
            throw new Error("currentRecord should be an instance of Record");
        }

        if (this.canUndo()) {
            const prevRecord = this.history.pop();
            // Push the current state into the redo stack
            this.redoStack.push(currentRecord.deepCopy());
            return prevRecord;
        } else {
            return null;
        }
    }

    redo() {
        if (this.canRedo()) {
            const nextRecord = this.redoStack.pop();
            // Push the current state into the undo history
            this.history.push(nextRecord.deepCopy());
            return nextRecord;
        } else {
            return null;
        }
    }

    canUndo() {
        return this.history.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    getCurrentState() {
        return this.currentRecord;
    }
}
