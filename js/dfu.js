/**
 * Nordic Serial DFU Implementation over Web Serial
 * Handles SLIP encoding/decoding, CRC32, and the Nordic DFU state machine.
 */

import { CONFIG } from "./config.js";

const OP_PROTOCOL_VERSION = 0x00;
const OP_CREATE_OBJECT = 0x01;
const OP_SET_PRN = 0x02;
const OP_CALC_CHECKSUM = 0x03;
const OP_EXECUTE = 0x04;
const OP_SELECT_OBJECT = 0x06;
const OP_MTU_GET = 0x07;
const OP_WRITE_OBJECT = 0x08;
const OP_PING = 0x09;
const OP_RESPONSE = 0x60;

const OBJ_COMMAND = 0x01;
const OBJ_DATA = 0x02;

const RES_SUCCESS = 0x01;

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(data, crc = 0xFFFFFFFF) {
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

class SlipFramer {
  constructor() {
    this.buffer = new Uint8Array(4096);
    this.length = 0;
    this.escape = false;
  }
  
  append(chunk) {
    const packets = [];
    for (let i = 0; i < chunk.length; i++) {
      const b = chunk[i];
      if (b === 0xC0) {
        if (this.length > 0) {
          packets.push(new Uint8Array(this.buffer.subarray(0, this.length)));
          this.length = 0;
        }
        this.escape = false;
      } else if (b === 0xDB) {
        this.escape = true;
      } else if (this.escape) {
        if (b === 0xDC) this.buffer[this.length++] = 0xC0;
        else if (b === 0xDD) this.buffer[this.length++] = 0xDB;
        else this.buffer[this.length++] = b; // Should not happen
        this.escape = false;
      } else {
        this.buffer[this.length++] = b;
      }
    }
    return packets;
  }
  
  static encode(packet) {
    const out = new Uint8Array(packet.length * 2 + 2);
    out[0] = 0xC0;
    let len = 1;
    for (let i = 0; i < packet.length; i++) {
      const b = packet[i];
      if (b === 0xC0) {
        out[len++] = 0xDB;
        out[len++] = 0xDC;
      } else if (b === 0xDB) {
        out[len++] = 0xDB;
        out[len++] = 0xDD;
      } else {
        out[len++] = b;
      }
    }
    out[len++] = 0xC0;
    return out.subarray(0, len);
  }
}

export class DfuFlasher {
  constructor(port, datBytes, binBytes) {
    this.port = port;
    this.datBytes = datBytes;
    this.binBytes = binBytes;
    this.slip = new SlipFramer();
    this.reader = null;
    this.writer = null;
    this.readLoopPromise = null;
    this.responseQueue = [];
    this.responseResolvers = [];
    this.mtu = CONFIG.DFU_DEFAULT_MTU;
  }

  async startReader() {
    const decoder = new TransformStream({
      transform: (chunk, controller) => {
        const packets = this.slip.append(chunk);
        for (const p of packets) {
          controller.enqueue(p);
        }
      }
    });

    this.port.readable.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();

    this.readLoopPromise = (async () => {
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value && value[0] === OP_RESPONSE) {
            const opcode = value[1];
            const idx = this.responseResolvers.findIndex(r => r.reqOpcode === opcode);
            if (idx !== -1) {
              const r = this.responseResolvers[idx];
              this.responseResolvers.splice(idx, 1);
              clearTimeout(r.timer);
              r.resolve(value);
            } else {
              this.responseQueue.push(value);
            }
          }
        }
      } catch (e) {
        // Stream closed
        this._rejectAllResolvers(e);
      }
    })();
  }
  
  _rejectAllResolvers(error) {
    while (this.responseResolvers.length > 0) {
      const r = this.responseResolvers.shift();
      clearTimeout(r.timer);
      r.reject(error);
    }
  }

  async send(data) {
    const packet = SlipFramer.encode(data);
    if (!this.writer) {
      this.writer = this.port.writable.getWriter();
    }
    await this.writer.write(packet);
    this.writer.releaseLock();
    this.writer = null;
  }

  async receiveResponse(reqOpcode, timeoutMs = 5000) {
    const idx = this.responseQueue.findIndex(pkt => pkt[1] === reqOpcode);
    let pkt;
    if (idx !== -1) {
      pkt = this.responseQueue[idx];
      this.responseQueue.splice(idx, 1);
    } else {
      pkt = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const i = this.responseResolvers.findIndex(r => r.resolve === resolve);
          if (i !== -1) this.responseResolvers.splice(i, 1);
          reject(new Error(`DFU timeout waiting for response to opcode ${reqOpcode}`));
        }, timeoutMs);
        this.responseResolvers.push({ reqOpcode, resolve, reject, timer });
      });
    }

    if (pkt[2] !== RES_SUCCESS) {
      throw new Error(`DFU Error: Opcode ${reqOpcode} failed with code ${pkt[2]}`);
    }
    return pkt;
  }

  async sendCommandAndRead(reqOpcode, payload = []) {
    const req = new Uint8Array([reqOpcode, ...payload]);
    await this.send(req);
    return await this.receiveResponse(reqOpcode);
  }

  async ping() {
    const res = await this.sendCommandAndRead(OP_PING, [0x01]);
    return res;
  }

  async setPRN(prn) {
    const view = new DataView(new ArrayBuffer(2));
    view.setUint16(0, prn, true);
    await this.sendCommandAndRead(OP_SET_PRN, new Uint8Array(view.buffer));
  }

  async getMTU() {
    try {
      const res = await this.sendCommandAndRead(OP_MTU_GET);
      const view = new DataView(res.buffer, res.byteOffset, res.byteLength);
      this.mtu = view.getUint16(3, true);
    } catch (e) {
      console.warn("MTU get failed, using default " + CONFIG.DFU_DEFAULT_MTU);
      this.mtu = CONFIG.DFU_DEFAULT_MTU;
    }
  }

  async selectObject(type) {
    const res = await this.sendCommandAndRead(OP_SELECT_OBJECT, [type]);
    const view = new DataView(res.buffer, res.byteOffset, res.byteLength);
    const maxSize = view.getUint32(3, true);
    const offset = view.getUint32(7, true);
    const crc = view.getUint32(11, true);
    return { maxSize, offset, crc };
  }

  async createObject(type, size) {
    const view = new DataView(new ArrayBuffer(4));
    view.setUint32(0, size, true);
    await this.sendCommandAndRead(OP_CREATE_OBJECT, [type, ...new Uint8Array(view.buffer)]);
  }

  async calcChecksum() {
    const res = await this.sendCommandAndRead(OP_CALC_CHECKSUM);
    const view = new DataView(res.buffer, res.byteOffset, res.byteLength);
    const offset = view.getUint32(3, true);
    const crc = view.getUint32(7, true);
    return { offset, crc };
  }

  async execute() {
    await this.sendCommandAndRead(OP_EXECUTE);
  }

  async writeObject(dataChunk) {
    const maxChunk = (this.mtu || CONFIG.DFU_DEFAULT_MTU) / 2 - 2; // slip overhead safety
    const req = new Uint8Array(maxChunk + 1);
    req[0] = OP_WRITE_OBJECT;
    
    for (let i = 0; i < dataChunk.length; i += maxChunk) {
      const sliceSize = Math.min(maxChunk, dataChunk.length - i);
      const slice = dataChunk.subarray(i, i + sliceSize);
      
      if (sliceSize === maxChunk) {
        req.set(slice, 1);
        await this.send(req);
      } else {
        const lastReq = new Uint8Array(sliceSize + 1);
        lastReq[0] = OP_WRITE_OBJECT;
        lastReq.set(slice, 1);
        await this.send(lastReq);
      }
    }
  }

  async flash(onProgress) {
    onProgress("Opening port...");
    await this.port.open({ baudRate: CONFIG.BAUDRATE, bufferSize: CONFIG.DFU_BUFFER_SIZE });
    
    await this.startReader();
    
    try {
      onProgress("Pinging device...");
      await this.ping();
      
      onProgress("Disabling PRN...");
      await this.setPRN(0);

      onProgress("Getting MTU...");
      await this.getMTU();

      // Phase 1: Command (Init packet)
      onProgress("Initializing firmware update...");
      const cmdInfo = await this.selectObject(OBJ_COMMAND);
      
      await this.createObject(OBJ_COMMAND, this.datBytes.length);
      await this.writeObject(this.datBytes);
      
      const cmdChk = await this.calcChecksum();
      const expectedCmdCrc = crc32(this.datBytes);
      if (cmdChk.crc !== expectedCmdCrc) {
        throw new Error(`Command CRC mismatch. Expected ${expectedCmdCrc}, got ${cmdChk.crc}`);
      }
      
      await this.execute();

      // Phase 2: Data (Firmware payload)
      onProgress("Starting data transfer...");
      const dataInfo = await this.selectObject(OBJ_DATA);
      const maxSize = dataInfo.maxSize;
      
      let offset = 0;
      const totalSize = this.binBytes.length;
      
      while (offset < totalSize) {
        const chunkSize = Math.min(maxSize, totalSize - offset);
        const chunk = this.binBytes.subarray(offset, offset + chunkSize);
        
        onProgress(`Writing object at offset ${offset}...`, offset / totalSize);
        await this.createObject(OBJ_DATA, chunkSize);
        await this.writeObject(chunk);
        
        const chk = await this.calcChecksum();
        const expectedChunkCrc = crc32(chunk);
        
        if (chk.offset !== offset + chunkSize) {
          throw new Error(`Data offset mismatch. Expected ${offset + chunkSize}, got ${chk.offset}`);
        }
        if (chk.crc !== expectedChunkCrc) {
          throw new Error(`Data CRC mismatch at offset ${offset}.`);
        }
        
        await this.execute();
        offset += chunkSize;
        
        onProgress(`Object written successfully.`, offset / totalSize);
      }

      onProgress("Firmware update complete!", 1.0);
      
    } finally {
      this._rejectAllResolvers(new Error("DFU flash finished or aborted"));
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader.releaseLock();
      }
      if (this.readLoopPromise) {
        await this.readLoopPromise;
      }
      await this.port.close().catch(() => {});
    }
  }
}
