/**
 * Whimbrel app: main UI orchestration, key generation, and provisioning flows.
 */

(function() {
  const {
    CONFIG,
    DEMO_MODE,
    generateKey,
    buildProvLine,
    isSupported,
    requestPort,
    SerialConnection,
    waitForBooted,
    initFirmwareTab
  } = window.Whimbrel;

  let currentKeys = null; // { fobKey, phoneKey, pin, qrUrl }
  let fobFlashed = false;
  let receiverFlashed = false;

  const init = () => {
    const el = {
      mainPanel: document.getElementById("main-panel"),
      unsupportedMsg: document.getElementById("unsupported-msg"),
      navHeader: document.getElementById("nav-header"),
      btnBack: document.getElementById("btn-back"),
      homeLink: document.getElementById("home-link"),
      btnGenerate: document.getElementById("btn-generate"),
      btnFlashFob: document.getElementById("btn-flash-fob"),
      btnFlashReceiver: document.getElementById("btn-flash-receiver"),
      keyStatus: document.getElementById("key-status"),
      keyPreviewContainer: document.getElementById("key-preview-container"),
      keyPreview: document.getElementById("key-preview"),
      keyPreviewDots: document.getElementById("key-preview-dots"),
      fobStatus: document.getElementById("fob-status"),
      receiverStatus: document.getElementById("receiver-status"),
      notes: document.getElementById("notes"),
      
      // Steps
      secGen: document.getElementById("generate"),
      secRx: document.getElementById("flash-receiver"),
      secFob: document.getElementById("flash-fob"),
      secAddPhonePrompt: document.getElementById("add-phone-prompt"),
      secAddPhonePin: document.getElementById("add-phone-pin"),
      secShowQR: document.getElementById("show-qr"),
      
      timeoutIndicator: document.getElementById("timeout-indicator"),
      progressCircle: document.querySelector("#timeout-indicator .progress-ring-circle"),
      stepper: document.getElementById("stepper"),
      step1Title: document.getElementById("step-1-title"),
      stepCircles: [
        document.getElementById("step-circle-1"),
        document.getElementById("step-circle-2"),
        document.getElementById("step-circle-3"),
        document.getElementById("step-circle-4")
      ],
      
      // New flow elements
      btnAddPhoneYes: document.getElementById("btn-add-phone-yes"),
      btnAddPhoneNo: document.getElementById("btn-add-phone-no"),
      pinCircles: document.querySelectorAll(".pin-circle"),
      hiddenPinInput: document.getElementById("hidden-pin-input"),
      pinStatus: document.getElementById("pin-status"),
      btnQrDone: document.getElementById("btn-qr-done")
    };

    if (!el.mainPanel) return;

    let currentStepIdx = 0;
    let keysProvisioningInProgress = false;
    let keysProvisionAborted = false;
    let keysProvisioningInPostCircle = false;
    let keysGenerationInProgress = false;
    let keysGenerationAborted = false;
    let heightAnimTimeout = null;
    let appPinValue = '';

    function animateHeightChange(callback) {
      if (heightAnimTimeout) {
        clearTimeout(heightAnimTimeout);
        el.mainPanel.style.transition = "none";
        el.mainPanel.style.height = "auto";
      }

      const startHeight = el.mainPanel.offsetHeight;
      el.mainPanel.style.height = startHeight + "px";
      el.mainPanel.style.overflow = "hidden";

      callback();

      // Force layout calculation
      el.mainPanel.style.height = "auto";
      const targetHeight = el.mainPanel.offsetHeight;

      if (startHeight === targetHeight) {
        el.mainPanel.style.overflow = "visible";
        el.mainPanel.style.height = "auto";
        return;
      }

      el.mainPanel.style.height = startHeight + "px";
      el.mainPanel.offsetHeight; // force reflow

      el.mainPanel.style.transitionProperty = "height, background-color, border-color, box-shadow";
      el.mainPanel.style.transitionDuration = "0.4s, 0.3s, 0.3s, 0.3s";
      el.mainPanel.style.transitionTimingFunction = "ease";
      el.mainPanel.style.height = targetHeight + "px";

      heightAnimTimeout = setTimeout(() => {
        el.mainPanel.style.height = "auto";
        el.mainPanel.style.overflow = "visible";
        el.mainPanel.style.transitionProperty = "background-color, border-color, box-shadow";
        heightAnimTimeout = null;
      }, 400);
    }

    function abortableDelay(ms, shouldAbort) {
      if (typeof shouldAbort !== "function") {
        return new Promise((r) => setTimeout(r, ms));
      }
      return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
          if (shouldAbort() || Date.now() - start >= ms) {
            resolve();
            return;
          }
          setTimeout(check, 50);
        };
        setTimeout(check, 50);
      });
    }

    function triggerConfetti() {
      if (typeof window.confetti === "function") {
        const duration = 3000;
        const end = Date.now() + duration;
        (function frame() {
          window.confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#3b82f6", "#10b981", "#ffffff"]
          });
          window.confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#3b82f6", "#10b981", "#ffffff"]
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      }
    }

    const fwTab = initFirmwareTab({ abortableDelay, animateHeightChange, triggerConfetti });
    const showFwStep = fwTab.showFwStep;
    const resetFwFlashUI = fwTab.resetFwFlashUI;
    const handleFirmwarePopState = fwTab.handleFirmwarePopState;
    const abortFwFlash = fwTab.abortFwFlash;
    const isFwFlashing = fwTab.isFwFlashing;
    const getFwStepIdx = fwTab.getFwStepIdx;

    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    try {
      history.replaceState({ tab: "firmware", fwStep: 0 }, "", "#firmware-step1");
    } catch (e) {}

    // Maps step index to the UI sections to show
    // 0: Generate
    // 1: Flash Receiver
    // 2: Flash Fob
    // 3: Add Phone Prompt
    // 4: Add Phone PIN
    // 5: Show QR
    // 6: Notes (All done)
    async function showStep(stepIndex, pushStateFlag = true) {
      if (currentStepIdx === stepIndex) return;

      if (pushStateFlag && stepIndex > currentStepIdx) {
        try {
          history.pushState({ tab: "keys", step: stepIndex }, "", `#step${stepIndex + 1}`);
        } catch (e) {}
      }

      const allSecs = [
        el.secGen, el.secRx, el.secFob, el.secAddPhonePrompt,
        el.secAddPhonePin, el.secShowQR, el.notes, el.navHeader
      ];

      const visibleEls = allSecs.filter((e) => e && e.classList.contains("step-visible"));
      visibleEls.forEach((e) => e.classList.add("step-fading-out"));
      await abortableDelay(200);

      animateHeightChange(() => {
        currentStepIdx = stepIndex;
        
        // Map stepIndex to circle indices (0 to 3)
        // 0 -> circle 0
        // 1 -> circle 1
        // 2 -> circle 2
        // 3, 4, 5 -> circle 3
        // 6 -> circles hidden
        let circleIdx = stepIndex;
        if (stepIndex >= 3 && stepIndex <= 5) circleIdx = 3;
        if (stepIndex === 6) circleIdx = -1; // Done

        el.stepCircles.forEach((c, idx) => {
          if (c) {
            if (idx <= circleIdx) c.classList.add("active");
            else c.classList.remove("active");
          }
        });

        allSecs.forEach((e) => {
          if (e) {
            e.classList.remove("step-visible", "step-fading-out");
            e.classList.add("step-hidden");
          }
        });

        if (stepIndex === 0) {
          if (el.stepper) el.stepper.classList.remove("step-fading-out", "step-hidden");
          if (el.stepper) el.stepper.classList.add("step-visible");
          if (el.secGen) {
            el.secGen.classList.remove("step-hidden");
            el.secGen.classList.add("step-visible");
          }
          if (el.btnGenerate) el.btnGenerate.style.display = "block";
          if (el.step1Title) el.step1Title.textContent = "Generate New Key";
          if (el.keyPreviewContainer) el.keyPreviewContainer.style.display = "none";
          if (el.keyPreviewDots) {
            el.keyPreviewDots.style.opacity = "0";
            el.keyPreviewDots.style.filter = "blur(4px)";
          }
        } else if (stepIndex === 1) {
          if (el.stepper) el.stepper.classList.add("step-visible");
          if (el.navHeader) {
            el.navHeader.classList.remove("step-hidden");
            el.navHeader.classList.add("step-visible");
          }
          if (el.secRx) {
            el.secRx.classList.remove("step-hidden");
            el.secRx.classList.add("step-visible");
          }
        } else if (stepIndex === 2) {
          if (el.stepper) el.stepper.classList.add("step-visible");
          if (el.navHeader) {
            el.navHeader.classList.remove("step-hidden");
            el.navHeader.classList.add("step-visible");
          }
          if (el.secFob) {
            el.secFob.classList.remove("step-hidden");
            el.secFob.classList.add("step-visible");
          }
        } else if (stepIndex === 3) {
          if (el.stepper) el.stepper.classList.add("step-visible");
          if (el.navHeader) {
            el.navHeader.classList.remove("step-hidden");
            el.navHeader.classList.add("step-visible");
          }
          if (el.secAddPhonePrompt) {
            el.secAddPhonePrompt.classList.remove("step-hidden");
            el.secAddPhonePrompt.classList.add("step-visible");
          }
        } else if (stepIndex === 4) {
          if (el.stepper) el.stepper.classList.add("step-visible");
          if (el.navHeader) {
            el.navHeader.classList.remove("step-hidden");
            el.navHeader.classList.add("step-visible");
          }
          if (el.secAddPhonePin) {
            el.secAddPhonePin.classList.remove("step-hidden");
            el.secAddPhonePin.classList.add("step-visible");
            appPinValue = '';
            el.hiddenPinInput.value = '';
            updatePinUI('');
            el.hiddenPinInput.focus();
          }
        } else if (stepIndex === 5) {
          if (el.stepper) el.stepper.classList.add("step-visible");
          if (el.navHeader) {
            el.navHeader.classList.remove("step-hidden");
            el.navHeader.classList.add("step-visible");
          }
          if (el.secShowQR) {
            el.secShowQR.classList.remove("step-hidden");
            el.secShowQR.classList.add("step-visible");
          }
        } else if (stepIndex === 6) {
          if (el.stepper) el.stepper.classList.remove("step-visible", "step-fading-out");
          if (el.stepper) el.stepper.classList.add("step-hidden");
          if (el.notes) {
            el.notes.classList.remove("step-hidden");
            el.notes.classList.add("step-visible");
          }
        }
      });
    }

    function pushHistory(stepIndex) {
      try {
        history.pushState({ tab: "keys", step: stepIndex }, "", `#step${stepIndex + 1}`);
      } catch (e) {}
    }

    function replaceHistory(stepIndex) {
      try {
        history.replaceState({ tab: "keys", step: stepIndex }, "", `#step${stepIndex + 1}`);
      } catch (e) {}
    }

    function switchTabUI(tabId) {
      tabBtns.forEach((b) => {
        b.classList.remove("active");
        if (b.dataset.tab === tabId) b.classList.add("active");
      });
      tabContents.forEach((c) => {
        c.style.display = "none";
        c.classList.remove("active");
        if (c.id === tabId) {
          c.style.display = "block";
          c.classList.add("active");
        }
      });
    }

    window.addEventListener("popstate", (e) => {
      if (e.state !== null) {
        if (e.state.tab === "firmware" && handleFirmwarePopState(e)) return;
        if (e.state.tab === "keys") {
          switchTabUI("tab-keys");
          if (typeof e.state.step === "number") showStep(e.state.step, false);
        } else if (e.state.tab === "firmware") {
          switchTabUI("tab-firmware");
          if (typeof e.state.fwStep === "number") showFwStep(e.state.fwStep, false);
        }
      }
    });

    async function runTimeout(containerEl, circleEl, ms, shouldAbort) {
      if (!containerEl || !circleEl) return;
      containerEl.classList.add("visible");
      circleEl.style.transition = "none";
      circleEl.style.strokeDashoffset = "50.26";
      circleEl.getBoundingClientRect();
      circleEl.style.transition = `stroke-dashoffset ${ms}ms linear`;
      circleEl.style.strokeDashoffset = "0";
      if (typeof shouldAbort === "function") {
        const start = Date.now();
        while (Date.now() - start < ms) {
          await abortableDelay(50, shouldAbort);
          if (shouldAbort()) {
            containerEl.classList.remove("visible");
            return;
          }
        }
      } else {
        await abortableDelay(ms);
      }
      containerEl.classList.remove("visible");
      await abortableDelay(300);
    }

    if (!isSupported()) {
      el.mainPanel.style.display = "none";
      const mainTabs = document.getElementById("main-tabs");
      if (mainTabs) mainTabs.style.display = "none";
      if (el.unsupportedMsg) el.unsupportedMsg.style.display = "block";
      return;
    }

    function setKeys(keysObj) {
      currentKeys = keysObj;
      if (el.btnFlashFob) el.btnFlashFob.disabled = !keysObj;
      if (el.btnFlashReceiver) el.btnFlashReceiver.disabled = !keysObj;
    }

    if (el.btnBack) {
      el.btnBack.addEventListener("click", () => {
        if (currentStepIdx > 0) history.back();
      });
    }

    if (el.homeLink) {
      el.homeLink.addEventListener("click", () => {
        if (currentStepIdx > 0) {
          pushHistory(0);
          showStep(0);
        }
      });
    }

    function setFobStatus(text, isError = false) {
      if (!el.fobStatus) return;
      animateHeightChange(() => {
        el.fobStatus.textContent = text;
        el.fobStatus.className = "status " + (isError ? "error" : "success");
        const fobDesc = document.getElementById("fob-desc");
        if (text === "") {
          if (fobDesc) fobDesc.style.display = "block";
          el.fobStatus.style.display = "none";
        } else {
          if (fobDesc) fobDesc.style.display = "none";
          el.fobStatus.style.display = "block";
        }
      });
    }

    function setReceiverStatus(text, isError = false) {
      if (!el.receiverStatus) return;
      animateHeightChange(() => {
        el.receiverStatus.textContent = text;
        el.receiverStatus.className = "status " + (isError ? "error" : "success");
        const rxDesc = document.getElementById("receiver-desc");
        if (text === "") {
          if (rxDesc) rxDesc.style.display = "block";
          el.receiverStatus.style.display = "none";
        } else {
          if (rxDesc) rxDesc.style.display = "none";
          el.receiverStatus.style.display = "block";
        }
      });
    }

    async function provisionDevice(deviceId, setStatus, expectedBooted) {
      if (!currentKeys) {
        setStatus("Generate a secret first.", true);
        return;
      }
      if (!isSupported()) {
        setStatus("Web Serial not supported.", true);
        return;
      }
      keysProvisioningInProgress = true;
      keysProvisionAborted = false;
      if (DEMO_MODE) {
        try {
          setStatus("Writing key…");
          await abortableDelay(600, () => keysProvisionAborted);
          if (keysProvisionAborted) { setStatus(""); return; }
          setStatus("Waiting for device to boot…");
          await abortableDelay(900, () => keysProvisionAborted);
          if (keysProvisionAborted) { setStatus(""); return; }
          setStatus("Done. Device provisioned and running.");
          if (deviceId === CONFIG.DEVICE_ID_RX) {
            receiverFlashed = true;
            keysProvisioningInPostCircle = true;
            await runTimeout(el.timeoutIndicator, el.progressCircle, 1500, () => keysProvisionAborted);
            keysProvisioningInPostCircle = false;
            if (!keysProvisionAborted) showStep(2);
          }
          if (deviceId === CONFIG.DEVICE_ID_FOB) {
            fobFlashed = true;
            keysProvisioningInPostCircle = true;
            await runTimeout(el.timeoutIndicator, el.progressCircle, 1500, () => keysProvisionAborted);
            keysProvisioningInPostCircle = false;
            if (!keysProvisionAborted) showStep(3); // Go to Add Phone Prompt
          }
        } catch (e) {
          if (!keysProvisionAborted) setStatus(e.message || "Demo error", true);
        } finally {
          keysProvisioningInProgress = false;
        }
        return;
      }
      
      let serialConn = null;
      try {
        const port = await requestPort();
        if (keysProvisionAborted) return;
        
        serialConn = new SerialConnection();
        await serialConn.open(port);

        setStatus("Writing key…");
        
        const line = buildProvLine(0, currentKeys.fobKey, CONFIG.RESET_COUNTER, deviceId === CONFIG.DEVICE_ID_FOB ? "Uguisu" : "Owner");
        await serialConn.sendLine(line);
        const response = await serialConn.readLineWithTimeout(CONFIG.TIMEOUT_PROV_MS);

        if (keysProvisionAborted) {
          setStatus("");
          return;
        }
        if (response !== "ACK:PROV_SUCCESS") {
          if (response.startsWith("ERR:")) {
            setStatus(`Step failed: ${response}`, true);
          } else {
            setStatus(`Step failed: unexpected response: ${response}`, true);
          }
          return;
        }

        setStatus("Waiting for device to boot…");
        await waitForBooted(serialConn, expectedBooted);
        if (keysProvisionAborted) {
          setStatus("");
          return;
        }

        setStatus("Done. Device provisioned and running.");
        
        if (deviceId === CONFIG.DEVICE_ID_RX) {
          receiverFlashed = true;
          keysProvisioningInPostCircle = true;
          await runTimeout(el.timeoutIndicator, el.progressCircle, 1500, () => keysProvisionAborted);
          keysProvisioningInPostCircle = false;
          if (!keysProvisionAborted) showStep(2); // next is fob
        }
        
        if (deviceId === CONFIG.DEVICE_ID_FOB) {
          fobFlashed = true;
          keysProvisioningInPostCircle = true;
          await runTimeout(el.timeoutIndicator, el.progressCircle, 1500, () => keysProvisionAborted);
          keysProvisioningInPostCircle = false;
          if (!keysProvisionAborted) showStep(3); // next is add phone prompt
        }
      } catch (e) {
        if (!keysProvisionAborted) {
          const msg = e.message || "Serial error";
          if (msg.includes("Timeout")) setStatus(`Step failed (timeout): ${msg}`, true);
          else setStatus(msg, true);
        } else {
          setStatus("");
        }
      } finally {
        keysProvisioningInProgress = false;
        if (serialConn) await serialConn.close();
      }
    }

    function cancelKeyGenerationUI() {
      if (!el.secGen) return;
      el.secGen.classList.add("step-fading-out");
      setTimeout(() => {
        if (!el.secGen) return;
        el.secGen.classList.remove("step-fading-out", "step-visible");
        el.secGen.offsetHeight;
        el.secGen.classList.add("step-visible");
        if (el.btnGenerate) {
          el.btnGenerate.disabled = false;
          el.btnGenerate.style.display = "block";
        }
        if (el.step1Title) el.step1Title.textContent = "Generate New Key";
        if (el.keyPreviewContainer) el.keyPreviewContainer.style.display = "none";
        if (el.keyPreviewDots) {
          el.keyPreviewDots.style.opacity = "0";
          el.keyPreviewDots.style.filter = "blur(4px)";
        }
        if (el.timeoutIndicator) el.timeoutIndicator.classList.remove("visible");
      }, 200);
    }

    async function animateKeyGeneration(keysObj) {
      keysGenerationInProgress = true;
      keysGenerationAborted = false;
      try {
        if (el.secGen) el.secGen.classList.add("step-fading-out");
        await abortableDelay(200, () => keysGenerationAborted);
        if (keysGenerationAborted) {
          cancelKeyGenerationUI();
          return;
        }
        if (el.btnGenerate) el.btnGenerate.disabled = true;
        animateHeightChange(() => {
          if (el.secGen) {
            el.secGen.classList.remove("step-fading-out", "step-visible");
            el.secGen.offsetHeight;
            el.secGen.classList.add("step-visible");
          }
          if (el.btnGenerate) el.btnGenerate.style.display = "none";
          if (el.step1Title) el.step1Title.textContent = "Creating a new AES-128 key ...";
          if (el.keyPreviewContainer) el.keyPreviewContainer.style.display = "block";
          if (el.keyPreviewDots) el.keyPreviewDots.style.display = "block";
        });

        if (el.keyPreview) {
          el.keyPreview.classList.add("scrambling");
          el.keyPreview.classList.remove("revealed");
          el.keyPreview.style.opacity = "1";
          el.keyPreview.style.filter = "blur(0px)";
        }

        const hexChars = "0123456789abcdef";
        for (let len = 1; len <= 32; len++) {
          if (keysGenerationAborted) {
            cancelKeyGenerationUI();
            return;
          }
          let scrambled = "";
          for (let j = 0; j < len; j++) {
            scrambled += hexChars[Math.floor(Math.random() * hexChars.length)];
          }
          if (el.keyPreview) el.keyPreview.textContent = scrambled;
          await abortableDelay(30, () => keysGenerationAborted);
        }

        if (keysGenerationAborted) {
          cancelKeyGenerationUI();
          return;
        }
        if (el.keyPreview) el.keyPreview.classList.remove("scrambling");
        await abortableDelay(1000, () => keysGenerationAborted);

        if (keysGenerationAborted) {
          cancelKeyGenerationUI();
          return;
        }
        if (el.keyPreview) {
          el.keyPreview.style.opacity = "0";
          el.keyPreview.style.filter = "blur(4px)";
        }

        setKeys(keysObj);
        if (el.keyPreviewDots) {
          el.keyPreviewDots.style.opacity = "1";
          el.keyPreviewDots.style.filter = "blur(0px)";
        }

        await abortableDelay(400, () => keysGenerationAborted);

        if (keysGenerationAborted) {
          cancelKeyGenerationUI();
          return;
        }
        if (el.btnGenerate) el.btnGenerate.disabled = false;

        await runTimeout(el.timeoutIndicator, el.progressCircle, 1500, () => keysGenerationAborted);
        if (keysGenerationAborted) {
          cancelKeyGenerationUI();
          return;
        }
        showStep(1); // Normal flow: flash receiver
      } finally {
        keysGenerationInProgress = false;
      }
    }

    function resetKeysUI() {
      keysGenerationAborted = true;
      currentKeys = null;
      fobFlashed = false;
      receiverFlashed = false;
      if (el.keyStatus) {
        el.keyStatus.textContent = "";
        el.keyStatus.className = "status";
      }
      const fobDesc = document.getElementById("fob-desc");
      const receiverDesc = document.getElementById("receiver-desc");
      if (fobDesc) fobDesc.style.display = "block";
      if (receiverDesc) receiverDesc.style.display = "block";
      if (el.fobStatus) {
        el.fobStatus.textContent = "";
        el.fobStatus.className = "status";
        el.fobStatus.style.display = "none";
      }
      if (el.receiverStatus) {
        el.receiverStatus.textContent = "";
        el.receiverStatus.className = "status";
        el.receiverStatus.style.display = "none";
      }
      if (el.notes) {
        el.notes.classList.remove("step-visible");
        el.notes.classList.add("step-hidden");
      }
      if (!keysGenerationInProgress) {
        if (el.secGen) {
          el.secGen.classList.remove("step-fading-out");
          el.secGen.classList.add("step-visible");
        }
        if (el.keyPreviewContainer) el.keyPreviewContainer.style.display = "none";
        if (el.keyPreviewDots) {
          el.keyPreviewDots.style.opacity = "0";
          el.keyPreviewDots.style.filter = "blur(4px)";
        }
        if (el.step1Title) el.step1Title.textContent = "Generate New Key";
        if (el.btnGenerate) {
          el.btnGenerate.style.display = "block";
          el.btnGenerate.disabled = false;
        }
        if (el.timeoutIndicator) el.timeoutIndicator.classList.remove("visible");
      }
      showStep(0, false);
      replaceHistory(0);
    }

    if (el.btnGenerate) {
      el.btnGenerate.addEventListener("click", async () => {
        keysGenerationAborted = false;
        animateHeightChange(() => {
          if (el.keyStatus) {
            el.keyStatus.textContent = "";
            el.keyStatus.className = "status";
          }
        });

        let keysObj = null;
        try {
          // Just generate fobKey for now, phone key is generated later if they want it
          const fobKeyHex = generateKey();
          keysObj = { fobKey: fobKeyHex };
        } catch (e) {
          console.error("Key generation error:", e);
          animateHeightChange(() => {
            if (el.keyStatus) {
              el.keyStatus.textContent = "Error generating key.";
              el.keyStatus.className = "status error";
            }
          });
          return;
        }

        animateHeightChange(() => {
          fobFlashed = false;
          receiverFlashed = false;
          if (el.fobStatus) {
            el.fobStatus.textContent = "";
            el.fobStatus.className = "status";
            el.fobStatus.style.display = "none";
          }
          const fd = document.getElementById("fob-desc");
          if (fd) fd.style.display = "block";
          if (el.receiverStatus) {
            el.receiverStatus.textContent = "";
            el.receiverStatus.className = "status";
            el.receiverStatus.style.display = "none";
          }
          const rd = document.getElementById("receiver-desc");
          if (rd) rd.style.display = "block";
        });

        await animateKeyGeneration(keysObj);
      });
    }

    if (el.btnFlashReceiver) {
      el.btnFlashReceiver.addEventListener("click", async () => {
        setReceiverStatus("Select port…");
        await provisionDevice(CONFIG.DEVICE_ID_RX, setReceiverStatus, CONFIG.BOOTED_RX);
      });
    }

    if (el.btnFlashFob) {
      el.btnFlashFob.addEventListener("click", async () => {
        setFobStatus("Select port…");
        await provisionDevice(CONFIG.DEVICE_ID_FOB, setFobStatus, CONFIG.BOOTED_FOB);
      });
    }

    // --- ADD PHONE KEY FLOW (BLE) ---
    
    if (el.btnAddPhoneNo) {
      el.btnAddPhoneNo.addEventListener("click", () => {
        showStep(6); // All done
        triggerConfetti();
      });
    }

    if (el.btnAddPhoneYes) {
      el.btnAddPhoneYes.addEventListener("click", () => {
        // Open the dashboard overlay at ds-tutorial; when provisioning is done
        // the callback advances the main flow to "All done" + confetti.
        if (window.Whimbrel.openForProvisioning) {
          window.Whimbrel.openForProvisioning(() => {
            showStep(6);
            triggerConfetti();
          });
        }
      });
    }

    function updatePinUI(val) {
      for (let i = 0; i < 6; i++) {
        if (i < val.length) {
          el.pinCircles[i].classList.add("filled");
        } else {
          el.pinCircles[i].classList.remove("filled");
        }
      }
    }

    async function processPinAndProvision(pin) {
      try {
        let bleManager;
        if (DEMO_MODE) {
          bleManager = {
            sendCommand: async () => { await new Promise(r => setTimeout(r, 100)); },
            disconnect: () => {}
          };
        } else {
          bleManager = new window.Whimbrel.BLEManager();
          await bleManager.connect();
        }

        if (el.pinStatus) {
          el.pinStatus.textContent = "Generating secure keys...";
        }

        if (el.pinStatus) el.pinStatus.textContent = "Generating secure keys...";

        // Crypto + BLE handled by the shared provisionPhone helper in prov.js.
        // The main flow always provisions slot 1 and sets the PIN for the first time.
        const { qrUrl } = await window.Whimbrel.provisionPhone({
          pin, slotId: 1, doSetPin: true, bleManager
        });

        if (el.pinStatus) el.pinStatus.textContent = "Provisioning to Guillemot...";
        await abortableDelay(500);
        bleManager.disconnect();

        // Render QR
        const qrImg = document.getElementById("qr-img");
        const qr = new QRious({ value: qrUrl, size: 300 });
        qrImg.src = qr.toDataURL('image/png');
        showStep(5); // Show QR

      } catch (e) {
        console.error(e);
        if (el.pinStatus) {
          el.pinStatus.textContent = "Error: " + e.message;
          el.pinStatus.className = "status error";
        }
      }
    }

    // Keyboard listener for PIN
    document.addEventListener("keydown", (e) => {
      // Only process if we are on step 4
      if (currentStepIdx !== 4) return;
      if (!el.secAddPhonePin || !el.secAddPhonePin.classList.contains("step-visible")) return;
      // Yield to the dashboard overlay if it is open — its own handler owns the input there
      const dashOverlay = document.getElementById("dashboard-overlay");
      if (dashOverlay && dashOverlay.classList.contains("visible")) return;

      if (e.key === "Backspace") {
        appPinValue = appPinValue.slice(0, -1);
      } else if (/^[0-9]$/.test(e.key) && appPinValue.length < 6) {
        appPinValue += e.key;
      } else {
        return;
      }

      e.preventDefault();
      el.hiddenPinInput.value = appPinValue;
      updatePinUI(appPinValue);

      if (appPinValue.length === 6) {
        el.hiddenPinInput.blur();
        // Defer processing so the 6th circle paints before the async work starts
        setTimeout(() => processPinAndProvision(appPinValue), 0);
      }
    });
    
    // Focus the hidden input if user taps the circles area
    if (el.secAddPhonePin) {
      el.secAddPhonePin.addEventListener("click", () => {
        el.hiddenPinInput.focus();
      });
    }

    if (el.btnQrDone) {
      el.btnQrDone.addEventListener("click", () => {
        showStep(6);
        triggerConfetti();
      });
    }

    // Dashboard Modal Logic
    const btnManageKeys = document.getElementById("btn-manage-keys");
    const dashboardOverlay = document.getElementById("dashboard-overlay");
    
    // (Note: The close buttons inside the overlay are now handled by dashboard.js 
    // because they are generated dynamically.)

    if (btnManageKeys && dashboardOverlay) {
      btnManageKeys.addEventListener("click", () => {
        dashboardOverlay.classList.add("visible");
        if (window.Whimbrel.initDashboard) {
          window.Whimbrel.initDashboard(); // refresh dashboard
        }
      });
    }

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isFwFlashing()) {
          if (!confirm("Firmware is still flashing. Exit anyway?")) return;
          abortFwFlash();
        } else if (keysProvisioningInProgress) {
          if (keysProvisioningInPostCircle) {
            keysProvisionAborted = true;
          } else {
            if (!confirm("Provisioning in progress. Exit anyway?")) return;
            keysProvisionAborted = true;
          }
        }

        if (btn.dataset.tab === "tab-keys" && btn.classList.contains("active")) {
          resetKeysUI();
        }
        if (btn.dataset.tab === "tab-firmware" && btn.classList.contains("active")) {
          resetFwFlashUI();
          showFwStep(0, false);
        }
        tabBtns.forEach((b) => b.classList.remove("active"));
        tabContents.forEach((c) => {
          c.style.display = "none";
          c.classList.remove("active");
        });
        btn.classList.add("active");
        const target = document.getElementById(btn.dataset.tab);
        if (target) {
          target.style.display = "block";
          target.classList.add("active");
        }
        if (btn.dataset.tab === "tab-keys") {
          try {
            // Push (not replace) so that back from step 1 correctly returns to
            // step 0 rather than jumping out to the firmware tab.
            history.pushState(
              { tab: "keys", step: currentStepIdx },
              "",
              `#step${currentStepIdx + 1}`
            );
          } catch (e) {}
        } else {
          try {
            const fwStep = getFwStepIdx();
            history.replaceState(
              { tab: "firmware", fwStep },
              "",
              `#firmware-step${fwStep + 1}`
            );
          } catch (e) {}
        }
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
