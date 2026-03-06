/**
 * Whimbrel provisioning: constants and helpers for key provisioning flow.
 * Loaded after crypto.js and serial.js.
 */

const DEVICE_ID_FOB = "UGUISU_01";
const DEVICE_ID_RX = "GUILLEMOT_01";
const BOOTED_FOB = "BOOTED:Uguisu";
const BOOTED_RX = "BOOTED:Guillemot";
const TIMEOUT_PROV_MS = 12000;
const TIMEOUT_BOOT_MS = 10000;

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
