export default class ShellyLight {
  constructor(manager, name, node, power, brightness) {
    this.manager = manager;
    this.log = manager.log;
    this.name = name;
    this.node = node;
    this.power = power;
    this.brightness = brightness;
  }

  async getPower() {
    const value = this.power;
    this.log(this.name, "getPower", value);
    return value;
  }

  async setPower(value) {
    this.log(this.name, "setPower", value);
    this.power = value;
    return this.manager.setValues(this.node, this.power, this.brightness);
  }

  async getBrightness() {
    const value = this.brightness;
    this.log(this.name, "getBrightness", value);
    return value;
  }

  async setBrightness(value) {
    this.log(this.name, "setBrightness", value);
    this.brightness = value;
    return this.manager.setValues(this.node, this.power, this.brightness);
  }

  setUpdateCallbacks(power, brightness) {
    this.updatePower = power;
    this.updateBrightness = brightness;
    power(this.power);
    brightness(this.brightness);
  }

  update(power, brightness) {
    if (this.power != power) {
      this.power = power;
      this.updatePower(power);
    }

    if (this.brightness != brightness)
    {
      this.brightness = brightness;
      this.updateBrightness(brightness);
    }
  }
}