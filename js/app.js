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
  close,
} from "./serial.js";

const DEVICE_ID_FOB = "UGUISU_01";
const DEVICE_ID_RX = "GUILLEMOT_01";
const RESET_COUNTER = "00000000";

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

function buildProvLine(deviceId) {
  if (!currentKey || currentKey.length !== 32) throw new Error("Invalid key");
  return `PROV:${deviceId}:${currentKey}:${RESET_COUNTER}`;
}

async function provisionDevice(deviceId, setStatus) {
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
    const line = buildProvLine(deviceId);
    await sendLine(line);
    const response = await readLine();
    if (response === "ACK:PROV_SUCCESS") {
      setStatus("Done.");
    } else if (response.startsWith("ERR:")) {
      setStatus("Device error: " + response, true);
    } else {
      setStatus("Unexpected response: " + response, true);
    }
  } catch (e) {
    setStatus(e.message || "Serial error", true);
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
  await provisionDevice(DEVICE_ID_FOB, setFobStatus);
});

el.btnFlashReceiver.addEventListener("click", async () => {
  setReceiverStatus("Select port…");
  await provisionDevice(DEVICE_ID_RX, setReceiverStatus);
});

// Optional: show Web Serial unsupported message on load
if (!isSupported()) {
  el.keyStatus.textContent =
    "Web Serial is not available in this browser. Use Chrome or Edge.";
  el.keyStatus.className = "status error";
}
