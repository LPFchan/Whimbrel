/**
 * Whimbrel app: main UI orchestration, key generation, and provisioning flows.
 * Depends on: crypto.js, serial.js, prov.js, firmware.js (load order matters).
 * No ES modules - supports file:// execution.
 */

let currentKey = null;
let fobFlashed = false;
let receiverFlashed = false;

document.addEventListener("DOMContentLoaded", () => {
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
    secGen: document.getElementById("generate"),
    secFob: document.getElementById("flash-fob"),
    secRx: document.getElementById("flash-receiver"),
    timeoutIndicator: document.getElementById("timeout-indicator"),
    progressCircle: document.querySelector("#timeout-indicator .progress-ring-circle"),
    stepper: document.getElementById("stepper"),
    step1Title: document.getElementById("step-1-title"),
    stepCircles: [
      document.getElementById("step-circle-1"),
      document.getElementById("step-circle-2"),
      document.getElementById("step-circle-3")
    ]
  };

  let currentStepIdx = 0;
  let keysProvisioningInProgress = false;
  let keysProvisionAborted = false;
  let keysProvisioningInPostCircle = false;
  let keysGenerationInProgress = false;
  let keysGenerationAborted = false;
  let heightAnimTimeout = null;

  function animateHeightChange(callback) {
    if (heightAnimTimeout) {
      clearTimeout(heightAnimTimeout);
      el.mainPanel.style.height = "auto";
      el.mainPanel.style.transitionProperty = "background-color, border-color, box-shadow";
    }

    const startHeight = el.mainPanel.offsetHeight;
    el.mainPanel.style.height = startHeight + "px";
    el.mainPanel.style.overflow = "hidden";

    callback();

    el.mainPanel.style.height = "auto";
    const targetHeight = el.mainPanel.offsetHeight;

    if (startHeight === targetHeight) {
      el.mainPanel.style.overflow = "visible";
      return;
    }

    el.mainPanel.style.height = startHeight + "px";
    el.mainPanel.offsetHeight;

    el.mainPanel.style.transitionProperty = "height, background-color, border-color, box-shadow";
    el.mainPanel.style.transitionDuration = "0.4s, 0.3s, 0.3s, 0.3s";
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

  const fwTab =
    typeof initFirmwareTab === "function"
      ? initFirmwareTab({ abortableDelay, animateHeightChange, triggerConfetti })
      : null;
  const showFwStep = fwTab ? fwTab.showFwStep : () => {};
  const resetFwFlashUI = fwTab ? fwTab.resetFwFlashUI : () => {};
  const handleFirmwarePopState = fwTab ? fwTab.handleFirmwarePopState : () => false;
  const abortFwFlash = fwTab ? fwTab.abortFwFlash : () => {};
  const isFwFlashing = fwTab ? fwTab.isFwFlashing : () => false;
  const getFwStepIdx = fwTab ? fwTab.getFwStepIdx : () => 0;

  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  history.replaceState({ tab: "firmware", fwStep: 0 }, "", "#firmware-step1");

  async function showStep(stepIndex, pushStateFlag = true) {
    if (currentStepIdx === stepIndex) return;

    if (pushStateFlag && stepIndex > currentStepIdx) {
      try {
        history.pushState({ tab: "keys", step: stepIndex }, "", `#step${stepIndex + 1}`);
      } catch (e) {}
    }

    const visibleEls = [el.secGen, el.secFob, el.secRx, el.navHeader, el.notes].filter((e) =>
      e.classList.contains("step-visible")
    );
    visibleEls.forEach((e) => e.classList.add("step-fading-out"));
    await abortableDelay(200);

    animateHeightChange(() => {
      currentStepIdx = stepIndex;
      el.stepCircles.forEach((c, idx) => {
        if (c) {
          if (idx === Math.min(stepIndex, 2)) c.classList.add("active");
          else c.classList.remove("active");
        }
      });

      [el.secGen, el.secFob, el.secRx, el.navHeader, el.notes].forEach((e) => {
        e.classList.remove("step-visible", "step-fading-out");
        e.classList.add("step-hidden");
      });

      if (stepIndex === 0) {
        if (el.stepper) el.stepper.classList.remove("step-fading-out", "step-hidden");
        if (el.stepper) el.stepper.classList.add("step-visible");
        el.secGen.classList.remove("step-hidden");
        el.secGen.classList.add("step-visible");
        el.btnGenerate.style.display = "block";
        el.step1Title.textContent = "Generate New Key";
        el.keyPreviewContainer.style.display = "none";
        el.keyPreviewDots.style.opacity = "0";
        el.keyPreviewDots.style.filter = "blur(4px)";
      } else if (stepIndex === 1) {
        if (el.stepper) el.stepper.classList.remove("step-fading-out", "step-hidden");
        if (el.stepper) el.stepper.classList.add("step-visible");
        el.navHeader.classList.remove("step-hidden");
        el.navHeader.classList.add("step-visible");
        el.secFob.classList.remove("step-hidden");
        el.secFob.classList.add("step-visible");
      } else if (stepIndex === 2) {
        if (el.stepper) el.stepper.classList.remove("step-fading-out", "step-hidden");
        if (el.stepper) el.stepper.classList.add("step-visible");
        el.navHeader.classList.remove("step-hidden");
        el.navHeader.classList.add("step-visible");
        el.secRx.classList.remove("step-hidden");
        el.secRx.classList.add("step-visible");
      } else if (stepIndex === 3) {
        if (el.stepper) el.stepper.classList.remove("step-visible", "step-fading-out");
        if (el.stepper) el.stepper.classList.add("step-hidden");
        el.notes.classList.remove("step-hidden");
        el.notes.classList.add("step-visible");
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
    el.unsupportedMsg.style.display = "block";
    return;
  }

  function setKey(key) {
    currentKey = key;
    el.btnFlashFob.disabled = !key;
    el.btnFlashReceiver.disabled = !key;
  }
  setKey(currentKey);

  el.btnBack.addEventListener("click", () => {
    if (currentStepIdx > 0) history.back();
  });

  el.homeLink.addEventListener("click", () => {
    if (currentStepIdx > 0) {
      pushHistory(0);
      showStep(0);
    }
  });

  function setFobStatus(text, isError = false) {
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
    if (!currentKey) {
      setStatus("Generate a secret first.", true);
      return;
    }
    if (!isSupported()) {
      setStatus("Web Serial not supported.", true);
      return;
    }
    keysProvisioningInProgress = true;
    keysProvisionAborted = false;
    let port = null;
    try {
      port = await requestPort();
      if (keysProvisionAborted) return;
      await openPort(port);

      setStatus("Writing key…");
      const line = buildProvLine(deviceId, currentKey);
      await sendLine(line);
      const response = await readLineWithTimeout(TIMEOUT_PROV_MS);
      if (keysProvisionAborted) {
        setStatus("");
        return;
      }
      if (response !== "ACK:PROV_SUCCESS") {
        if (response.startsWith("ERR:")) {
          setStatus(`Step 1 (write & verify) failed: ${response}`, true);
        } else {
          setStatus(`Step 1 (write & verify) failed: unexpected response: ${response}`, true);
        }
        return;
      }

      setStatus("Waiting for device to boot…");
      await waitForBooted(expectedBooted);
      if (keysProvisionAborted) {
        setStatus("");
        return;
      }

      setStatus("Done. Device provisioned and running.");
      if (deviceId === DEVICE_ID_FOB) {
        fobFlashed = true;
        keysProvisioningInPostCircle = true;
        await runTimeout(el.timeoutIndicator, el.progressCircle, 1500, () => keysProvisionAborted);
        keysProvisioningInPostCircle = false;
        if (!keysProvisionAborted) showStep(2);
      }
      if (deviceId === DEVICE_ID_RX) receiverFlashed = true;

      if (fobFlashed && receiverFlashed && currentStepIdx === 2) {
        await showStep(3);
        triggerConfetti();
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
      if (port) await closePort(port);
    }
  }

  function cancelKeyGenerationUI() {
    el.secGen.classList.add("step-fading-out");
    setTimeout(() => {
      el.secGen.classList.remove("step-fading-out", "step-visible");
      el.secGen.offsetHeight;
      el.secGen.classList.add("step-visible");
      el.btnGenerate.disabled = false;
      el.btnGenerate.style.display = "block";
      el.step1Title.textContent = "Generate New Key";
      el.keyPreviewContainer.style.display = "none";
      el.keyPreviewDots.style.opacity = "0";
      el.keyPreviewDots.style.filter = "blur(4px)";
      el.timeoutIndicator.classList.remove("visible");
    }, 200);
  }

  async function animateKeyGeneration(finalKey) {
    keysGenerationInProgress = true;
    keysGenerationAborted = false;
    try {
      el.secGen.classList.add("step-fading-out");
      await abortableDelay(200, () => keysGenerationAborted);
      if (keysGenerationAborted) {
        cancelKeyGenerationUI();
        return;
      }
      el.btnGenerate.disabled = true;
      animateHeightChange(() => {
        el.secGen.classList.remove("step-fading-out", "step-visible");
        el.secGen.offsetHeight;
        el.secGen.classList.add("step-visible");
        el.btnGenerate.style.display = "none";
        el.step1Title.textContent = "Creating a new AES-128 key ...";
        el.keyPreviewContainer.style.display = "block";
        el.keyPreviewDots.style.display = "block";
      });

      el.keyPreview.classList.add("scrambling");
      el.keyPreview.classList.remove("revealed");
      el.keyPreview.style.opacity = "1";
      el.keyPreview.style.filter = "blur(0px)";

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
        el.keyPreview.textContent = scrambled;
        await abortableDelay(30, () => keysGenerationAborted);
      }

      if (keysGenerationAborted) {
        cancelKeyGenerationUI();
        return;
      }
      el.keyPreview.classList.remove("scrambling");
      await abortableDelay(1000, () => keysGenerationAborted);

      if (keysGenerationAborted) {
        cancelKeyGenerationUI();
        return;
      }
      el.keyPreview.style.opacity = "0";
      el.keyPreview.style.filter = "blur(4px)";

      setKey(finalKey);
      el.keyPreviewDots.style.opacity = "1";
      el.keyPreviewDots.style.filter = "blur(0px)";

      await abortableDelay(400, () => keysGenerationAborted);

      if (keysGenerationAborted) {
        cancelKeyGenerationUI();
        return;
      }
      el.btnGenerate.disabled = false;

      await runTimeout(el.timeoutIndicator, el.progressCircle, 1500, () => keysGenerationAborted);
      if (keysGenerationAborted) {
        cancelKeyGenerationUI();
        return;
      }
      showStep(1);
    } finally {
      keysGenerationInProgress = false;
    }
  }

  function resetKeysUI() {
    keysGenerationAborted = true;
    currentKey = null;
    fobFlashed = false;
    receiverFlashed = false;
    el.keyStatus.textContent = "";
    el.keyStatus.className = "status";
    const fobDesc = document.getElementById("fob-desc");
    const receiverDesc = document.getElementById("receiver-desc");
    if (fobDesc) fobDesc.style.display = "block";
    if (receiverDesc) receiverDesc.style.display = "block";
    el.fobStatus.textContent = "";
    el.fobStatus.className = "status";
    el.fobStatus.style.display = "none";
    el.receiverStatus.textContent = "";
    el.receiverStatus.className = "status";
    el.receiverStatus.style.display = "none";
    el.notes.classList.remove("step-visible");
    el.notes.classList.add("step-hidden");
    if (!keysGenerationInProgress) {
      el.secGen.classList.remove("step-fading-out");
      el.secGen.classList.add("step-visible");
      el.keyPreviewContainer.style.display = "none";
      el.keyPreviewDots.style.opacity = "0";
      el.keyPreviewDots.style.filter = "blur(4px)";
      el.step1Title.textContent = "Generate New Key";
      el.btnGenerate.style.display = "block";
      el.btnGenerate.disabled = false;
      el.timeoutIndicator.classList.remove("visible");
    }
    showStep(0, false);
    replaceHistory(0);
  }

  el.btnGenerate.addEventListener("click", async () => {
    keysGenerationAborted = false;
    animateHeightChange(() => {
      el.keyStatus.textContent = "";
      el.keyStatus.className = "status";
    });

    let key;
    try {
      key = generateKey();
    } catch (e) {
      console.error("Key generation error:", e);
      animateHeightChange(() => {
        el.keyStatus.textContent = "Error generating key.";
        el.keyStatus.className = "status error";
        el.btnGenerate.style.display = "block";
        el.step1Title.textContent = "Generate New Key";
        el.keyPreviewContainer.style.display = "none";
      });
      return;
    }

    animateHeightChange(() => {
      fobFlashed = false;
      receiverFlashed = false;
      el.notes.classList.remove("step-visible");
      el.notes.classList.add("step-hidden");
      el.fobStatus.textContent = "";
      el.fobStatus.className = "status";
      el.fobStatus.style.display = "none";
      const fd = document.getElementById("fob-desc");
      if (fd) fd.style.display = "block";
      el.receiverStatus.textContent = "";
      el.receiverStatus.className = "status";
      el.receiverStatus.style.display = "none";
      const rd = document.getElementById("receiver-desc");
      if (rd) rd.style.display = "block";
    });

    await animateKeyGeneration(key);
  });

  el.btnFlashFob.addEventListener("click", async () => {
    setFobStatus("Select port…");
    await provisionDevice(DEVICE_ID_FOB, setFobStatus, BOOTED_FOB);
  });

  el.btnFlashReceiver.addEventListener("click", async () => {
    setReceiverStatus("Select port…");
    await provisionDevice(DEVICE_ID_RX, setReceiverStatus, BOOTED_RX);
  });

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
          history.replaceState(
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
});
