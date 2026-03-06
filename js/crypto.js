/**
 * Whimbrel crypto: key generation and provisioning checksum.
 * Loaded before serial.js and app.
 */

const KEY_LEN_BYTES = 16;
const RESET_COUNTER = "00000000";

function generateKey() {
  const bytes = new Uint8Array(KEY_LEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function crc16Key(keyHex) {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++)
    bytes[i] = parseInt(keyHex.slice(i * 2, i * 2 + 2), 16);
  let crc = 0xffff;
  for (let i = 0; i < 16; i++) {
    crc ^= bytes[i] << 8;
    for (let k = 0; k < 8; k++)
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : (crc << 1);
  }
  return (crc & 0xffff).toString(16).padStart(4, "0").toLowerCase();
}

function buildProvLine(deviceId, keyHex) {
  if (!keyHex || keyHex.length !== 32) throw new Error("Invalid key");
  const checksum = crc16Key(keyHex);
  return `PROV:${deviceId}:${keyHex}:${RESET_COUNTER}:${checksum}`;
}
