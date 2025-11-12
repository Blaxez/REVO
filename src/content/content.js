const videoElements = new WeakMap();
let trackedVideos = [];
let currentVideo = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let currentDomain = window.location.hostname;

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function isValidVideo(video) {
  if (!document.contains(video)) return false;

  if (video.offsetWidth === 0 && video.offsetHeight === 0) return false;

  if (video.webkitKeys || video.mozKeys) return false;

  return true;
}

let settings = {
  defaultSpeed: 1.0,
  theme: "auto",
  keyboardShortcuts: {
    up: "",
    down: "",
    reset: "CtrlShiftDigit0",
    fineUp: "CtrlShiftArrowUp",
    fineDown: "CtrlShiftArrowDown",
    toggleOverlay: "",
    focusVideo: "CtrlShiftKeyX",
    fullscreen: "",
  },
  overlayVisible: true,
  autoApply: false,
  domainSettings: {},
  lastUsedSpeed: 1.0,
};

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      "defaultSpeed",
      "theme",
      "keyboardShortcuts",
      "autoApply",
      "domainSettings",
    ]);

    settings = {
      ...settings,
      ...result,
    };

    const localResult = await chrome.storage.local.get([
      "overlayVisible",
      "lastUsedSpeed",
    ]);

    settings = {
      ...settings,
      ...localResult,
    };
  } catch (error) {
    console.warn("Failed to load settings:", error);
  }
}

async function saveSettings() {
  try {
    if (!chrome.runtime?.id) {
      console.warn("Extension context invalidated, skipping save");
      return;
    }

    await chrome.storage.sync.set({
      defaultSpeed: settings.defaultSpeed,
      theme: settings.theme,
      keyboardShortcuts: settings.keyboardShortcuts,
      autoApply: settings.autoApply,
      domainSettings: settings.domainSettings,
    });

    await chrome.storage.local.set({
      overlayVisible: settings.overlayVisible,
      lastUsedSpeed: settings.lastUsedSpeed,
    });
  } catch (error) {
    if (
      error.message &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn("Extension context invalidated, skipping save");
      return;
    }
    console.warn("Failed to save settings:", error);
  }
}

function getDomainSettings() {
  return settings.domainSettings[currentDomain] || {};
}

function applySpeed(video, speed) {
  speed = Math.min(Math.max(speed, 0.25), 8.0);

  try {
    if (speed > 5.0) {
      console.log(`Setting high speed: ${speed}x`);
    }

    video.playbackRate = speed;
    settings.lastUsedSpeed = speed;
    saveSettings();

    const overlayData = videoElements.get(video);
    if (overlayData && overlayData.overlay) {
      updateSpeedDisplay(overlayData.overlay, speed);
    }
  } catch (error) {
    if (
      error.message &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn("Extension context invalidated, skipping speed apply");
      return;
    }
    console.warn("Failed to apply speed:", error);
    try {
      video.playbackRate = 1.0;
      settings.lastUsedSpeed = 1.0;
    } catch (resetError) {
      console.warn("Failed to reset speed:", resetError);
    }
  }
}

function updateSpeedDisplay(overlay, speed) {
  const speedDisplay = overlay.querySelector(".speed-value");
  if (speedDisplay) {
    speedDisplay.textContent = speed.toFixed(2) + "x";
  }
}

function updateAllOverlaySpeedDisplays() {
  for (const video of trackedVideos) {
    if (document.contains(video) && videoElements.has(video)) {
      const overlayData = videoElements.get(video);
      if (overlayData && overlayData.overlay) {
        updateSpeedDisplay(overlayData.overlay, video.playbackRate);
      }
    }
  }
}

function applySpeedToAllVideos() {
  for (const video of trackedVideos) {
    if (document.contains(video)) {
      const domainSettings = settings.domainSettings[currentDomain] || {};
      const domainSpeed = domainSettings.speed;

      let newSpeed = settings.defaultSpeed;
      if (domainSpeed && settings.autoApply) {
        newSpeed = domainSpeed;
      }

      applySpeed(video, newSpeed);
    }
  }
}

function createOverlay(video) {
  // Check if overlay already exists
  if (videoElements.has(video)) {
    return null;
  }

  // Create overlay container
  const overlay = document.createElement("div");
  overlay.className = "smart-speed-overlay";

  // Set initial position from settings
  const domainSettings = getDomainSettings();
  const position = domainSettings.position || { x: 10, y: 10 };

  overlay.style.left = position.x + "px";
  overlay.style.top = position.y + "px";

  // Create overlay content
  overlay.innerHTML = `
    <div class="overlay-header"></div>
    <div class="overlay-content">
      <button class="speed-btn decrease-btn">-</button>
      <div class="speed-display">
        <span class="speed-value">1.00x</span>
      </div>
      <button class="speed-btn increase-btn">+</button>
    </div>
  `;

  const decreaseBtn = overlay.querySelector(".decrease-btn");
  const increaseBtn = overlay.querySelector(".increase-btn");
  const speedDisplay = overlay.querySelector(".speed-value");
  const header = overlay.querySelector(".overlay-header");

  decreaseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const newSpeed = video.playbackRate - 0.25;
    applySpeed(video, newSpeed);
    showToast(`Speed: ${newSpeed.toFixed(2)}x`);
  });

  increaseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const newSpeed = video.playbackRate + 0.25;
    applySpeed(video, newSpeed);
    showToast(`Speed: ${newSpeed.toFixed(2)}x`);
  });

  speedDisplay.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    applySpeed(video, 1.0);
    showToast("Speed reset to 1.00x");
  });

  header.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stopDrag);

  header.addEventListener("touchstart", handleTouchStart);
  document.addEventListener("touchmove", handleTouchMove);
  document.addEventListener("touchend", handleTouchEnd);

  videoElements.set(video, { overlay, position });

  updateSpeedDisplay(overlay, video.playbackRate);

  return overlay;
}

function startDrag(e) {
  isDragging = true;
  const overlay = this.closest(".smart-speed-overlay");
  const rect = overlay.getBoundingClientRect();

  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;

  overlay.style.cursor = "grabbing";
  e.preventDefault();
}

function drag(e) {
  if (!isDragging) return;

  const overlay =
    document.querySelector(".smart-speed-overlay.dragging") ||
    document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest(".smart-speed-overlay");

  if (!overlay) return;

  overlay.classList.add("dragging");

  const x = e.clientX - dragOffset.x;
  const y = e.clientY - dragOffset.y;

  const maxX = window.innerWidth - overlay.offsetWidth;
  const maxY = window.innerHeight - overlay.offsetHeight;

  overlay.style.left = Math.max(0, Math.min(x, maxX)) + "px";
  overlay.style.top = Math.max(0, Math.min(y, maxY)) + "px";

  saveOverlayPosition(overlay);
}

function stopDrag() {
  isDragging = false;
  const overlay = document.querySelector(".smart-speed-overlay.dragging");
  if (overlay) {
    overlay.classList.remove("dragging");
    overlay.style.cursor = "move";
  }
}

function handleTouchStart(e) {
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent("mousedown", {
    clientX: touch.clientX,
    clientY: touch.clientY,
  });
  this.dispatchEvent(mouseEvent);
  e.preventDefault();
}

function handleTouchMove(e) {
  if (!isDragging) return;
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent("mousemove", {
    clientX: touch.clientX,
    clientY: touch.clientY,
  });
  document.dispatchEvent(mouseEvent);
  e.preventDefault();
}

function handleTouchEnd(e) {
  const mouseEvent = new MouseEvent("mouseup", {});
  document.dispatchEvent(mouseEvent);
  e.preventDefault();
}

function saveOverlayPosition(overlay) {
  const rect = overlay.getBoundingClientRect();
  const position = {
    x: rect.left,
    y: rect.top,
  };

  for (const [video, data] of videoElements.entries()) {
    if (data.overlay === overlay) {
      data.position = position;
      break;
    }
  }

  if (!settings.domainSettings[currentDomain]) {
    settings.domainSettings[currentDomain] = {};
  }
  settings.domainSettings[currentDomain].position = position;
  saveSettings();
}

function showToast(message) {
  const existingToast = document.querySelector(".speed-toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "speed-toast";
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 1500);
}

function injectOverlay(video) {
  // Skip if already processed
  if (videoElements.has(video)) return;

  // Skip protected videos
  if (video.webkitKeys || video.mozKeys) {
    console.log("Skipping protected video");
    return;
  }

  // Track this video for iteration
  trackedVideos.push(video);

  // Create overlay
  const overlay = createOverlay(video);
  if (!overlay) {
    // If overlay creation failed, remove from tracked videos
    const index = trackedVideos.indexOf(video);
    if (index > -1) {
      trackedVideos.splice(index, 1);
    }
    return;
  }

  try {
    // Try to find a suitable parent container
    let container = video.parentElement;

    // Look for a container that can hold our overlay
    while (container && container !== document.body) {
      const position = window.getComputedStyle(container).position;
      if (
        position === "relative" ||
        position === "absolute" ||
        position === "fixed"
      ) {
        break;
      }
      container = container.parentElement;
    }

    if (!container || container === document.body) {
      container = document.body;
      overlay.style.position = "fixed";
    } else {
      overlay.style.position = "absolute";
    }

    container.appendChild(overlay);

    const domainSettings = getDomainSettings();
    if (domainSettings.speed && settings.autoApply) {
      applySpeed(video, domainSettings.speed);
    } else if (settings.lastUsedSpeed !== 1.0) {
      applySpeed(video, settings.lastUsedSpeed);
    }
  } catch (error) {
    console.warn("Failed to inject overlay for video:", error);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    videoElements.delete(video);
  }
}

function scanForVideos() {
  const videos = findAllVideos();

  videos.forEach((video) => {
    if (!isValidVideo(video)) return;

    if (videoElements.has(video)) return;

    injectOverlay(video);

    video.addEventListener("ratechange", () => {
      const overlayData = videoElements.get(video);
      if (overlayData && overlayData.overlay) {
        updateSpeedDisplay(overlayData.overlay, video.playbackRate);
      }
    });

    let lastTime = 0;
    let timeStutterCount = 0;
    video.addEventListener("timeupdate", () => {
      if (video.playbackRate > 5.0) {
        const currentTime = video.currentTime;
        if (currentTime < lastTime - 1.0 && lastTime > 0) {
          timeStutterCount++;
          if (timeStutterCount > 3) {
            console.warn(
              "Potential video looping detected at high speed:",
              video.playbackRate + "x"
            );
            timeStutterCount = 0;
          }
        } else {
          timeStutterCount = 0;
        }
        lastTime = currentTime;
      } else {
        lastTime = 0;
        timeStutterCount = 0;
      }
    });
  });
}

function findAllVideos() {
  const videos = [];

  document.querySelectorAll("video").forEach((video) => {
    videos.push(video);
  });

  findAllShadowVideos(document, videos);

  return videos;
}

function findAllShadowVideos(node, videos) {
  try {
    if (node.shadowRoot) {
      node.shadowRoot.querySelectorAll("video").forEach((video) => {
        videos.push(video);
      });

      const shadowChildren = node.shadowRoot.querySelectorAll("*");
      shadowChildren.forEach((child) => {
        findAllShadowVideos(child, videos);
      });
    }

    const children = node.children || [];
    for (let i = 0; i < children.length; i++) {
      findAllShadowVideos(children[i], videos);
    }
  } catch (error) {
    if (!error.message.includes("cross-origin")) {
      console.warn("Error finding shadow videos:", error);
    }
  }
}

function handleKeyDown(e) {
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target.isContentEditable
  ) {
    return;
  }

  const video = currentVideo || document.querySelector("video");
  if (!video) return;

  let handled = false;
  let newSpeed = video.playbackRate;
  let message = "";

  const keyCombo = `${e.shiftKey ? "Shift" : ""}${e.altKey ? "Alt" : ""}$${
    e.ctrlKey ? "Ctrl" : ""
  }${e.code}`;

  if (keyCombo === settings.keyboardShortcuts.up) {
    newSpeed = Math.min(video.playbackRate + 0.25, 8.0);
    message = `Speed: ${newSpeed.toFixed(2)}x`;
    handled = true;
  } else if (keyCombo === settings.keyboardShortcuts.down) {
    newSpeed = Math.max(video.playbackRate - 0.25, 0.25);
    message = `Speed: ${newSpeed.toFixed(2)}x`;
    handled = true;
  } else if (keyCombo === settings.keyboardShortcuts.reset) {
    newSpeed = 1.0;
    message = "Speed reset to 1.00x";
    handled = true;
  } else if (keyCombo === settings.keyboardShortcuts.fineUp) {
    newSpeed = Math.min(video.playbackRate + 0.05, 8.0);
    message = `Speed: ${newSpeed.toFixed(2)}x`;
    handled = true;
  } else if (keyCombo === settings.keyboardShortcuts.fineDown) {
    newSpeed = Math.max(video.playbackRate - 0.05, 0.25);
    message = `Speed: ${newSpeed.toFixed(2)}x`;
    handled = true;
  } else if (keyCombo === settings.keyboardShortcuts.toggleOverlay) {
    toggleOverlays();
    message = `Overlays ${settings.overlayVisible ? "shown" : "hidden"}`;
    handled = true;
  }

  if (handled) {
    applySpeed(video, newSpeed);
    showToast(message);
    e.preventDefault();
    e.stopPropagation();
  }
}

// Toggle overlay visibility
function toggleOverlays() {
  settings.overlayVisible = !settings.overlayVisible;
  saveSettings();

  // Update all overlays
  updateOverlaysVisibility();
}

// Update overlays visibility based on settings
function updateOverlaysVisibility() {
  try {
    // Update all overlays
    // Fix: WeakMap is not iterable, so we need to use a different approach
    // We'll track videos in an array to make them iterable
    for (const video of trackedVideos) {
      // Check if video is still in the document and in our WeakMap
      if (document.contains(video) && videoElements.has(video)) {
        const overlayData = videoElements.get(video);
        if (overlayData && overlayData.overlay) {
          overlayData.overlay.style.display = settings.overlayVisible
            ? "block"
            : "none";
        }
      }
    }
  } catch (error) {
    console.warn("Failed to update overlays visibility:", error);
  }
}

// Mutation observer for dynamic content
const observer = new MutationObserver(
  debounce(() => {
    scanForVideos();
  }, 300)
);

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

let initialized = false;

async function init() {
  if (initialized) return;
  initialized = true;

  await loadSettings();

  const debouncedScan = debounce(scanForVideos, 300);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  scanForVideos();

  document.addEventListener("keydown", handleKeyDown);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateSettings") {
      settings = {
        ...settings,
        ...message.settings,
      };

      if (
        message.settings.defaultSpeed !== undefined ||
        message.settings.domainSettings !== undefined
      ) {
        applySpeedToAllVideos();
      }

      updateOverlaysVisibility();

      sendResponse({ success: true });
      return true;
    } else if (message.action === "refreshSettings") {
      loadSettings().then(() => {
        applySpeedToAllVideos();
        updateOverlaysVisibility();
        sendResponse({ success: true });
      });
      return true;
    }
  });

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      currentDomain = new URL(url).hostname;
      setTimeout(() => debouncedScan(), 1000);
    }
  }).observe(document, { subtree: true, childList: true });
}

function cleanup() {
  for (const video of trackedVideos) {
    if (videoElements.has(video)) {
      const overlayData = videoElements.get(video);
      if (
        overlayData &&
        overlayData.overlay &&
        overlayData.overlay.parentNode
      ) {
        overlayData.overlay.parentNode.removeChild(overlayData.overlay);
      }
    }
  }

  videoElements = new WeakMap();
  trackedVideos = [];

  document.removeEventListener("keydown", handleKeyDown);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

window.addEventListener("beforeunload", cleanup);
