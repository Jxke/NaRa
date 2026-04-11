# Nara

Chrome extension prototype for guardrailed AI chatbot use across ChatGPT, Claude, and Gemini.

## Files

- `manifest.json`: Manifest V3 configuration
- `content.js`: ChatGPT, Claude, and Gemini composer interception and intervention modal flow
- `background.js`: Storage persistence and badge updates
- `popup.html`, `popup.css`, `popup.js`: Toolbar popup with overview, activity, and settings tabs
- `nara.html`, `nara.css`, `nara.js`: Older internal page assets retained in the folder but not used in the current close-tab flow

## Load In Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select this `browser_extension` folder
