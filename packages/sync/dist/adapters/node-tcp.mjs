// src/adapters/node-tcp.ts
import net from "net";
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
      const server = net.createServer((socket) => onConnection(wrap(socket)));
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
      const socket = net.createConnection({ host, port }, () => resolve(wrap(socket)));
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
export {
  NodeTcpTransport
};
