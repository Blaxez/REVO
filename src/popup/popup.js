const elements = {
  globalSpeed: document.getElementById("global-speed"),
  globalSpeedValue: document.querySelector("#global-speed + .speed-value"),
  domainSpeed: document.getElementById("domain-speed"),
  domainSpeedValue: document.querySelector("#domain-speed + .speed-value"),
  currentDomain: document.getElementById("current-domain"),
  autoApply: document.getElementById("auto-apply"),
  themeAuto: document.getElementById("theme-auto"),
  overlayVisible: document.getElementById("overlay-visible"),
  saveSettings: document.getElementById("save-settings"),
  resetDomain: document.getElementById("reset-domain"),
  shortcutInputs: document.querySelectorAll(".key-input input"),
  editButtons: document.querySelectorAll(".edit-key"),
};

let settings = {};
let currentDomain = "";

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      currentDomain = new URL(tab.url).hostname;
      elements.currentDomain.textContent = currentDomain;
    } catch (e) {
      elements.currentDomain.textContent = "Unknown";
    }
  }

  await loadSettings();

  setupEventListeners();

  applyTheme();
});

async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "getSettings",
    });

    if (!response || !response.settings) {
      console.error("Invalid settings response");
      return;
    }

    settings = response.settings;

    updateUI();
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

function updateUI() {
  elements.globalSpeed.value = settings.defaultSpeed;
  elements.globalSpeedValue.textContent =
    settings.defaultSpeed.toFixed(2) + "x";

  const domainSettings = settings.domainSettings[currentDomain] || {};
  const domainSpeed = domainSettings.speed || settings.defaultSpeed;
  elements.domainSpeed.value = domainSpeed;
  elements.domainSpeedValue.textContent = domainSpeed.toFixed(2) + "x";

  elements.autoApply.checked = settings.autoApply;
  elements.themeAuto.checked = settings.theme === "auto";
  elements.overlayVisible.checked = settings.overlayVisible;

  elements.shortcutInputs.forEach((input) => {
    const action = input.dataset.action;
    if (settings.keyboardShortcuts[action]) {
      input.value = formatKeyCombo(settings.keyboardShortcuts[action]);
    }
  });
}

function formatKeyCombo(keyCombo) {
  if (!keyCombo) return "";

  return keyCombo
    .replace(/Shift/g, "Shift +")
    .replace(/Alt/g, "Alt +")
    .replace(/Ctrl/g, "Ctrl +")
    .replace(/ArrowUp/g, "↑")
    .replace(/ArrowDown/g, "↓")
    .replace(/ArrowLeft/g, "←")
    .replace(/ArrowRight/g, "→")
    .replace(/Digit0/g, "0")
    .replace(/Digit1/g, "1")
    .replace(/Digit2/g, "2")
    .replace(/Digit3/g, "3")
    .replace(/Digit4/g, "4")
    .replace(/Digit5/g, "5")
    .replace(/Digit6/g, "6")
    .replace(/Digit7/g, "7")
    .replace(/Digit8/g, "8")
    .replace(/Digit9/g, "9")
    .replace(/Key([A-Z])/g, "$1")
    .replace(/\s+\+/g, " +")
    .trim();
}

function setupEventListeners() {
  elements.globalSpeed.addEventListener("input", () => {
    const speed = parseFloat(elements.globalSpeed.value);
    if (!isNaN(speed)) {
      const clampedSpeed = Math.min(Math.max(speed, 0.25), 8.0);
      elements.globalSpeedValue.textContent = clampedSpeed.toFixed(2) + "x";
      sendSettingsUpdate({ defaultSpeed: clampedSpeed });
    }
  });

  elements.domainSpeed.addEventListener("input", () => {
    const speed = parseFloat(elements.domainSpeed.value);
    if (!isNaN(speed)) {
      const clampedSpeed = Math.min(Math.max(speed, 0.25), 8.0);
      elements.domainSpeedValue.textContent = clampedSpeed.toFixed(2) + "x";
      const domainSettings = {};
      domainSettings[currentDomain] = { speed: clampedSpeed };
      sendSettingsUpdate({ domainSettings });
    }
  });

  elements.autoApply.addEventListener("change", () => {
    sendSettingsUpdate({ autoApply: elements.autoApply.checked });
  });

  elements.overlayVisible.addEventListener("change", () => {
    sendSettingsUpdate({ overlayVisible: elements.overlayVisible.checked });
  });

  elements.saveSettings.addEventListener("click", saveSettings);

  elements.resetDomain.addEventListener("click", resetDomainSettings);

  elements.editButtons.forEach((button) => {
    button.addEventListener("click", startKeyCapture);
  });

  elements.themeAuto.addEventListener("change", applyTheme);
}

async function saveSettings() {
  try {
    const globalSpeed = parseFloat(elements.globalSpeed.value);
    const domainSpeed = parseFloat(elements.domainSpeed.value);

    if (isNaN(globalSpeed) || isNaN(domainSpeed)) {
      showConfirmation("Invalid speed values", true);
      return;
    }

    const clampedGlobalSpeed = Math.min(Math.max(globalSpeed, 0.25), 8.0);
    const clampedDomainSpeed = Math.min(Math.max(domainSpeed, 0.25), 8.0);

    settings.defaultSpeed = clampedGlobalSpeed;
    settings.autoApply = elements.autoApply.checked;
    settings.theme = elements.themeAuto.checked ? "auto" : "light";
    settings.overlayVisible = elements.overlayVisible.checked;

    if (!settings.domainSettings[currentDomain]) {
      settings.domainSettings[currentDomain] = {};
    }
    settings.domainSettings[currentDomain].speed = clampedDomainSpeed;

    const response = await chrome.runtime.sendMessage({
      action: "saveSettings",
      settings: settings,
    });

    if (response && response.error) {
      throw new Error(response.error);
    }

    showConfirmation("Settings saved successfully!");

    refreshContentScriptSettings();
  } catch (error) {
    console.error("Failed to save settings:", error);
    showConfirmation("Failed to save settings: " + error.message, true);
  }
}

function resetDomainSettings() {
  elements.domainSpeed.value = settings.defaultSpeed;
  elements.domainSpeedValue.textContent =
    settings.defaultSpeed.toFixed(2) + "x";

  if (settings.domainSettings[currentDomain]) {
    delete settings.domainSettings[currentDomain];
  }

  showConfirmation("Domain settings reset");
}

function startKeyCapture(e) {
  const button = e.target;
  const input = button.previousElementSibling;
  const action = input.dataset.action;

  input.placeholder = "Press keys...";
  input.value = "";
  button.disabled = true;

  const keyHandler = (event) => {
    event.preventDefault();

    let combo = "";
    if (event.ctrlKey) combo += "Ctrl";
    if (event.shiftKey) combo += "Shift";
    if (event.altKey) combo += "Alt";

    if (combo) combo += event.code;
    else combo = event.code;

    input.value = formatKeyCombo(combo);

    if (!settings.keyboardShortcuts) {
      settings.keyboardShortcuts = {};
    }
    settings.keyboardShortcuts[action] = combo;

    document.removeEventListener("keydown", keyHandler);
    input.placeholder = "Press edit to change";
    button.disabled = false;
  };

  document.addEventListener("keydown", keyHandler);
}

function applyTheme() {
  if (elements.themeAuto.checked) {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.body.classList.toggle("dark-theme", isDark);
  } else {
    document.body.classList.remove("dark-theme");
  }
}

async function refreshContentScriptSettings() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab && tab.id) {
      await chrome.tabs.sendMessage(tab.id, {
        action: "refreshSettings",
      });
    }
  } catch (error) {
    console.debug("Failed to refresh content script settings:", error);
  }
}

async function sendSettingsUpdate(updatedSettings) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab && tab.id) {
      await chrome.tabs.sendMessage(tab.id, {
        action: "updateSettings",
        settings: updatedSettings,
      });
    }
  } catch (error) {
    console.debug("Failed to send settings update to content script:", error);
  }
}

function showConfirmation(message, isError = false) {
  // Remove existing confirmation
  const existing = document.querySelector(".confirmation");
  if (existing) existing.remove();

  // Create confirmation element
  const confirmation = document.createElement("div");
  confirmation.className = `confirmation ${isError ? "error" : "success"}`;
  confirmation.textContent = message;

  // Style
  Object.assign(confirmation.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: isError ? "#ff6b6b" : "#4caf50",
    color: "white",
    padding: "10px 20px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: "1000",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    opacity: "0",
    transition: "opacity 0.3s",
  });

  document.body.appendChild(confirmation);

  // Animate in
  setTimeout(() => {
    confirmation.style.opacity = "1";
  }, 10);

  // Remove after delay
  setTimeout(() => {
    confirmation.style.opacity = "0";
    setTimeout(() => {
      if (confirmation.parentNode) {
        confirmation.parentNode.removeChild(confirmation);
      }
    }, 300);
  }, 2000);
}

// Listen for theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", applyTheme);
