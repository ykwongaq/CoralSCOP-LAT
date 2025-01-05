class ToggleInput {
  constructor(_dom, options) {
    this.eventHandlers = {};
    this.container = _dom;
    this.toggleBtn = _dom.querySelector(".toggle-fn__btn");
    this.input = _dom.querySelector('[type=text]');


    this.toggleBtn.addEventListener("click", () => {
      this.container.classList.toggle("open");
      if (this.input && this.container.classList.contains('open')) {
        this.input.focus();
      }
      this._trigger("toggle");
    });

    return this;
  }

  _hide() {
    this.container.classList.remove("open");
  }

  on(eventName, handler) {
    if (!this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = [];
    }
    this.eventHandlers[eventName].push(handler);
  }

  _trigger(eventName, paramsArray) {
    const handlers = this.eventHandlers[eventName];
    const __this = this;
    if (handlers) {
      const passParams = [__this];
      if (paramsArray && Array.isArray(paramsArray)) {
        passParams.push(...paramsArray);
      }
      handlers.forEach((handler) => handler(...passParams));
    }
  }
}


document.querySelectorAll(".toggle-fn").forEach((item) => {
  item.ToggleInput = new ToggleInput(item);
});