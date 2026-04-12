const STORAGE_KEYS = {
  settings: "naraSettings",
  history: "naraHistory",
  badgeCount: "naraBadgeCount"
};

const DEFAULT_SETTINGS = {
  personalDetection: true,
  anthropomorphizationDetection: true,
  sycophanticResponseDetection: true
};

async function readState() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.settings,
    STORAGE_KEYS.history,
    STORAGE_KEYS.badgeCount
  ]);

  return {
    settings: { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] || {}) },
    history: Array.isArray(stored[STORAGE_KEYS.history]) ? stored[STORAGE_KEYS.history] : [],
    badgeCount: Number.isFinite(stored[STORAGE_KEYS.badgeCount]) ? stored[STORAGE_KEYS.badgeCount] : 0
  };
}

async function setBadge(count) {
  const text = count > 0 ? String(Math.min(count, 999)) : "";
  await chrome.action.setBadgeBackgroundColor({ color: "#d9485f" });
  await chrome.action.setBadgeText({ text });
}

async function initialize() {
  const state = await readState();
  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: state.settings,
    [STORAGE_KEYS.history]: state.history,
    [STORAGE_KEYS.badgeCount]: state.badgeCount
  });
  await setBadge(state.badgeCount);
}

chrome.runtime.onInstalled.addListener(() => {
  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  initialize();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "nara:get-state") {
    readState().then(sendResponse);
    return true;
  }

  if (message?.type === "nara:save-settings") {
    readState()
      .then(async (state) => {
        const nextSettings = { ...state.settings, ...(message.settings || {}) };
        await chrome.storage.local.set({ [STORAGE_KEYS.settings]: nextSettings });
        return { ok: true, settings: nextSettings };
      })
      .then(sendResponse);
    return true;
  }

  if (message?.type === "nara:log-intervention") {
    readState()
      .then(async (state) => {
        const entry = {
          id: crypto.randomUUID(),
          type: message.entry?.type || "unknown",
          preview: message.entry?.preview || "",
          fullMessage: message.entry?.fullMessage || "",
          timestamp: message.entry?.timestamp || new Date().toISOString()
        };
        const history = [entry, ...state.history].slice(0, 100);
        const badgeCount = state.badgeCount + 1;

        await chrome.storage.local.set({
          [STORAGE_KEYS.history]: history,
          [STORAGE_KEYS.badgeCount]: badgeCount
        });
        await setBadge(badgeCount);
        return { ok: true, entry, badgeCount, history };
      })
      .then(sendResponse);
    return true;
  }

  if (message?.type === "nara:clear-badge") {
    chrome.storage.local
      .set({
        [STORAGE_KEYS.badgeCount]: 0,
        [STORAGE_KEYS.history]: []
      })
      .then(() => setBadge(0))
      .then(() => sendResponse({ ok: true, history: [] }));
    return true;
  }

  if (message?.type === "nara:close-tab") {
    const tabId = sender?.tab?.id;

    if (typeof tabId !== "number") {
      sendResponse({ ok: false });
      return false;
    }

    chrome.tabs.remove(tabId).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
