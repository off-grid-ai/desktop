"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/adapters/node-tcp.ts
var node_tcp_exports = {};
__export(node_tcp_exports, {
  NodeTcpTransport: () => NodeTcpTransport
});
module.exports = __toCommonJS(node_tcp_exports);
var import_net = __toESM(require("net"));
function wrap(socket) {
  const id = `${socket.remoteAddress ?? "?"}:${socket.remotePort ?? "?"}`;
  socket.on("error", () => socket.destroy());
  return {
    id,
    remoteHost: socket.remoteAddress ?? void 0,
    send: (data) => socket.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength)),
    onData: (cb) => socket.on("data", (d) => cb(new Uint8Array(d.buffer, d.byteOffset, d.byteLength))),
    onClose: (cb) => socket.on("close", () => cb()),
    close: () => socket.destroy()
  };
}
var NodeTcpTransport = class {
  server;
  /** The port actually bound after listen() (useful when listening on 0). */
  boundPort;
  listen(port, onConnection) {
    return new Promise((resolve, reject) => {
      const server = import_net.default.createServer((socket) => onConnection(wrap(socket)));
      server.once("error", reject);
      server.listen(port, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") this.boundPort = addr.port;
        this.server = server;
        resolve();
      });
    });
  }
  connect(host, port) {
    return new Promise((resolve, reject) => {
      const socket = import_net.default.createConnection({ host, port }, () => resolve(wrap(socket)));
      socket.once("error", reject);
    });
  }
  stop() {
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
      this.server = void 0;
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NodeTcpTransport
});
