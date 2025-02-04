export class ActionState {
    constructor(context) {
        this.context = context;

        this.shortCutsDict = {};
    }

    rightClickPixel(imageX, imageY) {
        // Do nothing by default
    }

    leftClickPixel(imageX, imageY) {
        // Do nothing by default
    }

    registerShortCut(key, callback) {
        this.shortCutsDict[key] = callback;
    }

    handleShortCut(key, event) {
        if (event.target.hasAttribute("no-shortcuts")) {
            return;
        }

        event.preventDefault();

        if (key in this.shortCutsDict) {
            this.shortCutsDict[key](event);
        }
    }
}
