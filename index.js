const PLUGIN_NAME = "homebridge-shelly-shutter";
const PLATFORM_NAME = "ShellyShutterPlatform";

module.exports = homebridge => {
  homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, ShellyShutterPlatform, true);
}

class ShellyShutterPlatform {
  constructor(log, config, api) {
    log("ShellyShutterPlatform Init");
    this.log = log;
    this.config = config;
    this.oldAccessories = new Map();
    this.api = api;
    this.name = PLATFORM_NAME;

    this.api.on('didFinishLaunching', async () => {
      this.log("DidFinishLaunching");
      this.createAccessories();
    });  
  }

  configureAccessory(accessory) {
    this.log(accessory.displayName, "Configure Accessory");
    this.oldAccessories.set(accessory.displayName, accessory);
  }

  async createAccessories() {
    const WindowCoverAccessory = (await import('./lib/WindowCoverAccessory.mjs')).default;
    const ShellyShutterManager = (await import('./lib/ShellyShutterManager.mjs')).default;
    const manager = new ShellyShutterManager(this.log, this.config.devices);
    manager.on('discover', device => new WindowCoverAccessory(this.log, this.api, this.accessoryFromDevice(device), device));
    manager.start();
  }

  accessoryFromDevice(device) {
    let accessory = this.oldAccessories.get(device.name);
    if (accessory) {
      this.log("Reusing accessory " + accessory.displayName);
    } else {
      const Categories = this.api.hap.Accessory.Categories;
      accessory = new this.api.platformAccessory(device.name, this.api.hap.uuid.generate(device.name), Categories.WINDOW_COVERING);
      this.api.registerPlatformAccessories(PLUGIN_NAME, this.name, [accessory]);
      this.log("Created accessory " + accessory.displayName);
    }
    return accessory;
  }
}