/**
 * Web Serial helpers: request port, open at 115200, send line, read line, close.
 */

const BAUDRATE = 115200;
let reader = null;
let writer = null;
let readBuffer = "";

/**
 * Check if Web Serial is available (Chrome/Edge).
 * @returns {boolean}
 */
export function isSupported() {
  return "serial" in navigator;
}

/**
 * Request the user to select a serial port.
 * @returns {Promise<SerialPort>}
 */
export async function requestPort() {
  return await navigator.serial.requestPort();
}

/**
 * Open the given port at 115200 baud.
 * @param {SerialPort} port
 */
export async function open(port) {
  await port.open({ baudRate: BAUDRATE });
  const encoder = new TextEncoderStream();
  encoder.readable.pipeTo(port.writable);
  writer = encoder.writable.getWriter();
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable);
  reader = decoder.readable.getReader();
  readBuffer = "";
}

/**
 * Send a single line (appends \n).
 * @param {string} line
 */
export async function sendLine(line) {
  if (!writer) throw new Error("Serial not open");
  await writer.write(line + "\n");
}

/**
 * Read until a newline; returns the line without the newline.
 * @returns {Promise<string>}
 */
export async function readLine() {
  if (!reader) throw new Error("Serial not open");
  while (true) {
    const idx = readBuffer.indexOf("\n");
    if (idx !== -1) {
      const line = readBuffer.slice(0, idx).trim();
      readBuffer = readBuffer.slice(idx + 1);
      return line;
    }
    const { value, done } = await reader.read();
    if (done) throw new Error("Serial closed");
    readBuffer += value;
  }
}

/**
 * Close the current port (release writer/reader and close port).
 * @param {SerialPort} port
 */
export async function close(port) {
  try {
    if (reader) {
      await reader.cancel();
      reader = null;
    }
    if (writer) {
      await writer.close();
      writer = null;
    }
  } finally {
    if (port) await port.close();
  }
}
