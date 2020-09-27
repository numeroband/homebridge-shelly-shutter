import WindowCoverAccessory from './WindowCoverAccessory.mjs'
import ShellyShutter from './ShellyShutter.mjs'

export default class ShellyShutterManager {
  static get DeviceType() {
    return "SHSW-25";
  }

  static get AccessoryClass() {
    return WindowCoverAccessory;
  }

  constructor(log) {
    this.log = log;
    this.devices = new Map();
    this.nodes = new Map();
    this.devicesInfo = new Map();
  }

  async valueChanged(nodeInfo, newValue, oldValue) {
    const node = nodeInfo.node;
    this.log.debug('valueChanged', node.id, nodeInfo.name, nodeInfo.attr, oldValue, '->', newValue);
    
    if (newValue == 'open' || newValue == 'close') {
      return;
    }

    if (nodeInfo.device) {
      nodeInfo.device.update(nodeInfo.attr, node.rollerPosition, node.rollerState);
    }
  }

  async deviceFound(node) {
    node.settings = await node.getSettings();
    const nameAttr = node.name.split('_');
    const level = node.rollerPosition;
    const name = nameAttr[0];
    const attr = nameAttr[1];
    const info = {node, name, attr, level};
    node.on('change:rollerPosition', this.valueChanged.bind(this, info))
    node.on('change:rollerState', this.valueChanged.bind(this, info))

    const prevInfo = this.devicesInfo.get(name);
    if (prevInfo == undefined) {
      this.devicesInfo.set(name, info);
      return null;
    }

    this.devicesInfo.delete(name);
    const device = new ShellyShutter(this, name, [prevInfo, info]);
    prevInfo.device = device;
    info.device = device;
    this.devices.set(name, device);
    return device;
  }

  setLevel(node, level) {
    this.log.debug('setLevel', node.id, level);    
    return node.setRollerPosition(level);
  }
}
