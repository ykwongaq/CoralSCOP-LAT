class ActionState {
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

class MaskSelectionState extends ActionState {
    constructor(context) {
        super(context);

        this.core = new Core();
        this.maskSelector = new MaskSelector();
        this.canvas = new Canvas();
    }

    /**
     * Do nothing
     * @param {number} imageX
     * @param {number} imageY
     */
    rightClickPixel(imageX, imageY) {}

    /**
     * Check is any mask is clicked.
     * If clicked, toggle the mask selection
     * @param {number} imageX
     * @param {number} imageY
     */
    leftClickPixel(imageX, imageY) {
        const data = this.core.getData();
        const masks = data.getMasks();
        for (const mask of masks) {
            if (mask.containPixel(imageX, imageY)) {
                if (this.maskSelector.isSelected(mask)) {
                    this.maskSelector.unselectMask(mask);
                } else {
                    this.maskSelector.selectMask(mask);
                }
            }
        }
        this.canvas.updateMasks();
    }
}

class MaskCreationState extends ActionState {
    constructor(context) {
        super(context);

        this.maskCreator = new MaskCreator();
    }

    leftClickPixel(imageX, imageY) {
        this.maskCreator.addPrompt(imageX, imageY, Prompt.POSITIVE);
    }

    rightClickPixel(imageX, imageY) {
        this.maskCreator.addPrompt(imageX, imageY, Prompt.NEGATIVE);
    }
}

/**
 * ActionManager is used to manage the user actions.
 * Some of the actions will depends on the current state,
 * such as canvas click, short cut, etc.
 * ActionManage is a finte state machine.
 */
class ActionManager {
    static STATE_SELECT_MASK = 0;
    static STATE_CREATE_MASK = 1;

    static DEFAULT_STATE = ActionManager.STATE_SELECT_MASK;

    constructor() {
        if (ActionManager.instance) {
            return ActionManager.instance;
        }
        ActionManager.instance = this;

        this.state = null;

        this.maskCreationState = new MaskCreationState(this);
        this.maskSelectionState = new MaskSelectionState(this);

        this.setState(ActionManager.DEFAULT_STATE);

        this.registeredDocumentEvents = new Set();
    }

    rightClickPixel(imageX, imageY) {
        this.state.rightClickPixel(imageX, imageY);
    }

    leftClickPixel(imageX, imageY) {
        this.state.leftClickPixel(imageX, imageY);
    }

    setState(stateId) {
        switch (stateId) {
            case ActionManager.STATE_SELECT_MASK:
                this.state = this.maskSelectionState;
                break;
            case ActionManager.STATE_CREATE_MASK:
                this.state = this.maskCreationState;
                break;
            default:
                throw new Error("Invalid state");
        }
    }

    registerShortCut(state, key, callback) {
        const keyCombo = this.normalizeKeyCombo(key);
        switch (state) {
            default:
                throw new Error("Invalid state");
            case ActionManager.STATE_SELECT_MASK:
                this.maskSelectionState.registerShortCut(keyCombo, callback);
                break;
            case ActionManager.STATE_CREATE_MASK:
                this.maskCreationState.registerShortCut(keyCombo, callback);
                break;
        }
    }

    handleShortCut(key, event) {
        const keyCombo = this.eventToKeyCombo(event);
        this.state.handleShortCut(keyCombo, event);
    }

    // Normalize a key combination string to ensure consistent matching
    normalizeKeyCombo(keyCombo) {
        return keyCombo.toLowerCase().split("+").sort().join("+"); // Sort and join keys to ensure order doesn't matter
    }

    // Convert a key event to a normalized key combination string
    eventToKeyCombo(event) {
        const keys = [];
        if (event.ctrlKey) keys.push("control");
        if (event.metaKey) keys.push("meta");
        if (event.shiftKey) keys.push("shift");
        if (event.altKey) keys.push("alt");
        keys.push(event.key.toLowerCase()); // Add the actual key
        return keys.sort().join("+"); // Sort keys to ensure combinations match any order
    }

    getRegisteredDocumentEvents() {
        return this.registeredDocumentEvents;
    }

    addRegisteredDocumentEvent(event) {
        this.registeredDocumentEvents.add(event);
    }

    haveRegisteredDocumentEvent(event) {
        return this.registeredDocumentEvents.has(event);
    }
}
