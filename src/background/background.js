const DEFAULT_SETTINGS = {
  defaultSpeed: 1.0,
  theme: "auto",
  keyboardShortcuts: {
    up: "",
    down: "",
    reset: "CtrlShiftDigit0",
    fineUp: "ShiftAltArrowUp",
    fineDown: "ShiftAltArrowDown",
    toggleOverlay: "",
    focusVideo: "CtrlShiftKeyX",
    fullscreen: "",
  },
  overlayVisible: true,
  autoApply: false,
  domainSettings: {},
  lastUsedSpeed: 1.0,
};

chrome.runtime.onInstalled.addListener(() => {
  initializeSettings();
});

async function initializeSettings() {
  try {
    const result = await chrome.storage.sync.get(null);

    if (Object.keys(result).length === 0) {
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
      await chrome.storage.local.set({
        overlayVisible: DEFAULT_SETTINGS.overlayVisible,
        lastUsedSpeed: DEFAULT_SETTINGS.lastUsedSpeed,
      });
    }
  } catch (error) {
    console.error("Failed to initialize settings:", error);
  }
}

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "keyboardShortcut",
        command: command,
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    sendResponse({ error: "Invalid message format" });
    return true;
  }

  if (message.action === "getSettings") {
    getSettings().then((settings) => {
      sendResponse({ settings });
    });
    return true;
  } else if (message.action === "saveSettings") {
    if (!message.settings) {
      sendResponse({ success: false, error: "No settings provided" });
      return true;
    }
    saveSettings(message.settings).then(() => {
      sendResponse({ success: true });
    });
    return true;
  } else {
    sendResponse({ error: "Unknown action: " + message.action });
    return true;
  }
});

async function getSettings() {
  try {
    const syncSettings = await chrome.storage.sync.get(null);
    const localSettings = await chrome.storage.local.get([
      "overlayVisible",
      "lastUsedSpeed",
    ]);

    return {
      ...syncSettings,
      ...localSettings,
    };
  } catch (error) {
    console.error("Failed to get settings:", error);
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings) {
  try {
    const syncSettings = { ...settings };
    const localSettings = {};

    if ("overlayVisible" in settings) {
      localSettings.overlayVisible = settings.overlayVisible;
      delete syncSettings.overlayVisible;
    }

    if ("lastUsedSpeed" in settings) {
      localSettings.lastUsedSpeed = settings.lastUsedSpeed;
      delete syncSettings.lastUsedSpeed;
    }

    if (Object.keys(syncSettings).length > 0) {
      await chrome.storage.sync.set(syncSettings);
    }

    if (Object.keys(localSettings).length > 0) {
      await chrome.storage.local.set(localSettings);
    }
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload();
});

chrome.runtime.onStartup.addListener(() => {});
