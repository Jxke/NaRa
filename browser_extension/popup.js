const DEFAULT_SETTINGS = {
  personalDetection: true,
  anthropomorphizationDetection: true
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
  return type === "personal" ? "Personal" : "Anthropomorphization";
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

  document.getElementById("totalInterventions").textContent = String(total);
  document.getElementById("weeklySummary").textContent = `${weekly} intervention${weekly === 1 ? "" : "s"} this week`;
  document.getElementById("personalCount").textContent = String(personal);
  document.getElementById("anthroCount").textContent = String(anthro);
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
    item.className = "activity-item";

    const type = document.createElement("p");
    type.className = "activity-type";
    type.textContent = `${entry.type === "personal" ? "◌" : "△"} ${formatType(entry.type)}`;

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

async function initializePopup() {
  const state = await chrome.runtime.sendMessage({ type: "nara:get-state" });
  const settings = { ...DEFAULT_SETTINGS, ...(state?.settings || {}) };
  const history = state?.history || [];

  renderOverview(history);
  renderActivity(history);

  const personalToggle = document.getElementById("personalToggle");
  const anthroToggle = document.getElementById("anthroToggle");

  personalToggle.checked = settings.personalDetection;
  anthroToggle.checked = settings.anthropomorphizationDetection;

  personalToggle.addEventListener("change", () => {
    saveSettings({ personalDetection: personalToggle.checked });
  });

  anthroToggle.addEventListener("change", () => {
    saveSettings({ anthropomorphizationDetection: anthroToggle.checked });
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });

  document.getElementById("clearBadgeButton").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "nara:clear-badge" });
  });
}

initializePopup();
