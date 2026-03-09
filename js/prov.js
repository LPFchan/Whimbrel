/**
 * Whimbrel provisioning: helpers for key provisioning flow.
 */

(function() {
  const { CONFIG } = window.Whimbrel;

  window.Whimbrel.waitForBooted = async function(serialConnection, expectedBooted) {
    const deadline = Date.now() + CONFIG.TIMEOUT_BOOT_MS;
    while (Date.now() < deadline) {
      const remaining = Math.max(1000, deadline - Date.now());
      const line = await serialConnection.readLineWithTimeout(remaining);
      if (line === expectedBooted) return;
      if (line.startsWith("ERR:"))
        throw new Error(`Step 2 (boot): ${line}`);
    }
    throw new Error(
      `Step 2 (boot): device did not confirm boot within ${CONFIG.TIMEOUT_BOOT_MS / 1000}s`
    );
  };
})();
