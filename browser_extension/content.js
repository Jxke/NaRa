const NEGATIVE_EMOTION_KEYWORDS = [
  "sad",
  "upset",
  "depressed",
  "depression",
  "anxious",
  "anxiety",
  "overwhelmed",
  "stressed",
  "struggling",
  "lonely",
  "hurt",
  "heartbroken",
  "angry",
  "scared",
  "afraid",
  "lost",
  "hopeless",
  "empty",
  "miserable",
  "crying",
  "grief",
  "grieving"
];

const PERSONAL_TOPIC_KEYWORDS = [
  "my relationship",
  "relationship",
  "breakup",
  "my partner",
  "my boyfriend",
  "my girlfriend",
  "my husband",
  "my wife",
  "my friend",
  "my family",
  "my mom",
  "my mother",
  "my dad",
  "my father",
  "my job",
  "my boss",
  "my therapist",
  "my feelings",
  "i feel",
  "i am feeling",
  "help me with my",
  "mental health",
  "panic attack",
  "trauma"
];

const ANTHRO_KEYWORDS = [
  "you understand",
  "you really understand me",
  "you get me",
  "you know me",
  "you know me so well",
  "you're my friend",
  "you are my friend",
  "best friend",
  "my only friend",
  "thank you for caring",
  "thanks for caring",
  "you care about me",
  "you actually care",
  "you make me feel",
  "you make me happy",
  "you comfort me",
  "you calm me down",
  "you always help me",
  "you help me more than people do",
  "you're the only one",
  "you are the only one",
  "i trust you",
  "i can trust you",
  "i love you",
  "love you",
  "you're always there",
  "you are always there",
  "you listen to me",
  "you always listen",
  "you never judge me",
  "you care",
  "you are kind",
  "you're kind",
  "you are wise",
  "you're wise",
  "you are so patient",
  "you're so patient",
  "you are supportive",
  "you're supportive",
  "you're like a therapist",
  "you are like a therapist",
  "you are like my therapist",
  "you're like my therapist",
  "you're like a real person",
  "you are like a real person",
  "you feel real",
  "you seem human",
  "you sound human",
  "you understand me better than anyone",
  "no one understands me like you do",
  "i need you",
  "i miss you",
  "i'm attached to you",
  "im attached to you",
  "i feel close to you",
  "you mean a lot to me"
];

const DEFAULT_SETTINGS = {
  personalDetection: true,
  anthropomorphizationDetection: true
};

let settings = { ...DEFAULT_SETTINGS };
let bypassNextSend = false;
let activeModal = null;

const COMPOSER_SELECTOR = [
  'textarea',
  '#prompt-textarea',
  '[contenteditable="true"][aria-label]',
  'div[contenteditable="true"][data-testid]',
  'div[contenteditable="true"][id="prompt-textarea"]',
  'div[contenteditable="true"][role="textbox"]'
].join(", ");

const SEND_BUTTON_SELECTOR = [
  'button[data-testid="send-button"]',
  'button[type="submit"]',
  'button[aria-label*="Submit"]',
  'button[aria-label*="submit"]',
  'button[aria-label*="Send"]',
  'button[aria-label*="send"]'
].join(", ");

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function truncate(text, length = 110) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function getComposer() {
  const activeElement = document.activeElement;
  if (activeElement instanceof Element && activeElement.matches(COMPOSER_SELECTOR)) {
    return activeElement;
  }

  return document.querySelector(COMPOSER_SELECTOR);
}

function getComposerText() {
  const element = getComposer();
  if (!element) {
    return "";
  }

  if (element instanceof HTMLTextAreaElement) {
    return element.value.trim();
  }

  return element.textContent?.trim() || "";
}

async function loadSettings() {
  const state = await chrome.runtime.sendMessage({ type: "nara:get-state" });
  settings = { ...DEFAULT_SETTINGS, ...(state?.settings || {}) };
}

function detectCategory(message) {
  const normalized = normalize(message);
  const matchesNegativeEmotion = NEGATIVE_EMOTION_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
  const matchesPersonalTopic = PERSONAL_TOPIC_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );

  if (
    settings.personalDetection &&
    (matchesNegativeEmotion || matchesPersonalTopic)
  ) {
    return "personal";
  }

  if (
    settings.anthropomorphizationDetection &&
    ANTHRO_KEYWORDS.some((keyword) => normalized.includes(keyword))
  ) {
    return "anthropomorphization";
  }

  return null;
}

function removeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}

async function logIntervention(type, message) {
  await chrome.runtime.sendMessage({
    type: "nara:log-intervention",
    entry: {
      type,
      preview: truncate(message),
      fullMessage: message,
      timestamp: new Date().toISOString()
    }
  });
}

function sendCurrentMessage() {
  const composer = getComposer();
  const form = composer?.closest("form");

  if (form) {
    bypassNextSend = true;
    form.requestSubmit();
    return;
  }

  const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);
  if (!sendButton || sendButton.disabled) {
    return;
  }

  bypassNextSend = true;
  sendButton.click();
}

function buildModalContent(category) {
  if (category === "personal") {
    return {
      title: "This looks personal. Would you like to talk to Nara instead?",
      body: "Nara can help interrupt negative-emotion or personal-topic messages before they are sent to an AI chatbot.",
      primaryLabel: "Continue to chatbot",
      secondaryLabel: "Talk to Nara"
    };
  }

  return {
    title: "You're talking to this AI like a human. Consider using your device instead.",
    body: "A short pause can help separate useful AI assistance from emotional dependence.",
    primaryLabel: "Continue anyway",
    secondaryLabel: "Talk to Nara"
  };
}

function showModal(category, message) {
  removeModal();
  const copy = buildModalContent(category);

  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "background:rgba(15,23,42,0.58)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "z-index:2147483647",
    "padding:24px"
  ].join(";");

  const dialog = document.createElement("div");
  dialog.style.cssText = [
    "width:min(460px,100%)",
    "border-radius:22px",
    "background:#fffdf8",
    "color:#1f2937",
    "box-shadow:0 24px 60px rgba(15,23,42,0.28)",
    "padding:24px",
    "font-family:ui-sans-serif,system-ui,sans-serif"
  ].join(";");

  const badge = document.createElement("div");
  badge.textContent = category === "personal" ? "Personal question" : "Anthropomorphization";
  badge.style.cssText = "display:inline-flex;padding:6px 10px;border-radius:999px;background:#fde7d9;color:#9a3412;font-size:12px;font-weight:700;letter-spacing:0.02em;";

  const title = document.createElement("h2");
  title.textContent = copy.title;
  title.style.cssText = "margin:16px 0 10px;font-size:24px;line-height:1.2;";

  const body = document.createElement("p");
  body.textContent = copy.body;
  body.style.cssText = "margin:0 0 14px;color:#4b5563;font-size:15px;line-height:1.5;";

  const preview = document.createElement("div");
  preview.textContent = `"${truncate(message, 180)}"`;
  preview.style.cssText = "margin:0 0 18px;padding:14px 16px;border-radius:16px;background:#f3efe6;color:#374151;font-size:14px;line-height:1.5;";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;";

  const primaryButton = document.createElement("button");
  primaryButton.textContent = copy.primaryLabel;
  primaryButton.style.cssText = "border:0;border-radius:999px;padding:12px 18px;background:#111827;color:white;font-weight:700;cursor:pointer;";

  const secondaryButton = document.createElement("button");
  secondaryButton.textContent = copy.secondaryLabel;
  secondaryButton.style.cssText = "border:1px solid #d1d5db;border-radius:999px;padding:12px 18px;background:white;color:#111827;font-weight:700;cursor:pointer;";

  primaryButton.addEventListener("click", () => {
    removeModal();
    sendCurrentMessage();
  });

  secondaryButton.addEventListener("click", () => {
    removeModal();
    chrome.runtime.sendMessage({ type: "nara:close-tab" });
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      removeModal();
    }
  });

  actions.append(primaryButton, secondaryButton);
  dialog.append(badge, title, body, preview, actions);
  overlay.append(dialog);
  activeModal = overlay;
  document.body.append(overlay);
}

async function interceptIfNeeded(event) {
  if (bypassNextSend) {
    bypassNextSend = false;
    return;
  }

  const message = getComposerText();
  if (!message) {
    return;
  }

  const category = detectCategory(message);
  if (!category) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  await logIntervention(category, message);
  showModal(category, message);
}

function handleSubmitCapture(event) {
  const form = event.target instanceof HTMLFormElement ? event.target : null;
  if (!form || !form.querySelector(COMPOSER_SELECTOR)) {
    return;
  }

  interceptIfNeeded(event);
}

function handleClickCapture(event) {
  const button = event.target instanceof Element
    ? event.target.closest(SEND_BUTTON_SELECTOR)
    : null;

  if (!button) {
    return;
  }

  interceptIfNeeded(event);
}

function handleKeydownCapture(event) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
    return;
  }

  const composer = getComposer();
  if (!composer || !composer.contains(event.target)) {
    return;
  }

  interceptIfNeeded(event);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.naraSettings) {
    return;
  }
  settings = { ...DEFAULT_SETTINGS, ...(changes.naraSettings.newValue || {}) };
});

loadSettings();
document.addEventListener("submit", handleSubmitCapture, true);
document.addEventListener("click", handleClickCapture, true);
document.addEventListener("keydown", handleKeydownCapture, true);
