class Slider {
  constructor(_dom, options) {
    this.eventHandlers = {};

    this.container = _dom;
    this.slider = _dom.querySelector("[type=range]");
    this.input = _dom.querySelector("[type=text]");
    this.max = 100;
    this.min = 0;
    this.value = this.slider.value;
    this.suffix = this.slider.dataset.suffix ?? '';
    this.input.value = `${this.value}${this.suffix}`;

    this.slider.addEventListener("input", (event) => {
      const val = event.target.value;
      this.input.value = `${val}${this.suffix}`;
      this._trigger("change");
    });

    this.input.addEventListener("change", (event) => {
      const val = parseInt(event.target.value);
      let updateValue = val;
      if (updateValue < this.min) {
        updateValue = this.min;
      } else if (updateValue > this.max) {
        updateValue = this.max;
      }
      setTimeout(() => {
        this.input.value = `${updateValue}${this.suffix}`;
      }, 10);
      this.slider.value = val;
      this._trigger("change");
    });

    return this;
  }

  _updateShadow() {
    console.log("f");
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