const LEVEL_MIN = 0;
const LEVEL_MAX = 100;

function interpolate(value, srcMax, srcMin, dstMax, dstMin) {
  if (value === undefined) {
    value = 0;
  }

  if (value <= srcMin) {
    return dstMin;
  } 
  
  if (value >= srcMax) {
    return dstMax;
  }

  return dstMin + Math.round((value - srcMin) * (dstMax - dstMin) / (srcMax - srcMin));
}

class Attribute {
  constructor(name, min, max, linked) {
    this.name = name;
    this.min = min;
    this.max = max;
    this.linked = linked
    this.node = undefined;
  }

  setValue(key, value) {
    this[key] = interpolate(value, this.max, this.min, LEVEL_MAX, LEVEL_MIN);
  }

  getValue(key) {
    return interpolate(this[key], LEVEL_MAX, LEVEL_MIN, this.max, this.min)
  }
}

export default class ShellyShutter {
  constructor(manager, name, nodes) {
    this.manager = manager;
    this.log = manager.log;
    this.name = name;    
    this.attrs = {};

    const angle = new Attribute('angle', -90, 90);
    const position = new Attribute('position', 0, 100, angle);
    [position, angle].forEach(attr => this.attrs[attr.name] = attr);

    nodes.forEach(nodeInfo => {
      const attrInfo = this.attrs[nodeInfo.attr];
      if (attrInfo !== undefined) {
        attrInfo.node = nodeInfo.node;
        attrInfo.current = nodeInfo.level;
        attrInfo.target = nodeInfo.level;
      }
      this.attrs[attrInfo.attr] = {current: 0, target: 0};
    });
  }

  getType() {
    return "WindowCovering";
  }

  async getCurrent(attr) {
    const value = this.attrs[attr].getValue('current');
    this.log(this.name, "getCurrent", attr, value);
    return this.getValue;
  }

  async getTarget(attr) {
    const value = this.attrs[attr].getValue('target');
    this.log(this.name, "getTarget", attr, value);
    return value;
  }

  async setTarget(attr, value) {
    this.log(this.name, "setTarget", attr, value);
    const attrInfo = this.attrs[attr];
    attrInfo.setValue('target', value);
    this.manager.setLevel(attrInfo.node, attrInfo.target);

    const linked = attrInfo.linked;
    if (linked && linked.current < attrInfo.target) {
      linked.target = attrInfo.target;
      this.updateTarget(linked.name, linked.getValue('target'));
      this.manager.setLevel(linked.node, linked.target);
    }
  }

  setUpdateCallbacks(current, target) {
    this.updateCurrent = current;
    this.updateTarget = target;
  }

  update(attr, level, moving) {
    const attrInfo = this.attrs[attr];
    const previous = attrInfo.current;

    attrInfo.current = level;
    if (previous != level) {
      this.updateCurrent(attr, attrInfo.getValue('current'));
    }

    switch (moving) {
      case 'stop':
        if (attrInfo.current != attrInfo.target) {
          attrInfo.target = attrInfo.current;
          console.log('Inferring', attr, 'target to current', attrInfo.target);
          this.updateTarget(attr, attrInfo.getValue('target'));
        }
        break;
      case 'open':  
        if (attrInfo.target <= attrInfo.current) {
          attrInfo.target = LEVEL_MAX;
          console.log('Inferring', attr, 'target to max', attrInfo.target);
          this.updateTarget(attr, attrInfo.getValue('target'));
        }
        break;
      case 'close':
        if (attrInfo.target >= attrInfo.current) {
          attrInfo.target = LEVEL_MIN;
          console.log('Inferring', attr, 'target to min', attrInfo.target);
          this.updateTarget(attr, attrInfo.getValue('target'));
        }
        break;
    }
  }
}