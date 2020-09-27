import ShellyShutterManager from './shutter/ShellyShutterManager.mjs'
import { EventEmitter } from 'events'
import shellies from 'shellies'

const ShellyManagers = [
  ShellyShutterManager,
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

  start() {
    shellies.on('discover', this.deviceFound.bind(this))
    shellies.start()
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
