/**
 * Whimbrel firmware tab: UI Controller for release fetching and DFU flashing.
 */

(function() {
  const {
    fetchDeviceReleases,
    fetchAndParseFirmwareZip,
    DfuFlasher,
    requestPort,
    isSupported
  } = window.Whimbrel;

  window.Whimbrel.initFirmwareTab = function(opts) {
    const { abortableDelay, animateHeightChange, triggerConfetti } = opts;

    let fwCurrentStepIdx = 0;
    let fwSelectedDeviceName = "Guillemot";
    let fwFlashingInProgress = false;
    let fwFlashAborted = false;
    let latestFwZipUrl = null;
    let latestFwZipBuffer = null;
    let allReleases = [];
    let selectedReleaseIdx = 0;
    let fwProgressFadeTimeout = null;

    const fwStep1 = document.getElementById("fw-step-1");
    const fwStepInstructions = document.getElementById("fw-step-instructions");
    const fwStep2 = document.getElementById("fw-step-2");
    const fwDeviceTitle = document.getElementById("fw-device-title");
    const btnFwGuillemot = document.getElementById("btn-fw-guillemot");
    const btnFwUguisu = document.getElementById("btn-fw-uguisu");
    const fwReleaseInfo = document.getElementById("fw-release-info");
    const fwReleaseDropdown = document.getElementById("fw-release-dropdown");
    const btnFlashFw = document.getElementById("btn-flash-fw");
    const fwStatus = document.getElementById("fw-status");
    const fwProgressContainer = document.getElementById("fw-progress-container");
    const fwProgressBar = document.getElementById("fw-progress-bar");
    const fwLocalFileInput = document.getElementById("fw-local-file-input");

    function showFwStep(stepIndex, pushStateFlag = true) {
      if (fwCurrentStepIdx === stepIndex) return;

      if (pushStateFlag && stepIndex > fwCurrentStepIdx) {
        try {
          history.pushState({ tab: "firmware", fwStep: stepIndex }, "", `#firmware-step${stepIndex + 1}`);
        } catch (e) {}
      }

      const visibleEls = [fwStep1, fwStepInstructions, fwStep2].filter(
        (e) => e && e.classList.contains("step-visible")
      );
      visibleEls.forEach((e) => e.classList.add("step-fading-out"));

      (async () => {
        await abortableDelay(200);
        animateHeightChange(() => {
          fwCurrentStepIdx = stepIndex;

          [fwStep1, fwStepInstructions, fwStep2].forEach((e) => {
            if (e) {
              e.classList.remove("step-visible", "step-fading-out");
              e.classList.add("step-hidden");
            }
          });

          if (stepIndex === 0 && fwStep1) {
            fwStep1.classList.remove("step-hidden");
            fwStep1.classList.add("step-visible");
          } else if (stepIndex === 1 && fwStepInstructions) {
            fwStepInstructions.classList.remove("step-hidden");
            fwStepInstructions.classList.add("step-visible");
          } else if (stepIndex === 2 && fwStep2) {
            fwStep2.classList.remove("step-hidden");
            fwStep2.classList.add("step-visible");
            if (fwDeviceTitle) fwDeviceTitle.textContent = `Flashing ${fwSelectedDeviceName}`;
            resetFwFlashUI();
          }
        });
      })();
    }

    function setFwStatus(text, progress = null, isError = false, asHtml = false) {
      if (!fwStatus) return;
      fwStatus.style.display = "block";
      if (asHtml) fwStatus.innerHTML = text;
      else fwStatus.textContent = text;
      fwStatus.className = "status " + (isError ? "error" : "success");

      if (progress !== null && fwProgressContainer && fwProgressBar) {
        if (fwProgressFadeTimeout) {
          clearTimeout(fwProgressFadeTimeout);
          fwProgressFadeTimeout = null;
        }
        fwProgressContainer.classList.remove("fade-out");
        fwProgressContainer.style.display = "block";
        fwProgressBar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
        if (btnFlashFw) btnFlashFw.style.display = "none";
        if (progress >= 1) {
          fwProgressFadeTimeout = setTimeout(() => {
            fwProgressFadeTimeout = null;
            fwProgressContainer.classList.add("fade-out");
            setTimeout(() => {
              if (fwProgressContainer) {
                fwProgressContainer.style.display = "none";
                fwProgressContainer.classList.remove("fade-out");
              }
            }, 400);
          }, 500);
        }
      } else {
        if (fwProgressFadeTimeout) {
          clearTimeout(fwProgressFadeTimeout);
          fwProgressFadeTimeout = null;
        }
        if (fwProgressContainer) {
          fwProgressContainer.classList.remove("fade-out");
          fwProgressContainer.style.display = "none";
        }
        if (btnFlashFw) btnFlashFw.style.display = "";
      }
    }

    function setFwStatusSuccessWithLink() {
      if (fwProgressFadeTimeout) {
        clearTimeout(fwProgressFadeTimeout);
        fwProgressFadeTimeout = null;
      }
      const otherDevice = fwSelectedDeviceName === "Guillemot" ? "Uguisu" : "Guillemot";
      const linkText = "Flash " + otherDevice;
      if (fwStatus) {
        fwStatus.style.display = "block";
        fwStatus.innerHTML =
          'Firmware flashed successfully! <a href="#" class="fw-back-to-tiles">' +
          linkText +
          "</a>";
        fwStatus.className = "status success";
      }
      if (fwProgressContainer) fwProgressContainer.classList.remove("fade-out");
      if (fwProgressContainer) fwProgressContainer.style.display = "block";
      if (fwProgressBar) fwProgressBar.style.width = "100%";
      if (btnFlashFw) btnFlashFw.style.display = "none";
      fwProgressFadeTimeout = setTimeout(() => {
        fwProgressFadeTimeout = null;
        if (fwProgressContainer) {
          fwProgressContainer.classList.add("fade-out");
          setTimeout(() => {
            if (fwProgressContainer) {
              fwProgressContainer.style.display = "none";
              fwProgressContainer.classList.remove("fade-out");
            }
          }, 400);
        }
      }, 500);
    }

    function resetFwFlashUI() {
      if (fwProgressFadeTimeout) {
        clearTimeout(fwProgressFadeTimeout);
        fwProgressFadeTimeout = null;
      }
      if (fwStatus) {
        fwStatus.style.display = "none";
        fwStatus.textContent = "";
        fwStatus.className = "status";
      }
      if (fwProgressContainer) {
        fwProgressContainer.style.display = "none";
        fwProgressContainer.classList.remove("fade-out");
      }
      if (fwProgressBar) fwProgressBar.style.width = "0%";
      if (btnFlashFw) btnFlashFw.style.display = "";
    }

    const CHEVRON_SVG = `<span style="font-size: 0.8em; margin-left: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;"><polyline points="6 9 12 15 18 9"></polyline></svg></span>`;

    function selectRelease(releaseData, isLatest = false) {
      const zipAsset = releaseData.assets.find((a) => a.name.endsWith(".zip"));
      if (zipAsset) {
        selectedReleaseIdx = allReleases.indexOf(releaseData);
        latestFwZipUrl = zipAsset.browser_download_url;
        latestFwZipBuffer = null;
        if (fwReleaseInfo) {
          fwReleaseInfo.innerHTML =
            `<div><a href="${releaseData.html_url}" target="_blank" onclick="event.stopPropagation()">${releaseData.tag_name}</a>${
              isLatest ? '<span class="badge-latest">latest</span>' : ""
            }<br><small style="color: var(--muted);">${zipAsset.name}</small></div>` + CHEVRON_SVG;
        }
        if (btnFlashFw) btnFlashFw.disabled = false;
      }
    }

    function buildReleaseDropdown() {
      if (!fwReleaseDropdown) return;

      const releaseItemsHtml = allReleases.map((r, idx) => {
        const zipAsset = r.assets.find((a) => a.name.endsWith(".zip"));
        return `<div class="release-item${idx === selectedReleaseIdx ? " selected" : ""}" data-idx="${idx}">
          <strong>${r.tag_name}</strong>${idx === 0 ? '<span class="badge-latest">latest</span>' : ""}<br>
          <small style="color: var(--muted);">${zipAsset ? zipAsset.name : ""}</small>
        </div>`;
      }).join("");

      fwReleaseDropdown.innerHTML = releaseItemsHtml +
        `<div class="release-separator"></div>
        <div class="release-item release-item-custom" data-action="custom-repo">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          Custom GitHub repo...
        </div>
        <div class="release-item release-item-custom" data-action="local-file">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Load local .zip...
        </div>`;

      const releaseItems = fwReleaseDropdown.querySelectorAll(".release-item[data-idx]");
      releaseItems.forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(item.dataset.idx);
          selectRelease(allReleases[idx], idx === 0);
          fwReleaseDropdown.classList.remove("visible");
        });
      });

      const customRepoEl = fwReleaseDropdown.querySelector('[data-action="custom-repo"]');
      if (customRepoEl) {
        customRepoEl.addEventListener("click", (e) => {
          e.stopPropagation();
          showCustomRepoForm();
        });
      }

      const localFileEl = fwReleaseDropdown.querySelector('[data-action="local-file"]');
      if (localFileEl) {
        localFileEl.addEventListener("click", (e) => {
          e.stopPropagation();
          fwReleaseDropdown.classList.remove("visible");
          if (fwLocalFileInput) fwLocalFileInput.click();
        });
      }
    }

    function showCustomRepoForm() {
      if (!fwReleaseDropdown) return;
      fwReleaseDropdown.innerHTML = `
        <div class="custom-repo-form">
          <button type="button" class="custom-repo-back" id="fw-custom-repo-back">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
          <div class="custom-repo-input-row">
            <input type="text" id="fw-custom-repo-input" class="custom-repo-input" placeholder="owner/repo">
            <button type="button" id="fw-custom-repo-fetch" class="custom-repo-fetch-btn">Fetch</button>
          </div>
        </div>
      `;

      const backBtn = document.getElementById("fw-custom-repo-back");
      const inputEl = document.getElementById("fw-custom-repo-input");
      const fetchBtn = document.getElementById("fw-custom-repo-fetch");

      setTimeout(() => { if (inputEl) inputEl.focus(); }, 0);

      if (backBtn) {
        backBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          buildReleaseDropdown();
          if (allReleases.length === 0) fwReleaseDropdown.classList.remove("visible");
        });
      }

      const doFetch = async () => {
        const repo = inputEl ? inputEl.value.trim() : "";
        if (!repo) return;
        fwReleaseDropdown.classList.remove("visible");
        await fetchReleases(repo);
      };

      if (fetchBtn) {
        fetchBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          doFetch();
        });
      }

      if (inputEl) {
        inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") doFetch();
          e.stopPropagation();
        });
        inputEl.addEventListener("click", (e) => e.stopPropagation());
      }
    }

    async function fetchReleases(repoName) {
      try {
        if (fwReleaseInfo) fwReleaseInfo.innerHTML = `<span>Fetching releases for ${repoName}...</span>`;
        if (btnFlashFw) btnFlashFw.disabled = true;
        latestFwZipUrl = null;
        latestFwZipBuffer = null;
        allReleases = [];
        selectedReleaseIdx = 0;
        buildReleaseDropdown();

        allReleases = await fetchDeviceReleases(repoName);
        selectRelease(allReleases[0], true);
        buildReleaseDropdown();
      } catch (e) {
        if (fwReleaseInfo) fwReleaseInfo.innerHTML = `<span style="color: var(--error)">Error: ${e.message}</span>`;
        if (btnFlashFw) btnFlashFw.disabled = true;
        buildReleaseDropdown();
      }
    }

    if (fwLocalFileInput) {
      fwLocalFileInput.addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        try {
          const buffer = await file.arrayBuffer();
          selectedReleaseIdx = -1;
          latestFwZipUrl = "local";
          latestFwZipBuffer = buffer;

          if (fwReleaseInfo) {
            fwReleaseInfo.innerHTML =
              `<div><strong>${file.name}</strong><br><small style="color: var(--muted);">local file</small></div>` +
              CHEVRON_SVG;
          }
          if (btnFlashFw) btnFlashFw.disabled = false;
          buildReleaseDropdown();
        } catch (err) {
          if (fwReleaseInfo) fwReleaseInfo.innerHTML = `<span style="color: var(--error)">Error reading file: ${err.message}</span>`;
        }

        fwLocalFileInput.value = "";
      });
    }

    if (fwReleaseInfo) {
      fwReleaseInfo.addEventListener("click", () => {
        if (fwReleaseDropdown) {
          fwReleaseDropdown.classList.toggle("visible");
        }
      });
    }

    document.addEventListener("click", (e) => {
      if (fwReleaseInfo && fwReleaseDropdown && !fwReleaseInfo.contains(e.target) && !fwReleaseDropdown.contains(e.target)) {
        fwReleaseDropdown.classList.remove("visible");
      }
    });

    if (fwStep2) {
      fwStep2.addEventListener("click", (e) => {
        if (e.target.closest(".fw-back-to-tiles")) {
          e.preventDefault();
          showFwStep(0);
        }
      });
    }

    const btnFwInstructionsBack = document.getElementById("btn-fw-instructions-back");
    if (btnFwInstructionsBack) {
      btnFwInstructionsBack.addEventListener("click", () => {
        if (fwCurrentStepIdx > 0) history.back();
      });
    }

    const btnFwBack = document.getElementById("btn-fw-back");
    if (btnFwBack) {
      btnFwBack.addEventListener("click", () => {
        if (fwCurrentStepIdx > 0) {
          if (fwCurrentStepIdx === 2 && fwFlashingInProgress) {
            if (confirm("Firmware is still flashing. Exit anyway?")) {
              fwFlashAborted = true;
              fwFlashingInProgress = false;
              resetFwFlashUI();
              history.back();
            }
            return;
          }
          history.back();
        }
      });
    }

    const btnFwContinue = document.getElementById("btn-fw-continue");
    if (btnFwContinue) {
      btnFwContinue.addEventListener("click", () => showFwStep(2));
    }

    if (btnFwGuillemot) {
      btnFwGuillemot.addEventListener("click", () => {
        fwSelectedDeviceName = "Guillemot";
        showFwStep(1);
        fetchReleases("Guillemot");
      });
    }
    if (btnFwUguisu) {
      btnFwUguisu.addEventListener("click", () => {
        fwSelectedDeviceName = "Uguisu";
        showFwStep(1);
        fetchReleases("Uguisu");
      });
    }

    if (btnFlashFw) {
      btnFlashFw.addEventListener("click", async () => {
        if (!isSupported()) {
          setFwStatus("Web Serial not supported in this browser.", null, true);
          return;
        }
        fwFlashingInProgress = true;
        fwFlashAborted = false;
        if (!latestFwZipUrl && !latestFwZipBuffer) {
          setFwStatus("No firmware selected.", null, true);
          fwFlashingInProgress = false;
          return;
        }

        let port = null;
        try {
          port = await requestPort();
          if (fwFlashAborted) return;

          setFwStatus(
            latestFwZipUrl === "local" ? "Parsing firmware..." : "Downloading & parsing firmware...",
            0.1
          );
          const { datBytes, binBytes, buffer } = await fetchAndParseFirmwareZip(latestFwZipUrl, latestFwZipBuffer);
          latestFwZipBuffer = buffer;

          setFwStatus("Starting DFU process...", 0.2);

          const flasher = new DfuFlasher(port, datBytes, binBytes);
          await flasher.flash((msg, prog) => {
            setFwStatus(msg, 0.2 + ((prog || 0) * 0.8));
          });

          setFwStatusSuccessWithLink();
          triggerConfetti();
        } catch (e) {
          if (!fwFlashAborted) setFwStatus(`Error: ${e.message}`, null, true);
          console.error(e);
          if (port) {
            try {
              if (port.readable && port.readable.locked) {
                await port.readable.cancel().catch(() => {});
              }
              await port.close().catch(() => {});
            } catch (err) {}
          }
        } finally {
          fwFlashingInProgress = false;
        }
      });
    }

    function handleFirmwarePopState(e) {
      if (
        fwCurrentStepIdx === 2 &&
        fwFlashingInProgress &&
        typeof e.state?.fwStep === "number" &&
        e.state.fwStep < 2
      ) {
        history.pushState({ tab: "firmware", fwStep: 2 }, "", "#firmware-step3");
        if (confirm("Firmware is still flashing. Exit anyway?")) {
          fwFlashAborted = true;
          fwFlashingInProgress = false;
          resetFwFlashUI();
          history.back();
        }
        return true;
      }
      return false;
    }

    function abortFwFlash() {
      fwFlashAborted = true;
      fwFlashingInProgress = false;
      resetFwFlashUI();
    }

    function isFwFlashing() {
      return fwFlashingInProgress;
    }

    function getFwStepIdx() {
      return fwCurrentStepIdx;
    }

    return {
      showFwStep,
      resetFwFlashUI,
      handleFirmwarePopState,
      abortFwFlash,
      isFwFlashing,
      getFwStepIdx
    };
  };
})();
