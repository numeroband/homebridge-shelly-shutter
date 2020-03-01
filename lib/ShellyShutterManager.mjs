import ShellyShutter from './ShellyShutter.mjs'
import request from 'request-promise-native'
import http from 'http'
import os from 'os'

const HTTP_SERVER_PORT = 9080

function getOrAdd(map, key, value) {
  let ret = map.get(key);
  if (!ret) {
    ret = value;
    map.set(key, value);
  }
  return ret;
}

export default class ShellyShutterManager {
  constructor(log, knownDevices) {
    this.log = log;
    this.knownDevices = knownDevices;
    this.devices = new Map();
    this.nodes = new Map();
    this.devicesInfo = new Map();
  }

  startServer() {
    this.getIp();
    http.createServer((req, res) => {
      res.end();       
      // Skip slash
      const nodeId = req.url.substring(1);
      this.valueChanged(nodeId);
    }).listen(HTTP_SERVER_PORT, this.ip);
    console.log(`HTTP server listening on ${this.ip}:${HTTP_SERVER_PORT}`);
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

  getIp() {
    this.ip = undefined;
    const ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(ifname => ifaces[ifname].forEach(iface => {
      if (this.ip === undefined && iface.family == 'IPv4' && !iface.internal) {
        this.ip = iface.address;
      }
    }));
    if (this.ip === undefined) {
      throw "Cannot find local IP address";
    }
  }

  deviceDiscovery() {
    return new Promise(resolve => {
      this.knownDevices.forEach(name => this.deviceFound(name))
      setTimeout(resolve, 3000);
    });
  }

  async valueChanged(nodeId) {
    this.log.debug('valueChanged', nodeId);
    const nodeInfo = this.nodes.get(nodeId);
    const state = await this.getState(nodeId);
    nodeInfo.moving = state.state;
    if (nodeInfo.moving == 'stop') {
      nodeInfo.level = state.current_pos;
    }
    if (nodeInfo.device) {
      nodeInfo.device.update(nodeInfo.attr, nodeInfo.level, nodeInfo.moving);
    }
  }

  async deviceFound(nodeId) {
    this.log.debug('Found', nodeId);
    const settings = await this.getSettings(nodeId);
    const nameAttr = settings.name.split('_');
    const info = getOrAdd(this.nodes, nodeId, {});
    info.nodeId = nodeId;
    info.attr = nameAttr[1];
    info.name = nameAttr[0];
    getOrAdd(this.devicesInfo, info.name, []).push(info);
    await this.valueChanged(nodeId);
    this.updateUrls(nodeId, settings.rollers[0]);
  }

  async setLevel(nodeId, level) {
    this.log.debug('setLevel', nodeId, level);
    await request.get({
      uri: `http://${nodeId}.local/roller/0`,
      qs: {go: 'to_pos', roller_pos: level}
    })
  }

  getSettings(nodeId) {
    return request.get({
      uri: `http://${nodeId}.local/settings`,
      json: true,
    });
  }

  getState(nodeId) {
    return request.get({
      uri: `http://${nodeId}.local/roller/0`,
      json: true,
    });
  }

  updateUrls(nodeId, roller) {
    const actions = ['open', 'close', 'stop'];
    const urls = actions.map(action => `roller_${action}_url`)
    const targetUrl = `http://${this.ip}:${HTTP_SERVER_PORT}/${nodeId}`;
    urls.forEach(url => {
      if (roller[url] != targetUrl) {
        const qs = {}
        qs[url] = targetUrl;
        this.log(nodeId, qs);
        request.get({
          uri: `http://${nodeId}.local/settings/roller/0`,
          qs: qs
        });
      }
    });
  }
}
