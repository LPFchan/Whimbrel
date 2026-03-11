/**
 * Whimbrel Dashboard (BLE) logic
 */

(function() {
  const initDashboard = () => {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    // Build the UI dynamically
    container.innerHTML = `
      <section id="dashboard-connect" class="step step-visible">
        <h2>Manage Keys</h2>
        <p>Before connecting, press the button on your <strong>Uguisu fob</strong> to unlock the vehicle. This enables a 30-second provisioning window.</p>
        <button id="btn-ble-connect" type="button" class="btn-huge">Connect via BLE</button>
        <div id="ble-status" class="status" aria-live="polite"></div>
      </section>

      <section id="dashboard-main" class="step step-hidden">
        <h2>Device Slots</h2>
        <div id="slots-container">
          <!-- Slots will be populated here -->
        </div>
        <button id="btn-add-phone" type="button" class="btn-huge" style="margin-top: 20px;">Add Phone (Slot 1)</button>
      </section>

      <section id="dashboard-add-phone" class="step step-hidden">
        <div class="nav-header">
          <button id="btn-dashboard-back" class="btn-back" type="button" aria-label="Go back">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
        </div>
        <h2>Create PIN</h2>
        <p>Press the button on your Uguisu fob to authorize setup.</p>
        <p style="font-size: 0.9rem; color: #888;">Then, enter a 6-digit PIN below.</p>
        
        <div class="pin-circles" id="dash-pin-circles" style="display: flex; gap: 10px; justify-content: center; margin: 25px 0;">
          <div class="pin-circle"></div><div class="pin-circle"></div><div class="pin-circle"></div>
          <div class="pin-circle"></div><div class="pin-circle"></div><div class="pin-circle"></div>
        </div>
        
        <div id="dash-pin-status" class="status" aria-live="polite"></div>
        
        <input type="tel" id="dash-hidden-pin-input" maxlength="6" style="position: absolute; opacity: 0; pointer-events: none;">
      </section>

      <section id="dashboard-show-qr" class="step step-hidden">
        <h2>Scan QR Code</h2>
        <p>Scan this code with the Pipit app to add your phone key.</p>
        <div id="dash-qr-container" style="text-align: center; margin: 20px 0;">
          <canvas id="dash-qr-canvas"></canvas>
        </div>
        <button id="btn-dash-qr-done" type="button" class="btn-huge">Done</button>
      </section>
    `;

    const btnConnect = document.getElementById('btn-ble-connect');
    const status = document.getElementById('ble-status');
    const secConnect = document.getElementById('dashboard-connect');
    const secMain = document.getElementById('dashboard-main');
    const secAddPhone = document.getElementById('dashboard-add-phone');
    const secShowQR = document.getElementById('dashboard-show-qr');
    const slotsContainer = document.getElementById('slots-container');
    const btnAddPhone = document.getElementById('btn-add-phone');
    const btnBack = document.getElementById('btn-dashboard-back');
    const qrCanvas = document.getElementById('dash-qr-canvas');
    const btnQrDone = document.getElementById('btn-dash-qr-done');
    const pinCircles = document.querySelectorAll("#dash-pin-circles .pin-circle");
    const hiddenPinInput = document.getElementById("dash-hidden-pin-input");
    const pinStatus = document.getElementById("dash-pin-status");

    let bleManager = null;
    let slots = [];
    let isAddingPhone = false;

    function setStatus(msg, error = false) {
      status.textContent = msg;
      status.className = "status " + (error ? "error" : "success");
    }

    function renderSlots() {
      slotsContainer.innerHTML = '';
      slots.forEach(slot => {
        const div = document.createElement('div');
        div.style.border = "1px solid #333";
        div.style.padding = "10px";
        div.style.marginBottom = "10px";
        div.style.borderRadius = "8px";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        
        const info = document.createElement('div');
        info.innerHTML = `<strong>Slot ${slot.id}:</strong> ${slot.used ? (slot.name || 'Unnamed') : 'Empty'}<br>` +
                         `<small style="color:#888;">${slot.used ? 'Counter: ' + slot.counter : ''}</small>`;
        
        div.appendChild(info);
        
        if (slot.used) {
          const btnEdit = document.createElement('button');
          btnEdit.textContent = "Edit Name";
          btnEdit.style.padding = "5px 10px";
          btnEdit.style.fontSize = "0.9rem";
          btnEdit.addEventListener('click', async () => {
            const newName = prompt("Enter new name for Slot " + slot.id, slot.name);
            if (newName !== null && newName.trim() !== "") {
              try {
                await bleManager.sendCommand(`RENAME:${slot.id}:${newName.trim()}`);
                setTimeout(() => fetchSlots(), 500); // refresh
              } catch (e) {
                alert("Failed to rename: " + e.message);
              }
            }
          });
          div.appendChild(btnEdit);
        }
        
        slotsContainer.appendChild(div);
      });
    }

    function handleResponse(res) {
      console.log("BLE Response:", res);
      try {
        const data = JSON.parse(res);
        if (data.status === 'ok' && Array.isArray(data.slots)) {
          slots = data.slots;
          renderSlots();
        }
      } catch(e) {
        if (res.startsWith("ACK:") || res.startsWith("ERR:")) {
          console.log("Command result:", res);
        } else {
          console.error("Failed to parse JSON:", res);
        }
      }
    }

    async function fetchSlots() {
      if (!bleManager) return;
      await bleManager.sendCommand("SLOTS?");
    }

    btnConnect.addEventListener('click', async () => {
      try {
        setStatus("Connecting to device...");
        bleManager = new window.Whimbrel.BLEManager();
        bleManager.onResponse = handleResponse;
        await bleManager.connect();
        setStatus("Connected!");
        
        secConnect.classList.remove('step-visible');
        secConnect.classList.add('step-hidden');
        secMain.classList.remove('step-hidden');
        secMain.classList.add('step-visible');
        
        await fetchSlots();
      } catch (e) {
        setStatus("Connection failed: " + e.message, true);
      }
    });

    btnAddPhone.addEventListener('click', () => {
      isAddingPhone = true;
      secMain.classList.remove('step-visible');
      secMain.classList.add('step-hidden');
      secAddPhone.classList.remove('step-hidden');
      secAddPhone.classList.add('step-visible');
      hiddenPinInput.value = '';
      updatePinUI('');
      hiddenPinInput.focus();
    });

    btnBack.addEventListener('click', () => {
      isAddingPhone = false;
      secAddPhone.classList.remove('step-visible');
      secAddPhone.classList.add('step-hidden');
      secMain.classList.remove('step-hidden');
      secMain.classList.add('step-visible');
    });

    function updatePinUI(val) {
      for (let i = 0; i < 6; i++) {
        if (i < val.length) {
          pinCircles[i].classList.add("filled");
        } else {
          pinCircles[i].classList.remove("filled");
        }
      }
    }

    async function processPinAndProvision(pin) {
      if (pinStatus) {
        pinStatus.textContent = "Generating secure keys...";
        pinStatus.className = "status";
      }

      try {
        const phoneKeyHex = window.Whimbrel.generateKey();
        const salt = new Uint8Array(16);
        crypto.getRandomValues(salt);
        const saltHex = window.Whimbrel.bufToHex(salt);
        
        const hash = await argon2.hash({
          pass: pin,
          salt: salt,
          time: 3,
          mem: 262144, // 256MB
          hashLen: 16,
          parallelism: 1,
          type: argon2.ArgonType.Argon2id
        });
        
        const derivedKey = hash.hash;
        const phoneKeyBuf = window.Whimbrel.hexToBuf(phoneKeyHex);
        
        const nonce = salt.slice(0, 13);
        const encrypted = window.Whimbrel.encryptAESCCM(derivedKey, nonce, phoneKeyBuf);
        const ekeyHex = window.Whimbrel.bufToHex(encrypted);
        
        const qrUrl = `immogen://prov?slot=1&salt=${saltHex}&ekey=${ekeyHex}&ctr=0&name=`;

        if (pinStatus) pinStatus.textContent = "Provisioning to Guillemot...";

        await bleManager.sendCommand(`SETPIN:${pin}`);
        await window.Whimbrel.abortableDelay(100);
        await bleManager.sendCommand(`PROV:1:${phoneKeyHex}:0:`);

        // Render QR
        QRCode.toCanvas(qrCanvas, qrUrl, { width: 300, margin: 2 }, function (error) {
          if (error) throw error;
          
          secAddPhone.classList.remove('step-visible');
          secAddPhone.classList.add('step-hidden');
          secShowQR.classList.remove('step-hidden');
          secShowQR.classList.add('step-visible');
        });

      } catch (e) {
        console.error(e);
        if (pinStatus) {
          pinStatus.textContent = "Error: " + e.message;
          pinStatus.className = "status error";
        }
      }
    }

    document.addEventListener("keydown", (e) => {
      if (!isAddingPhone) return;
      if (!secAddPhone || !secAddPhone.classList.contains("step-visible")) return;

      const input = hiddenPinInput;
      let val = input.value;

      if (e.key === "Backspace") {
        val = val.slice(0, -1);
      } else if (/^[0-9]$/.test(e.key) && val.length < 6) {
        val += e.key;
      }
      
      input.value = val;
      updatePinUI(val);

      if (val.length === 6) {
        input.blur();
        processPinAndProvision(val);
      }
    });

    secAddPhone.addEventListener("click", () => {
      hiddenPinInput.focus();
    });

    btnQrDone.addEventListener('click', () => {
      secShowQR.classList.remove('step-visible');
      secShowQR.classList.add('step-hidden');
      secMain.classList.remove('step-hidden');
      secMain.classList.add('step-visible');
      fetchSlots(); // Refresh slots
      isAddingPhone = false;
    });
  };

  window.Whimbrel.initDashboard = initDashboard;
})();
