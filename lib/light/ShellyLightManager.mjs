import LightBulbAccessory from './LightBulbAccessory.mjs'
import ShellyLight from './ShellyLight.mjs'

export default class ShellyLightManager {
  static get DeviceType() {
    return "SHRGBW2";
  }

  static get AccessoryClass() {
    return LightBulbAccessory;
  }

  constructor(log) {
    this.log = log;
    this.devices = new Map();
    this.nodes = new Map();
    this.devicesInfo = new Map();
  }

  async valueChanged(device, property, newValue, oldValue, node) {
    this.log.debug('valueChanged', node.id, device.name, property, oldValue, '->', newValue);
    await device.update(node.switch3, node.brightness3);
  }

  async deviceFound(node) {
    node.settings = await node.getSettings();
    const name = node.name;
    const device = new ShellyLight(this, name, node, node.switch3, node.brightness3);
    this.devices.set(name, device);
    node.on('change:switch3', this.valueChanged.bind(this, device, 'switch3'))
    node.on('change:brightness3', this.valueChanged.bind(this, device, 'brightness3'))
    return device;
  }

  setValues(node, power, brightness) {
    this.log.debug('setValues', node.id, power, brightness);    
    return node.setWhite(3, brightness, power);
  }
}
