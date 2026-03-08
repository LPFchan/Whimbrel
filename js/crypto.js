/**
 * Whimbrel crypto: key generation and provisioning checksum.
 */

import { CONFIG } from "./config.js";

export function generateKey() {
  const bytes = new Uint8Array(CONFIG.KEY_LEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function crc16Key(keyHex) {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++)
    bytes[i] = parseInt(keyHex.slice(i * 2, i * 2 + 2), 16);
  let crc = 0xffff;
  for (let i = 0; i < 16; i++) {
    crc ^= bytes[i] << 8;
    for (let k = 0; k < 8; k++)
      crc = ((crc & 0x8000) ? (crc << 1) ^ 0x1021 : (crc << 1)) & 0xffff;
  }
  return (crc & 0xffff).toString(16).padStart(4, "0").toLowerCase();
}

export function buildProvLine(keyHex) {
  if (!keyHex || keyHex.length !== 32) throw new Error("Invalid key");
  const checksum = crc16Key(keyHex);
  return `PROV:${keyHex}:${CONFIG.RESET_COUNTER}:${checksum}`;
}
