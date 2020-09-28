export default class LightBulbAccessory {
  static getCategory(api) {
    return api.hap.Accessory.Categories.LIGHT_BULB;
  }

  constructor(log, api, accessory, device) {
    log("LightBulbAccessory init");
    const Service = api.hap.Service;
    const Characteristic = api.hap.Characteristic;
    this.log = log;
    this.api = api;
    this.device = device;
    this.service = accessory.getService(Service.Lightbulb);

    accessory.on('identify', (paired, callback) => {
      this.log(accessory.displayName, "Identify!!!");
      callback();
    });

    if (this.service) {
      this.log("Reusing cached service");
    } else {
      this.log("Creating service");
      this.service = accessory.addService(Service.Lightbulb, device.name, device.id);
    } 

    this.addAttr(Characteristic.On, this.device.getPower, this.device.setPower);
    this.addAttr(Characteristic.Brightness, this.device.getBrightness, this.device.setBrightness);

    device.setUpdateCallbacks(this.updatePower.bind(this), this.updateBrightness.bind(this));
  }

  addAttr(characteristic, getMethod, setMethod) {
    this.service
      .getCharacteristic(characteristic)
      .on('get', this.getPromise(getMethod))
      .on('set', this.setPromise(setMethod));
  }
  
  getPromise(method) {
    const binded = method.bind(this.device);
    return callback => {
      binded()
      .then(val => callback(null, val))
      .catch(err => {
        this.log.error(err);
        callback(err)
      });      
    }
  }

  setPromise(method) {
    const binded = method.bind(this.device);
    return (value, callback) => {
      binded(value)
      .then(() => callback())
      .catch(err => {
        this.log.error(err);
        callback(err)
      });      
    }
  }

  async getName() {
    return this.device.name;
  }

  updatePower(value) {
    const Characteristic = this.api.hap.Characteristic;
    this.log(this.device.name, "updatePower", value);
    this.service.updateCharacteristic(Characteristic.On, value);
  }

  updateBrightness(value) {
    const Characteristic = this.api.hap.Characteristic;
    this.log(this.device.name, "updateBrightness", value);
    this.service.updateCharacteristic(Characteristic.Brightness, value);
  }
}
