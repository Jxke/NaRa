const DEFAULT_SETTINGS = {
  personalDetection: true,
  anthropomorphizationDetection: true,
  sycophanticResponseDetection: true
};

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day;
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatType(type) {
  if (type === "personal") {
    return "Personal";
  }

  if (type === "anthropomorphization") {
    return "Anthropomorphization";
  }

  return "Sycophancy";
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function setActiveTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === tabName);
  });

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === tabName);
  });
}

function renderOverview(history) {
  const total = history.length;
  const weekStart = startOfWeek(new Date());
  const weekly = history.filter((entry) => new Date(entry.timestamp) >= weekStart).length;
  const personal = history.filter((entry) => entry.type === "personal").length;
  const anthro = history.filter((entry) => entry.type === "anthropomorphization").length;
  const sycophantic = history.filter((entry) => entry.type === "sycophantic").length;

  document.getElementById("totalInterventions").textContent = String(total);
  document.getElementById("weeklySummary").textContent = `${weekly} intervention${weekly === 1 ? "" : "s"} this week`;
  document.getElementById("personalCount").textContent = String(personal);
  document.getElementById("anthroCount").textContent = String(anthro);
  document.getElementById("sycophanticCount").textContent = String(sycophantic);
}

function renderActivity(history) {
  const activityList = document.getElementById("activityList");
  activityList.innerHTML = "";

  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No interventions logged yet.";
    activityList.append(empty);
    return;
  }

  history.forEach((entry) => {
    const item = document.createElement("article");
    const activityClass = entry.type === "personal"
      ? "is-personal"
      : entry.type === "anthropomorphization"
        ? "is-anthro"
        : "is-sycophantic";
    item.className = `activity-item ${activityClass}`;

    const type = document.createElement("p");
    type.className = "activity-type";
    const glyph = entry.type === "personal"
      ? "◯"
      : entry.type === "anthropomorphization"
        ? "◇"
        : "☒";
    type.textContent = `${glyph} ${formatType(entry.type)}`;

    const preview = document.createElement("p");
    preview.className = "activity-preview";
    preview.textContent = entry.preview;

    const meta = document.createElement("p");
    meta.className = "activity-meta";
    meta.textContent = formatTime(entry.timestamp);

    item.append(type, preview, meta);
    activityList.append(item);
  });
}

async function saveSettings(settings) {
  await chrome.runtime.sendMessage({ type: "nara:save-settings", settings });
}

async function loadState() {
  const state = await chrome.runtime.sendMessage({ type: "nara:get-state" });
  return {
    settings: { ...DEFAULT_SETTINGS, ...(state?.settings || {}) },
    history: state?.history || []
  };
}

async function initializePopup() {
  const { settings, history } = await loadState();

  renderOverview(history);
  renderActivity(history);

  const personalToggle = document.getElementById("personalToggle");
  const anthroToggle = document.getElementById("anthroToggle");
  const sycophanticToggle = document.getElementById("sycophanticToggle");

  personalToggle.checked = settings.personalDetection;
  anthroToggle.checked = settings.anthropomorphizationDetection;
  sycophanticToggle.checked = settings.sycophanticResponseDetection;

  personalToggle.addEventListener("change", () => {
    saveSettings({ personalDetection: personalToggle.checked });
  });

  anthroToggle.addEventListener("change", () => {
    saveSettings({ anthropomorphizationDetection: anthroToggle.checked });
  });

  sycophanticToggle.addEventListener("change", () => {
    saveSettings({ sycophanticResponseDetection: sycophanticToggle.checked });
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });

  document.getElementById("clearBadgeButton").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "nara:clear-badge" });
    const clearedState = await loadState();
    renderOverview(clearedState.history);
    renderActivity(clearedState.history);
  });
}

initializePopup();
