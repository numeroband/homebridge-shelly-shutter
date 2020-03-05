import ShellyShutter from './ShellyShutter.mjs'
import shellies from 'shellies'
import { EventEmitter } from 'events'

export default class ShellyShutterManager extends EventEmitter {
  constructor(log, knownDevices) {
    super();
    this.log = log;
    this.knownDevices = knownDevices;
    this.devices = new Map();
    this.nodes = new Map();
    this.devicesInfo = new Map();
    shellies.on('discover', this.deviceFound.bind(this))
  }

  start() {
    shellies.start()
  }

  async getDevices() {
    this.startServer();
    await this.deviceDiscovery();
    this.devicesInfo.forEach((nodes, name) => {
      const device = new ShellyShutter(this, name, nodes);
      this.devices.set(name, device);
      nodes.forEach(nodeInfo => nodeInfo.device = device);
    });
    this.devicesInfo = undefined;
    return [...this.devices.values()];
  }

  async valueChanged(nodeInfo, newValue, oldValue) {
    const node = nodeInfo.node;
    this.log.debug('valueChanged', node.id, nodeInfo.name, nodeInfo.attr, oldValue, '->', newValue);
    if (nodeInfo.device) {
      nodeInfo.device.update(nodeInfo.attr, node.rollerPosition, node.rollerState);
    }
  }

  async deviceFound(node) {
    this.log.debug('Discovered', node.id, node.host);
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
    } else {
      this.devicesInfo.delete(name);
      const device = new ShellyShutter(this, name, [prevInfo, info]);
      prevInfo.device = device;
      info.device = device;
      this.devices.set(name, device);
      this.emit('discover', device);
    }
  }

  setLevel(node, level) {
    this.log.debug('setLevel', node.id, level);    
    return node.setRollerPosition(level);
  }
}
