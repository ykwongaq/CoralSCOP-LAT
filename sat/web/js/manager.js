export class Manager {
    constructor() {
        if (Manager.instance) {
            return Manager.instance;
        }
        Manager.instance = this;

        this.core = null;
        this.interface_ = null;
    }

    setCore(core) {
        this.core = core;
    }

    getCore() {
        return this.core;
    }

    getToolInterface() {
        return this.interface_;
    }

    setToolInterface(interface_) {
        this.interface_ = interface_;
    }
}
