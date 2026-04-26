const draftMessage = document.getElementById("draftMessage");
const params = new URLSearchParams(window.location.search);
const message = params.get("message");

if (message) {
  draftMessage.textContent = message;
}
