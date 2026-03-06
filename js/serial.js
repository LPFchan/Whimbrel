/**
 * Web Serial helpers: request port, open at 115200, send line, read line, close.
 */

const BAUDRATE = 115200;
let portRef = null;
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
  portRef = port;
  await port.open({ baudRate: BAUDRATE });
  
  // Set up writer
  const encoder = new TextEncoderStream();
  encoder.readable.pipeTo(port.writable);
  writer = encoder.writable.getWriter();
  
  // Set up reader
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
 * Read until a newline or timeout. Throws on timeout.
 * This implementation avoids leaving dangling read Promises.
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
export async function readLineWithTimeout(timeoutMs) {
  if (!reader) throw new Error("Serial not open");
  
  const startTime = Date.now();
  
  while (true) {
    const idx = readBuffer.indexOf("\n");
    if (idx !== -1) {
      const line = readBuffer.slice(0, idx).trim();
      readBuffer = readBuffer.slice(idx + 1);
      return line;
    }
    
    // Calculate remaining time
    const remainingMs = timeoutMs - (Date.now() - startTime);
    if (remainingMs <= 0) {
      // Time is up, we must cancel the reader to avoid dangling promises
      await reader.cancel();
      reader.releaseLock();
      
      // Re-establish the reader so future reads can work if needed
      const decoder = new TextDecoderStream();
      portRef.readable.pipeTo(decoder.writable);
      reader = decoder.readable.getReader();
      
      throw new Error(`Timeout (${(timeoutMs / 1000).toFixed(0)}s)`);
    }

    // Set a race between the actual read and a timeout rejection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout internal")), remainingMs);
    });
    
    try {
      const { value, done } = await Promise.race([reader.read(), timeoutPromise]);
      if (done) throw new Error("Serial closed");
      readBuffer += value ?? "";
    } catch (e) {
      if (e.message === "Timeout internal") {
        // We hit the timeout. We must cancel the underlying reader so it doesn't stay blocked.
        await reader.cancel();
        reader.releaseLock();
        
        // Re-establish the reader stream
        const decoder = new TextDecoderStream();
        portRef.readable.pipeTo(decoder.writable);
        reader = decoder.readable.getReader();
        
        throw new Error(`Timeout (${(timeoutMs / 1000).toFixed(0)}s)`);
      }
      throw e;
    }
  }
}

/**
 * Read until a newline (no timeout).
 * @returns {Promise<string>}
 */
export async function readLine() {
  // Just use a very long timeout (e.g. 1 hour) instead of a separate loop
  // to share logic and avoid dangling reads on manual disconnect.
  return readLineWithTimeout(3600000);
}

/**
 * Close the current port (release writer/reader and close port).
 * @param {SerialPort} port
 */
export async function close(port) {
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
  } finally {
    if (port) {
      await port.close().catch(() => {});
    }
    portRef = null;
  }
}
