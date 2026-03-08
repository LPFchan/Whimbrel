/**
 * Whimbrel serial: Web Serial API helpers for provisioning and DFU.
 */

import { CONFIG } from "./config.js";

export function isSupported() {
  return "serial" in navigator;
}

export async function requestPort() {
  return await navigator.serial.requestPort();
}

export class SerialConnection {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readBuffer = "";
    this.readerLoopPromise = null;
    this.lineResolvers = [];
  }

  async open(port, options = {}) {
    if (this.port !== null) {
      throw new Error("Serial port already in use");
    }
    this.port = port;
    const baudRate = options.baudRate || CONFIG.BAUDRATE;
    const bufferSize = options.bufferSize || undefined;
    
    const openOpts = { baudRate };
    if (bufferSize) openOpts.bufferSize = bufferSize;
    
    await this.port.open(openOpts);

    const encoder = new TextEncoderStream();
    encoder.readable.pipeTo(this.port.writable);
    this.writer = encoder.writable.getWriter();

    const decoder = new TextDecoderStream();
    this.port.readable.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();
    this.readBuffer = "";

    this.readerLoopPromise = (async () => {
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            this.readBuffer += value;
            this._processLineResolvers();
          }
        }
      } catch (e) {
        this._rejectAllResolvers(e);
      }
    })();
  }

  _processLineResolvers() {
    while (this.lineResolvers.length > 0) {
      const idx = this.readBuffer.indexOf("\n");
      if (idx !== -1) {
        const line = this.readBuffer.slice(0, idx).trim();
        this.readBuffer = this.readBuffer.slice(idx + 1);
        const { resolve, timer } = this.lineResolvers.shift();
        if (timer) clearTimeout(timer);
        resolve(line);
      } else {
        break;
      }
    }
  }

  _rejectAllResolvers(error) {
    while (this.lineResolvers.length > 0) {
      const { reject, timer } = this.lineResolvers.shift();
      if (timer) clearTimeout(timer);
      reject(error);
    }
  }

  async sendLine(line) {
    if (!this.writer) throw new Error("Serial not open");
    await this.writer.write(line + "\n");
  }

  async readLineWithTimeout(timeoutMs) {
    if (!this.reader) throw new Error("Serial not open");

    const idx = this.readBuffer.indexOf("\n");
    if (idx !== -1) {
      const line = this.readBuffer.slice(0, idx).trim();
      this.readBuffer = this.readBuffer.slice(idx + 1);
      return line;
    }

    return new Promise((resolve, reject) => {
      let timer = null;
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          const i = this.lineResolvers.findIndex(r => r.resolve === resolve);
          if (i !== -1) this.lineResolvers.splice(i, 1);
          reject(new Error(`Timeout (${(timeoutMs / 1000).toFixed(0)}s)`));
        }, timeoutMs);
      }
      this.lineResolvers.push({ resolve, reject, timer });
    });
  }

  async close() {
    try {
      this._rejectAllResolvers(new Error("Serial port closed manually"));
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close().catch(() => {});
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.readerLoopPromise) {
        await this.readerLoopPromise;
        this.readerLoopPromise = null;
      }
    } finally {
      if (this.port) {
        await this.port.close().catch(() => {});
      }
      this.port = null;
    }
  }
}
