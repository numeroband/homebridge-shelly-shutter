const PLUGIN_NAME = "homebridge-shelly-shutter";
const PLATFORM_NAME = "ShellyShutterPlatform";

module.exports = homebridge => {
  homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, ShellyPlatform, true);
}

class ShellyPlatform {
  constructor(log, config, api) {
    log("ShellyPlatform Init");
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
    const ShellyManager = (await import('./lib/ShellyManager.mjs')).default;
    const manager = new ShellyManager(this.log);
    manager.on('discover', this.createAccessory.bind(this));
    manager.start();
  }

  createAccessory(device, accessoryClass) {
    let accessory = this.oldAccessories.get(device.name);
    if (accessory) {
      this.log("Reusing accessory " + accessory.displayName);
    } else {
      const category = accessoryClass.getCategory(this.api);
      accessory = new this.api.platformAccessory(device.name, this.api.hap.uuid.generate(device.name), category);
      this.api.registerPlatformAccessories(PLUGIN_NAME, this.name, [accessory]);
      this.log("Created accessory " + accessory.displayName);
    }
    new accessoryClass(this.log, this.api, accessory, device);
  }
}