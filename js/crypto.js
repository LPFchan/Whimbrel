/**
 * Key generation using Web Crypto API. 16 bytes (128-bit) for AES-128.
 * Key exists only in memory; never persisted.
 */

const KEY_LEN_BYTES = 16;

/**
 * Generate a cryptographically random 128-bit key and return it as a 32-character hex string.
 * @returns {string} 32-char lowercase hex
 */
export function generateKey() {
  const bytes = new Uint8Array(KEY_LEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
