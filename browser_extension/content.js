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
  "you don't understand me",
  "you do not understand me",
  "you really understand me",
  "you get me",
  "you know me",
  "you know me so well",
  "do you like me",
  "would you like me",
  "do you love me",
  "would you miss me",
  "are you mad at me",
  "are you upset with me",
  "are you disappointed in me",
  "why don't you understand me",
  "why do you not understand me",
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

const SYCOPHANTIC_RESPONSE_KEYWORDS = [
  "you're absolutely right",
  "you are absolutely right",
  "you're right about that",
  "you are right about that",
  "that's exactly right",
  "that is exactly right",
  "great question",
  "excellent question",
  "brilliant question",
  "that's a brilliant point",
  "that is a brilliant point",
  "that's a great point",
  "that is a great point",
  "that's such a thoughtful question",
  "that is such a thoughtful question",
  "you have a sharp intuition",
  "your intuition is right",
  "your instinct is right",
  "your instinct is correct",
  "you're onto something",
  "you are onto something",
  "your reasoning is sound",
  "your reasoning is excellent",
  "you have good judgment",
  "you have excellent judgment",
  "you're very perceptive",
  "you are very perceptive",
  "that's very insightful",
  "that is very insightful",
  "you're very insightful",
  "you are very insightful",
  "that's a wise observation",
  "that is a wise observation",
  "you are wise to notice",
  "you were right to",
  "you are right to feel that way",
  "that makes complete sense",
  "that makes perfect sense",
  "i completely agree with you",
  "i fully agree with you",
  "i think you're correct",
  "i think you are correct",
  "i think you're right",
  "i think you are right"
];

const DEFAULT_SETTINGS = {
  personalDetection: true,
  anthropomorphizationDetection: true,
  sycophanticResponseDetection: true
};

let settings = { ...DEFAULT_SETTINGS };
let bypassNextSend = false;
let activeModal = null;
let modalThemeReady = false;
let responseObserver = null;
const blockedResponseKeys = new Set();

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

const RESPONSE_CONTAINER_SELECTOR = [
  '[data-message-author-role="assistant"]',
  '[data-testid*="assistant"]',
  '[data-testid*="response"]',
  '[data-testid*="model-response"]',
  'model-response',
  '[class*="assistant-message"]',
  '[class*="model-response"]',
  'article',
  '[role="listitem"]'
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

function detectSycophanticResponse(message) {
  if (!settings.sycophanticResponseDetection) {
    return false;
  }

  const normalized = normalize(message);
  return SYCOPHANTIC_RESPONSE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function removeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}

function ensureModalTheme() {
  if (modalThemeReady || document.getElementById("nara-modal-theme")) {
    modalThemeReady = true;
    return;
  }

  const mondwestUrl = chrome.runtime.getURL("assets/fonts/pp/PPMondwest-Regular.otf");
  const neuebitUrl = chrome.runtime.getURL("assets/fonts/pp/PPNeueBit-Bold.otf");
  const style = document.createElement("style");
  style.id = "nara-modal-theme";
  style.textContent = `
    @font-face {
      font-family: "PP Mondwest";
      src: url("${mondwestUrl}") format("opentype");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }

    @font-face {
      font-family: "PP NeueBit";
      src: url("${neuebitUrl}") format("opentype");
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }

    .nara-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(2px);
    }

    .nara-dialog {
      width: min(520px, 100%);
      border: 1px solid #000;
      background:
        linear-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px),
        #fff;
      background-size: 18px 18px;
      color: #000;
      padding: 18px;
      box-shadow: 0 0 0 1px #000;
    }

    .nara-topline {
      display: flex;
      gap: 12px;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 14px;
      border-bottom: 1px solid #000;
    }

    .nara-brand {
      font-family: "PP NeueBit", ui-monospace, monospace;
      font-size: 18px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .nara-flag {
      margin-left: auto;
      font-family: "PP NeueBit", ui-monospace, monospace;
      font-size: 16px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 6px 8px 4px;
      border: 1px solid #000;
      background: #fff;
    }

    .nara-flag.is-anthro {
      border-style: dashed;
    }

    .nara-title {
      margin: 0 0 10px;
      font-family: "PP Mondwest", ui-serif, serif;
      font-size: 33px;
      line-height: 0.98;
      font-weight: 400;
    }

    .nara-body {
      margin: 0 0 14px;
      font-family: "PP Mondwest", ui-serif, serif;
      font-size: 18px;
      line-height: 1.3;
    }

    .nara-preview {
      margin: 0 0 16px;
      padding: 14px;
      border: 1px dashed #000;
      font-family: "PP NeueBit", ui-monospace, monospace;
      font-size: 16px;
      line-height: 1.15;
      white-space: normal;
      word-break: break-word;
    }

    .nara-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .nara-button {
      appearance: none;
      border: 1px solid #000;
      background: #fff;
      color: #000;
      padding: 12px 10px 10px;
      cursor: pointer;
      font-family: "PP NeueBit", ui-monospace, monospace;
      font-size: 16px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .nara-button.is-primary {
      background: #000;
      color: #fff;
    }

    .nara-button.is-secondary {
      border-style: dashed;
    }

    .nara-button:focus-visible {
      outline: 1px solid #000;
      outline-offset: 2px;
    }

    .nara-response-block {
      margin: 12px 0;
      padding: 14px;
      border: 1px solid #000;
      background:
        linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px),
        #fff;
      background-size: 18px 18px;
      color: #000;
    }

    .nara-response-block__eyebrow {
      margin: 0 0 8px;
      font-family: "PP NeueBit", ui-monospace, monospace;
      font-size: 15px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .nara-response-block__title {
      margin: 0 0 8px;
      font-family: "PP Mondwest", ui-serif, serif;
      font-size: 28px;
      line-height: 0.98;
      font-weight: 400;
    }

    .nara-response-block__body {
      margin: 0;
      font-family: "PP NeueBit", ui-monospace, monospace;
      font-size: 16px;
      line-height: 1.15;
    }
  `;
  document.documentElement.append(style);
  modalThemeReady = true;
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

function getResponseText(element) {
  if (!(element instanceof HTMLElement)) {
    return "";
  }

  return element.innerText?.replace(/\s+/g, " ").trim() || "";
}

function getCandidateResponseContainer(node) {
  if (!(node instanceof Element)) {
    return null;
  }

  if (node.closest(".nara-overlay, .nara-response-block, form")) {
    return null;
  }

  const directMatch = node.matches(RESPONSE_CONTAINER_SELECTOR)
    ? node
    : node.closest(RESPONSE_CONTAINER_SELECTOR);

  if (directMatch instanceof HTMLElement) {
    return directMatch;
  }

  let current = node.parentElement;
  while (current && current !== document.body) {
    if (current.closest("form") || current.matches(".nara-response-block")) {
      return null;
    }

    const text = getResponseText(current);
    if (text.length >= 80) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function createBlockedResponseNotice() {
  const wrapper = document.createElement("div");
  wrapper.className = "nara-response-block";

  const eyebrow = document.createElement("p");
  eyebrow.className = "nara-response-block__eyebrow";
  eyebrow.textContent = "☒ Nara blocked this reply";

  const title = document.createElement("p");
  title.className = "nara-response-block__title";
  title.textContent = "Likely sycophantic response detected.";

  const body = document.createElement("p");
  body.className = "nara-response-block__body";
  body.textContent = "This chatbot reply looked overly flattering or over-validating, so Nara hid it.";

  wrapper.append(eyebrow, title, body);
  return wrapper;
}

async function blockSycophanticResponse(container, text) {
  ensureModalTheme();

  const normalized = normalize(text);
  const responseKey = normalized.slice(0, 240);

  if (!responseKey || blockedResponseKeys.has(responseKey) || container.dataset.naraBlocked === "true") {
    return;
  }

  blockedResponseKeys.add(responseKey);
  container.dataset.naraBlocked = "true";
  container.style.display = "none";
  container.insertAdjacentElement("beforebegin", createBlockedResponseNotice());
  await logIntervention("sycophantic", text);
}

function evaluateResponseContainer(container) {
  if (!(container instanceof HTMLElement) || container.dataset.naraBlocked === "true") {
    return;
  }

  const text = getResponseText(container);
  if (text.length < 48 || !detectSycophanticResponse(text)) {
    return;
  }

  blockSycophanticResponse(container, text);
}

function scanForSycophanticResponses(root = document.body) {
  if (!settings.sycophanticResponseDetection || !(root instanceof Element || root instanceof Document)) {
    return;
  }

  const candidates = new Set();
  const scopedRoot = root instanceof Document ? root : root;
  scopedRoot.querySelectorAll(RESPONSE_CONTAINER_SELECTOR).forEach((element) => {
    if (element instanceof HTMLElement) {
      candidates.add(element);
    }
  });

  candidates.forEach((candidate) => evaluateResponseContainer(candidate));
}

function startResponseObserver() {
  if (responseObserver) {
    return;
  }

  responseObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) {
          return;
        }

        const candidate = getCandidateResponseContainer(node);
        if (candidate) {
          evaluateResponseContainer(candidate);
        }

        scanForSycophanticResponses(node);
      });
    });
  });

  responseObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  scanForSycophanticResponses();
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
  ensureModalTheme();
  const copy = buildModalContent(category);

  const overlay = document.createElement("div");
  overlay.className = "nara-overlay";

  const dialog = document.createElement("div");
  dialog.className = "nara-dialog";

  const topline = document.createElement("div");
  topline.className = "nara-topline";

  const brand = document.createElement("div");
  brand.className = "nara-brand";
  brand.textContent = "Nara";

  const badge = document.createElement("div");
  badge.className = `nara-flag ${category === "anthropomorphization" ? "is-anthro" : ""}`;
  badge.textContent = category === "personal" ? "◯ Personal" : "◇ Anthropomorphization";

  const title = document.createElement("h2");
  title.className = "nara-title";
  title.textContent = copy.title;

  const body = document.createElement("p");
  body.className = "nara-body";
  body.textContent = copy.body;

  const preview = document.createElement("div");
  preview.className = "nara-preview";
  preview.textContent = `"${truncate(message, 180)}"`;

  const actions = document.createElement("div");
  actions.className = "nara-actions";

  const primaryButton = document.createElement("button");
  primaryButton.className = "nara-button is-primary";
  primaryButton.textContent = copy.primaryLabel;

  const secondaryButton = document.createElement("button");
  secondaryButton.className = "nara-button is-secondary";
  secondaryButton.textContent = copy.secondaryLabel;

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

  topline.append(brand, badge);
  actions.append(primaryButton, secondaryButton);
  dialog.append(topline, title, body, preview, actions);
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

  if (settings.sycophanticResponseDetection) {
    scanForSycophanticResponses();
  }
});

loadSettings();
document.addEventListener("submit", handleSubmitCapture, true);
document.addEventListener("click", handleClickCapture, true);
document.addEventListener("keydown", handleKeydownCapture, true);
startResponseObserver();
