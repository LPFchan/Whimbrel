/**
 * Whimbrel provisioning: helpers for key provisioning flow.
 */

(function() {
  const { CONFIG } = window.Whimbrel;

  // ── Shared: crypto + BLE provisioning for a phone slot ────────────
  // Params:
  //   pin        — 6-digit string
  //   slotId     — target slot index
  //   doSetPin   — true on first-time setup (no-fob flow); false when re-provisioning
  //   bleManager — an already-connected BLE manager; if null/undefined a new one
  //                is created (and disconnected) automatically
  //   keyHex     — optional pre-generated 32-char hex key (supply when the caller
  //                already ran the "Generate" animation and wants to provision that
  //                exact key; omit to generate a fresh one here)
  //
  // Returns { qrUrl, phoneKeyHex } on success; throws on error.
  window.Whimbrel.provisionPhone = async function({ pin, slotId, doSetPin, bleManager: bleMgr, keyHex }) {
    const ownBle = !bleMgr;
    if (ownBle) {
      if (window.Whimbrel.DEMO_MODE) {
        bleMgr = {
          sendCommand: async () => { await new Promise(r => setTimeout(r, 100)); },
          disconnect: () => {}
        };
      } else {
        bleMgr = new window.Whimbrel.BLEManager();
        await bleMgr.connect();
      }
    }

    try {
      const phoneKeyHex = keyHex || window.Whimbrel.generateKey();
      const salt = new Uint8Array(16);
      crypto.getRandomValues(salt);
      const saltHex = window.Whimbrel.bufToHex(salt);

      const hash = await argon2.hash({
        pass: pin, salt, time: 3, mem: 262144,
        hashLen: 16, parallelism: 1, type: argon2.ArgonType.Argon2id
      });

      const phoneKeyBuf = window.Whimbrel.hexToBuf(phoneKeyHex);
      const nonce = salt.slice(0, 13);
      const encrypted = window.Whimbrel.encryptAESCCM(hash.hash, nonce, phoneKeyBuf);
      const ekeyHex = window.Whimbrel.bufToHex(encrypted);
      const qrUrl = `immogen://prov?slot=${slotId}&salt=${saltHex}&ekey=${ekeyHex}&ctr=0&name=`;

      if (doSetPin) {
        await bleMgr.sendCommand(`SETPIN:${pin}`);
        await new Promise(r => setTimeout(r, 100));
      }
      await bleMgr.sendCommand(`PROV:${slotId}:${phoneKeyHex}:0:`);

      if (ownBle) {
        await new Promise(r => setTimeout(r, 500));
        bleMgr.disconnect();
      }

      return { qrUrl, phoneKeyHex };
    } catch(e) {
      if (ownBle && bleMgr && bleMgr.disconnect) bleMgr.disconnect();
      throw e;
    }
  };

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
