import { MaskCreationState } from "./maskCreationState.js";
import { MaskSelectionState } from "./maskSelectionState.js";

/**
 * ActionManager is used to manage the user actions.
 * Some of the actions will depends on the current state,
 * such as canvas click, short cut, etc.
 * ActionManage is a finte state machine.
 */
export class ActionManager {
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
