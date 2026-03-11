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
        <div style="position: relative; min-height: 40px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;">
          <div class="nav-header" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); margin: 0;">
            <button id="btn-dashboard-close-1" class="btn-back" type="button" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              Close
            </button>
          </div>
          <h2 style="margin: 0; font-size: 1.75rem;">Manage Keys</h2>
        </div>
        
        <button id="btn-ble-connect" type="button" class="btn-huge" style="margin-top: 20px;">Connect</button>
        <button id="btn-no-fob" type="button" style="background:none; border:none; color:var(--muted); font-family:inherit; font-size:1rem; font-weight:500; cursor:pointer; text-decoration:underline; margin-top:16px;">I don't have a phone key</button>
        <div id="ble-status" class="status" aria-live="polite"></div>
      </section>

      <section id="dashboard-no-fob" class="step step-hidden">
        <div style="position: relative; min-height: 40px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;">
          <div class="nav-header" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); margin: 0;">
            <button id="btn-no-fob-back" class="btn-back" type="button" aria-label="Go back">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back
            </button>
          </div>
          <h2 style="margin: 0; font-size: 1.75rem;">No Phone Key</h2>
        </div>
        <p>You can manage device slots in the settings page of the app.</p>
      </section>

      <section id="dashboard-tutorial" class="step step-hidden">
        <div style="position: relative; min-height: 40px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;">
          <div class="nav-header" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); margin: 0;">
            <button id="btn-tutorial-back" class="btn-back" type="button" aria-label="Go back">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back
            </button>
          </div>
          <h2 style="margin: 0; font-size: 1.75rem;">Add a Phone Key</h2>
        </div>
        
        <div class="instructions-list" style="margin-top: 30px; margin-bottom: 30px;">
          <div class="instruction-item">
            <div class="instruction-number">1</div>
            <p>Get near your vehicle.</p>
          </div>
          <div class="instruction-item">
            <div class="instruction-number">2</div>
            <p>Press the button once on your Uguisu fob. This enables a 30-second window.</p>
          </div>
          <div class="instruction-item">
            <div class="instruction-number">3</div>
            <p>Click Connect below to provision your phone.</p>
          </div>
        </div>
        <button id="btn-tutorial-connect" type="button" class="btn-huge">Yes</button>
        <button id="btn-tutorial-skip" type="button" style="background:none; border:none; color:var(--muted); font-family:inherit; font-size:1rem; font-weight:500; cursor:pointer; text-decoration:underline; margin-top:16px;">Skip for now</button>
      </section>

      <section id="dashboard-main" class="step step-hidden">
        <div style="position: relative; min-height: 40px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;">
          <div class="nav-header" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); margin: 0;">
            <button id="btn-dashboard-back-from-main" class="btn-back" type="button" aria-label="Back">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back
            </button>
          </div>
          <h2 style="margin: 0; font-size: 1.75rem;">Device Slots</h2>
        </div>
        
        <div id="slots-container" style="display: flex; flex-direction: column; width: 100%; visibility: visible;">
          <!-- Slots will be populated here -->
        </div>
        <button id="btn-add-phone" type="button" class="btn-huge" style="margin-top: 20px;">Add Phone (Slot 1)</button>
      </section>

      <section id="dashboard-add-phone" class="step step-hidden">
        <div style="position: relative; min-height: 40px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;">
          <div class="nav-header" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); margin: 0;">
            <button id="btn-dashboard-back" class="btn-back" type="button" aria-label="Go back">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Back
            </button>
          </div>
          <h2 style="margin: 0; font-size: 1.75rem;">Create PIN</h2>
        </div>
        
        <p style="font-size: 0.9rem; color: #888;">Enter a 6-digit PIN. You will need to remember this PIN to manage other keys and access settings in the app.</p>
        
        <div class="pin-circles" id="dash-pin-circles" style="display: flex; gap: 10px; justify-content: center; margin: 25px 0;">
          <div class="pin-circle"></div><div class="pin-circle"></div><div class="pin-circle"></div>
          <div class="pin-circle"></div><div class="pin-circle"></div><div class="pin-circle"></div>
        </div>
        
        <div id="dash-pin-status" class="status" aria-live="polite"></div>
        
        <input type="tel" id="dash-hidden-pin-input" maxlength="6" style="position: absolute; opacity: 0; pointer-events: none;">
      </section>

      <section id="dashboard-show-qr" class="step step-hidden">
        <div style="position: relative; min-height: 40px; margin-bottom: 24px; display: flex; align-items: center; justify-content: center;">
          <div class="nav-header" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); margin: 0;">
            <button id="btn-dashboard-close-3" class="btn-back" type="button" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              Close
            </button>
          </div>
          <h2 style="margin: 0; font-size: 1.75rem;">Scan QR Code</h2>
        </div>
        
        <p>Scan this code with the Pipit app to add your phone key.</p>
        <div id="dash-qr-container" style="text-align: center; margin: 20px 0;">
          <canvas id="dash-qr-canvas"></canvas>
        </div>
        <button id="btn-dash-qr-done" type="button" class="btn-huge">Done</button>
      </section>
    `;

    const btnConnect = document.getElementById('btn-ble-connect');
    const btnNoFob = document.getElementById('btn-no-fob');
    const btnNoFobBack = document.getElementById('btn-no-fob-back');
    const btnTutorialBack = document.getElementById('btn-tutorial-back');
    const btnTutorialConnect = document.getElementById('btn-tutorial-connect');
    const btnTutorialSkip = document.getElementById('btn-tutorial-skip');
    const btnClose1 = document.getElementById('btn-dashboard-close-1');
    const btnBackFromMain = document.getElementById('btn-dashboard-back-from-main');
    const btnClose3 = document.getElementById('btn-dashboard-close-3');
    const status = document.getElementById('ble-status');
    const tutStatus = document.getElementById('tut-ble-status');
    const secNoFob = document.getElementById('dashboard-no-fob');
    const secConnect = document.getElementById('dashboard-connect');
    const secTutorial = document.getElementById('dashboard-tutorial');
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

    let modalHeightAnimTimeout = null;
    const modalEl = document.querySelector('.dashboard-modal');

    function animateModalHeightChange(callback) {
      if (!modalEl) {
        callback();
        return;
      }
      if (modalHeightAnimTimeout) {
        clearTimeout(modalHeightAnimTimeout);
        modalEl.style.transition = "none";
        modalEl.style.height = "auto";
      }

      const startHeight = modalEl.offsetHeight;
      modalEl.style.height = startHeight + "px";
      modalEl.style.overflow = "hidden";

      callback();

      modalEl.style.height = "auto";
      const targetHeight = modalEl.offsetHeight;

      if (startHeight === targetHeight) {
        modalEl.style.overflow = "visible";
        modalEl.style.height = "auto";
        return;
      }

      modalEl.style.height = startHeight + "px";
      modalEl.offsetHeight; // force reflow

      // Make sure we keep the scale transition from CSS
      modalEl.style.transitionProperty = "height, transform";
      modalEl.style.transitionDuration = "0.4s, 0.3s";
      modalEl.style.transitionTimingFunction = "ease, cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      modalEl.style.height = targetHeight + "px";

      modalHeightAnimTimeout = setTimeout(() => {
        modalEl.style.height = "auto";
        modalEl.style.overflow = "visible";
        modalEl.style.transitionProperty = "transform";
        modalHeightAnimTimeout = null;
      }, 400);
    }

    function setStatus(msg, error = false) {
      status.textContent = msg;
      status.className = "status " + (error ? "error" : "success");
    }

    function renderSlots() {
      animateModalHeightChange(() => {
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
          div.style.cursor = "pointer";
          div.style.transition = "background 0.2s";
          div.addEventListener('mouseenter', () => div.style.background = "#f0f0f0");
          div.addEventListener('mouseleave', () => div.style.background = "transparent");
          
          div.addEventListener('click', () => {
             // Logic to select slot, maybe trigger edit or something else
             console.log("Slot clicked:", slot.id);
          });
          
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
      });
    }
// removed because it was merged into the animateModalHeightChange wrapper block above

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

    btnNoFob.addEventListener('click', () => {
      secConnect.classList.add('step-fading-out');
      setTimeout(() => {
        animateModalHeightChange(() => {
          secConnect.classList.remove('step-visible', 'step-fading-out');
          secConnect.classList.add('step-hidden');
          secNoFob.classList.remove('step-hidden');
          secNoFob.classList.add('step-visible');
        });
      }, 200);
    });

    btnNoFobBack.addEventListener('click', () => {
      secNoFob.classList.add('step-fading-out');
      setTimeout(() => {
        animateModalHeightChange(() => {
          secNoFob.classList.remove('step-visible', 'step-fading-out');
          secNoFob.classList.add('step-hidden');
          secConnect.classList.remove('step-hidden');
          secConnect.classList.add('step-visible');
        });
      }, 200);
    });

    btnTutorialBack.addEventListener('click', () => {
      secTutorial.classList.add('step-fading-out');
      setTimeout(() => {
        animateModalHeightChange(() => {
          secTutorial.classList.remove('step-visible', 'step-fading-out');
          secTutorial.classList.add('step-hidden');
          secConnect.classList.remove('step-hidden');
          secConnect.classList.add('step-visible');
        });
      }, 200);
    });

    async function doConnect(statusEl) {
      function setLocalStatus(msg, error = false) {
        statusEl.textContent = msg;
        statusEl.className = "status " + (error ? "error" : "success");
      }

      try {
        setLocalStatus("Connecting to device...");
        
        if (window.Whimbrel.DEMO_MODE) {
          // If we are in the middle of a flow and requested a BLE connection in demo mode, just skip it.
          // This ensures that the demo doesn't force a real BLE request.
          console.log("Demo mode: skipping real BLE connection");
          setLocalStatus("Connected (Demo)!");
          
          slots = [
            {"id":0,"used":true,"counter":4821,"name":"Uguisu"},
            {"id":1,"used":false,"counter":0,"name":""},
            {"id":2,"used":false,"counter":0,"name":""},
            {"id":3,"used":false,"counter":0,"name":""}
          ];

          bleManager = {
            onResponse: null,
            connect: async () => {},
            disconnect: () => {},
            sendCommand: async (cmd) => {
              await new Promise(r => setTimeout(r, 100));
              if (cmd === "SLOTS?") {
                if (bleManager.onResponse) bleManager.onResponse(JSON.stringify({ status: "ok", slots: slots }));
              } else if (cmd.startsWith("RENAME:")) {
                const parts = cmd.split(":");
                const id = parseInt(parts[1], 10);
                const newName = parts[2];
                const slot = slots.find(s => s.id === id);
                if (slot) slot.name = newName;
                if (bleManager.onResponse) bleManager.onResponse(JSON.stringify({ status: "ok" }));
              } else if (cmd.startsWith("PROV:")) {
                const parts = cmd.split(":");
                const id = parseInt(parts[1], 10);
                const slot = slots.find(s => s.id === id);
                if (slot) {
                  slot.used = true;
                  slot.name = parts[4] || "iPhone";
                }
              } else if (cmd.startsWith("SETPIN:")) {
                // mock auth
              }
            }
          };

          const activeSec = secConnect.classList.contains('step-visible') ? secConnect : secTutorial;
          activeSec.classList.add('step-fading-out');
          
          setTimeout(async () => {
            animateModalHeightChange(() => {
              secConnect.classList.remove('step-visible', 'step-fading-out');
              secConnect.classList.add('step-hidden');
              secTutorial.classList.remove('step-visible', 'step-fading-out');
              secTutorial.classList.add('step-hidden');
              secMain.classList.remove('step-hidden');
              secMain.classList.add('step-visible');
            });
            await fetchSlots();
          }, 200);
          return;
        }

        bleManager = new window.Whimbrel.BLEManager();
        bleManager.onResponse = handleResponse;
        await bleManager.connect();
        setLocalStatus("Connected!");
        
        const activeSec = secConnect.classList.contains('step-visible') ? secConnect : secTutorial;
        activeSec.classList.add('step-fading-out');
        
        setTimeout(async () => {
          animateModalHeightChange(() => {
            secConnect.classList.remove('step-visible', 'step-fading-out');
            secConnect.classList.add('step-hidden');
            secTutorial.classList.remove('step-visible', 'step-fading-out');
            secTutorial.classList.add('step-hidden');
            secMain.classList.remove('step-hidden');
            secMain.classList.add('step-visible');
          });
          await fetchSlots();
        }, 200);
      } catch (e) {
        setLocalStatus("Connection failed: " + e.message, true);
      }
    }

    btnConnect.addEventListener('click', () => doConnect(status));
    btnTutorialConnect.addEventListener('click', () => doConnect(tutStatus));
    btnTutorialSkip.addEventListener('click', () => {
      // Logic for skipping: directly move to main dashboard view
      secTutorial.classList.add('step-fading-out');
      setTimeout(() => {
        animateModalHeightChange(() => {
          secTutorial.classList.remove('step-visible', 'step-fading-out');
          secTutorial.classList.add('step-hidden');
          secMain.classList.remove('step-hidden');
          secMain.classList.add('step-visible');
        });
        fetchSlots();
      }, 200);
    });

    btnAddPhone.addEventListener('click', () => {
      isAddingPhone = true;
      secMain.classList.add('step-fading-out');
      setTimeout(() => {
        animateModalHeightChange(() => {
          secMain.classList.remove('step-visible', 'step-fading-out');
          secMain.classList.add('step-hidden');
          secAddPhone.classList.remove('step-hidden');
          secAddPhone.classList.add('step-visible');
          hiddenPinInput.value = '';
          updatePinUI('');
        });
        hiddenPinInput.focus();
      }, 200);
    });

    btnBack.addEventListener('click', () => {
      isAddingPhone = false;
      secAddPhone.classList.add('step-fading-out');
      setTimeout(() => {
        animateModalHeightChange(() => {
          secAddPhone.classList.remove('step-visible', 'step-fading-out');
          secAddPhone.classList.add('step-hidden');
          secMain.classList.remove('step-hidden');
          secMain.classList.add('step-visible');
        });
      }, 200);
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
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(100);
        await bleManager.sendCommand(`PROV:1:${phoneKeyHex}:0:`);

        // Render QR
        QRCode.toCanvas(qrCanvas, qrUrl, { width: 300, margin: 2 }, function (error) {
          if (error) throw error;
          
          secAddPhone.classList.add('step-fading-out');
          setTimeout(() => {
            animateModalHeightChange(() => {
              secAddPhone.classList.remove('step-visible', 'step-fading-out');
              secAddPhone.classList.add('step-hidden');
              secShowQR.classList.remove('step-hidden');
              secShowQR.classList.add('step-visible');
            });
          }, 200);
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
      } else {
        return;
      }
      
      // Prevent multiple submissions if key is held down or input is processed twice
      if (input.value === val) return;
      
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
      secShowQR.classList.add('step-fading-out');
      setTimeout(() => {
        animateModalHeightChange(() => {
          secShowQR.classList.remove('step-visible', 'step-fading-out');
          secShowQR.classList.add('step-hidden');
          secMain.classList.remove('step-hidden');
          secMain.classList.add('step-visible');
        });
        fetchSlots(); // Refresh slots
        isAddingPhone = false;
      }, 200);
    });
    
    // Close overlay triggers
    const closeOverlay = () => {
      const overlay = document.getElementById("dashboard-overlay");
      if (overlay) overlay.classList.remove("visible");
      
      // Reset view to connect on close
      const secs = [secTutorial, secNoFob, secMain, secAddPhone, secShowQR];
      secs.forEach(s => {
        if(s) {
          s.classList.remove('step-visible');
          s.classList.add('step-hidden');
        }
      });
      secConnect.classList.remove('step-hidden');
      secConnect.classList.add('step-visible');
      if (bleManager) {
        bleManager.disconnect();
        bleManager = null;
      }
    };
    
    if (btnClose1) btnClose1.addEventListener('click', closeOverlay);
    if (btnBackFromMain) btnBackFromMain.addEventListener('click', () => {
        secMain.classList.add('step-fading-out');
        setTimeout(() => {
          animateModalHeightChange(() => {
            secMain.classList.remove('step-visible', 'step-fading-out');
            secMain.classList.add('step-hidden');
            secConnect.classList.remove('step-hidden');
            secConnect.classList.add('step-visible');
          });
        }, 200);
    });
    if (btnClose3) btnClose3.addEventListener('click', closeOverlay);
  };

  window.Whimbrel.initDashboard = initDashboard;
})();
