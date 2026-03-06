/**
 * Whimbrel app: UI state, key generation, and Flash Key Fob / Flash Receiver flows.
 */

import { generateKey } from "./crypto.js";
import {
  isSupported,
  requestPort,
  open,
  sendLine,
  readLine,
  readLineWithTimeout,
  close,
} from "./serial.js";

const DEVICE_ID_FOB = "UGUISU_01";
const DEVICE_ID_RX = "GUILLEMOT_01";
const BOOTED_FOB = "BOOTED:Uguisu";
const BOOTED_RX = "BOOTED:Guillemot";
const RESET_COUNTER = "00000000";
const TIMEOUT_PROV_MS = 12000;
const TIMEOUT_BOOT_MS = 10000;

/** @type {string | null} */
let currentKey = null;

const el = {
  btnGenerate: document.getElementById("btn-generate"),
  btnFlashFob: document.getElementById("btn-flash-fob"),
  btnFlashReceiver: document.getElementById("btn-flash-receiver"),
  keyStatus: document.getElementById("key-status"),
  keyPreview: document.getElementById("key-preview"),
  fobStatus: document.getElementById("fob-status"),
  receiverStatus: document.getElementById("receiver-status"),
};

function setKey(key) {
  currentKey = key;
  el.btnFlashFob.disabled = !key;
  el.btnFlashReceiver.disabled = !key;
  el.keyStatus.textContent = "Secret generated.";
  el.keyStatus.className = "status success";
  el.keyPreview.textContent = key
    ? "••••••••••••••••••••••••••••••" + key.slice(-4)
    : "";
}

function clearKeyStatus() {
  el.keyStatus.textContent = "";
  el.keyStatus.className = "status";
}

function setFobStatus(text, isError = false) {
  el.fobStatus.textContent = text;
  el.fobStatus.className = "status " + (isError ? "error" : "success");
}

function setReceiverStatus(text, isError = false) {
  el.receiverStatus.textContent = text;
  el.receiverStatus.className = "status " + (isError ? "error" : "success");
}

/** CRC-16-CCITT (poly 0x1021, init 0xFFFF) over the 16 key bytes. */
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

function buildProvLine(deviceId) {
  if (!currentKey || currentKey.length !== 32) throw new Error("Invalid key");
  const checksum = crc16Key(currentKey);
  return `PROV:${deviceId}:${currentKey}:${RESET_COUNTER}:${checksum}`;
}

/**
 * Read lines until we see expectedBooted or total timeout. Other lines (e.g. debug) are ignored.
 * @param {string} expectedBooted - e.g. "BOOTED:Uguisu"
 * @returns {Promise<void>}
 */
async function waitForBooted(expectedBooted) {
  const deadline = Date.now() + TIMEOUT_BOOT_MS;
  while (Date.now() < deadline) {
    const remaining = Math.max(1000, deadline - Date.now());
    const line = await readLineWithTimeout(remaining);
    if (line === expectedBooted) return;
    if (line.startsWith("ERR:"))
      throw new Error(`Step 2 (boot): ${line}`);
  }
  throw new Error(
    `Step 2 (boot): device did not confirm boot within ${TIMEOUT_BOOT_MS / 1000}s`
  );
}

async function provisionDevice(deviceId, setStatus, expectedBooted) {
  if (!currentKey) {
    setStatus("Generate a secret first.", true);
    return;
  }
  if (!isSupported()) {
    setStatus("Web Serial not supported. Use Chrome or Edge.", true);
    return;
  }
  let port = null;
  try {
    port = await requestPort();
    await open(port);

    // Step 1: Send PROV and verify device wrote and verified keys.
    setStatus("Writing key…");
    const line = buildProvLine(deviceId);
    await sendLine(line);
    const response = await readLineWithTimeout(TIMEOUT_PROV_MS);
    if (response !== "ACK:PROV_SUCCESS") {
      if (response.startsWith("ERR:")) {
        setStatus(`Step 1 (write & verify) failed: ${response}`, true);
      } else {
        setStatus(`Step 1 (write & verify) failed: unexpected response: ${response}`, true);
      }
      return;
    }

    // Step 2: Device proceeds to normal boot; wait for BOOTED confirmation.
    setStatus("Waiting for device to boot…");
    await waitForBooted(expectedBooted);

    setStatus("Done. Device provisioned and running.");
  } catch (e) {
    const msg = e.message || "Serial error";
    if (msg.includes("Timeout"))
      setStatus(`Step failed (timeout): ${msg}`, true);
    else
      setStatus(msg, true);
  } finally {
    if (port) await close(port);
  }
}

el.btnGenerate.addEventListener("click", () => {
  clearKeyStatus();
  const key = generateKey();
  setKey(key);
});

el.btnFlashFob.addEventListener("click", async () => {
  setFobStatus("Select port…");
  await provisionDevice(DEVICE_ID_FOB, setFobStatus, BOOTED_FOB);
});

el.btnFlashReceiver.addEventListener("click", async () => {
  setReceiverStatus("Select port…");
  await provisionDevice(DEVICE_ID_RX, setReceiverStatus, BOOTED_RX);
});

// Optional: show Web Serial unsupported message on load
if (!isSupported()) {
  el.keyStatus.textContent =
    "Web Serial is not available in this browser. Use Chrome or Edge.";
  el.keyStatus.className = "status error";
}
