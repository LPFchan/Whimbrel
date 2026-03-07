/**
 * Whimbrel serial: Web Serial API helpers for provisioning and DFU.
 * Loaded after crypto.js.
 */

const BAUDRATE = 115200;
let portRef = null;
let reader = null;
let writer = null;
let readBuffer = "";
let readerLoopPromise = null;

function isSupported() {
  return "serial" in navigator;
}

async function requestPort() {
  return await navigator.serial.requestPort();
}

async function openPort(port) {
  if (portRef !== null) {
    throw new Error("Serial port already in use");
  }
  portRef = port;
  await port.open({ baudRate: BAUDRATE });

  const encoder = new TextEncoderStream();
  encoder.readable.pipeTo(port.writable);
  writer = encoder.writable.getWriter();

  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable);
  reader = decoder.readable.getReader();
  readBuffer = "";

  readerLoopPromise = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) readBuffer += value;
      }
    } catch (e) {
      // Stream closed or error
    }
  })();
}

async function sendLine(line) {
  if (!writer) throw new Error("Serial not open");
  await writer.write(line + "\n");
}

async function readLineWithTimeout(timeoutMs) {
  if (!reader) throw new Error("Serial not open");

  const startTime = Date.now();

  while (true) {
    const idx = readBuffer.indexOf("\n");
    if (idx !== -1) {
      const line = readBuffer.slice(0, idx).trim();
      readBuffer = readBuffer.slice(idx + 1);
      return line;
    }

    const remainingMs = timeoutMs - (Date.now() - startTime);
    if (remainingMs <= 0) {
      throw new Error(`Timeout (${(timeoutMs / 1000).toFixed(0)}s)`);
    }

    await new Promise(r => setTimeout(r, Math.min(50, remainingMs)));
  }
}

async function closePort(port) {
  try {
    if (reader) {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
      reader = null;
    }
    if (writer) {
      await writer.close().catch(() => {});
      writer.releaseLock();
      writer = null;
    }
    if (readerLoopPromise) {
      await readerLoopPromise;
      readerLoopPromise = null;
    }
  } finally {
    if (port) {
      await port.close().catch(() => {});
    }
    portRef = null;
  }
}
