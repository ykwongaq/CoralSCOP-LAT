class ActionState {
    constructor(context) {
        this.context = context;
    }

    rightClickPixel(imageX, imageY) {
        throw new Error("Method not implemented.");
    }

    leftClickPixel(imageX, imageY) {
        throw new Error("Method not implemented.");
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
    }

    rightClickPixel(imageX, imageY) {}

    leftClickPixel(imageX, imageY) {}
}

/**
 * ActionManager is used to manage the user
 * canvas actions.
 *
 * ActionManage is a finte state machine
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
            case ActionManager.ACTION_CREATE_MASK:
                this.state = this.STATE_CREATE_MASK;
                break;
            default:
                throw new Error("Invalid state");
        }
    }
}
