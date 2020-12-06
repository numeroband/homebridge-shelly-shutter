import ShellyShutterManager from './shutter/ShellyShutterManager.mjs'
import ShellyLightManager from './light/ShellyLightManager.mjs'
import { EventEmitter } from 'events'
import shellies from 'shellies'

const ShellyManagers = [
  ShellyShutterManager,
  ShellyLightManager,
];

export default class ShellyManager extends EventEmitter {
  constructor(log) {
    super();
    this.log = log;
    this.managers = new Map();
    ShellyManagers.forEach(managerClass => {
      this.managers.set(managerClass.DeviceType, new managerClass(log));
    });
  }

  start(iface) {
    shellies.on('discover', this.deviceFound.bind(this))
    shellies.start(iface)
  }

  async deviceFound(node) {
    this.log.debug('Discovered', node.id, node.host);
    const manager = this.managers.get(node.type);
    if (!manager) {
      this.log("Unknown device type " + node.type);
      return;
    }
    const device = await manager.deviceFound(node);
    if (device) {
      this.emit('discover', device, manager.constructor.AccessoryClass);
    }
  }
}
