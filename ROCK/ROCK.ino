#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <ESP_I2S.h>
#include <SPI.h>
#include <Wire.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeMonoBold9pt7b.h>
#include <Fonts/FreeMonoBold12pt7b.h>
#include <Adafruit_DRV2605.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "esp_heap_caps.h"
#include "gallery_bitmaps.h"
#include "consult_glyph_bitmaps.h"
#include "maddi_logo.h"
#include "nara_logo.h"

// ── YAMNet on-device audio classification ──
#include <Chirale_TensorFlowLite.h>
#include <tensorflow/lite/micro/all_ops_resolver.h>
#include <tensorflow/lite/micro/micro_interpreter.h>
#include <tensorflow/lite/schema/schema_generated.h>
#include "yamnet_model_data.h"
#include "audio_classifier.h"

namespace {

// Forward declarations
void initYamnet();
bool classifyAudioOnDevice();
void startNaraUiTest();
void processNaraUiTest();

constexpr char CONFIG_NAMESPACE[] = "rock_cfg";
constexpr char DEFAULT_WIFI_SSID[] = "caroline";
constexpr char LEGACY_DEFAULT_WIFI_SSID[] = "Tim Apple Iphone";
constexpr char PRIOR_DEFAULT_WIFI_SSID[] = "Tim Apple iPhone";
constexpr char SESSION_DEFAULT_WIFI_SSID[] = "Towards The Sun";
constexpr char DEFAULT_WIFI_PASSWORD[] = "caroline#1";
constexpr char PRIOR_DEFAULT_WIFI_PASSWORD[] = "thesameasyours";
constexpr char SESSION_DEFAULT_WIFI_PASSWORD[] = "gsdgsdgsd";
constexpr char DEFAULT_OPENAI_BASE_URL[] = "https://api.openai.com";
constexpr char DEFAULT_OPENAI_MODEL[] = "gpt-4.1-nano";
constexpr char DEFAULT_DEEPGRAM_MODEL[] = "nova-2-general";
constexpr char DEFAULT_DEEPGRAM_LANGUAGE[] = "en-US";
constexpr char DEFAULT_SYSTEM_PROMPT[] =
  "You are a guide to all questions of life. Reply with exactly one ASCII emoticon and no other text. "
  "Do not use Unicode emoji. Use plain ASCII like :) :( :D :P ;) :| <3 T_T -_- ._.";
constexpr char LEGACY_DEFAULT_SYSTEM_PROMPT[] =
  "You are a concise embedded assistant. Answer clearly and briefly.";
constexpr char PRIOR_DEFAULT_SYSTEM_PROMPT[] =
  "You are a guide to all questions of life. Respond only in emoticons.";

constexpr int BUTTON_PIN = 2;
constexpr int POT_PIN = 8;
constexpr int GALLERY_POT_PIN = 3;
constexpr int ENCODER_CLK_PIN = GALLERY_POT_PIN;
constexpr int ENCODER_DT_PIN = POT_PIN;
constexpr int SELECT_BUTTON_PIN = 1;
constexpr int BACK_BUTTON_PIN = 7;
constexpr int NARA_UI_POT_PIN = GALLERY_POT_PIN;

constexpr int MIC_WS_PIN = 4;
constexpr int MIC_SCK_PIN = 5;
constexpr int MIC_SD_PIN = 6;

constexpr int EINK_BUSY_PIN = 9;
constexpr int EINK_CS_PIN = 10;
constexpr int EINK_DIN_PIN = 11;
constexpr int EINK_CLK_PIN = 12;
constexpr int EINK_DC_PIN = 13;
constexpr int EINK_RST_PIN = 14;

constexpr int I2C_SDA_PIN = 38;
constexpr int I2C_SCL_PIN = 39;
constexpr uint8_t DRV2605_I2C_ADDR_PRIMARY = 0x5A;
constexpr uint8_t DRV2605_I2C_ADDR_ALT = 0x5B;
constexpr uint8_t MPU6050_I2C_ADDR_PRIMARY = 0x68;
constexpr uint8_t MPU6050_I2C_ADDR_ALT = 0x69;
constexpr uint32_t I2C_CLOCK_HZ = 50000;

constexpr uint32_t SAMPLE_RATE = 16000;
constexpr uint16_t WAV_HEADER_SIZE = 44;
constexpr uint32_t MAX_RECORD_SECONDS = 10;
constexpr size_t MAX_AUDIO_BYTES = SAMPLE_RATE * 2 * MAX_RECORD_SECONDS;  // 320KB in PSRAM
constexpr uint32_t AUDIO_CHUNK_SIZE = 1024;
constexpr unsigned long SENSOR_MONITOR_INTERVAL_MS = 1000;
constexpr unsigned long BUTTON_DEBOUNCE_MS = 20;
constexpr uint32_t CAPTION_RECORD_MS = 4000;
constexpr uint32_t HOLD_TO_SPEAK_RELEASE_TAIL_MS = 250;

// Ambient context capture — periodic 10s recordings every 60s
constexpr uint32_t AMBIENT_RECORD_MS = 10000;        // 10s recording
constexpr uint32_t AMBIENT_REST_MS = 50000;           // 50s pause (total cycle = 60s)
constexpr uint32_t AMBIENT_MAX_RECORD_MS = 30000;     // hard cap (unused with fixed 10s but kept for safety)
constexpr uint32_t AMBIENT_SILENCE_TIMEOUT_MS = 2000;
constexpr uint32_t AMBIENT_LISTEN_WINDOW_MS = 10000;  // listen window = record duration
constexpr uint32_t AMBIENT_REST_SPEECH_MS = 50000;    // same rest whether speech or not
constexpr uint32_t AMBIENT_REST_SILENCE_MS = 50000;
constexpr uint32_t CONSULT_RECORD_SECONDS = 5;       // button-hold limited to 5s
constexpr size_t CONSULT_MAX_AUDIO = SAMPLE_RATE * 2 * CONSULT_RECORD_SECONDS;
constexpr size_t AMBIENT_MAX_AUDIO = SAMPLE_RATE * 2 * (AMBIENT_MAX_RECORD_MS / 1000);  // 960KB
constexpr unsigned long CAPTION_LOOP_GAP_MS = 500;
constexpr bool FORCE_DEFAULT_SYSTEM_PROMPT_MODE = true;
constexpr bool ENABLE_HAPTIC = true;
constexpr bool ENABLE_IMU = true;
constexpr bool ENABLE_BUTTON_PTT = true;
constexpr bool ENABLE_NARA_UI_TEST = true;  // use the Nara UI flow with live consultation
constexpr uint32_t NARA_UI_SPLASH_MS = 5000;
constexpr uint32_t NARA_UI_PROCESS_MS = 1600;
constexpr unsigned long NARA_UI_POT_SETTLE_MS = 120;
constexpr unsigned long ENCODER_DEBOUNCE_MS = 2;

constexpr uint32_t STATUS_PARTIAL_X = 0;
constexpr uint32_t STATUS_PARTIAL_Y = 0;
constexpr uint32_t STATUS_PARTIAL_W = 200;
constexpr uint32_t STATUS_PARTIAL_H = 32;

SPIClass einkSpi(FSPI);
GxEPD2_BW<GxEPD2_154_D67, GxEPD2_154_D67::HEIGHT> display(
  GxEPD2_154_D67(EINK_CS_PIN, EINK_DC_PIN, EINK_RST_PIN, EINK_BUSY_PIN));

Preferences preferences;
I2SClass microphoneI2S;
Adafruit_DRV2605 drv;
Adafruit_MPU6050 mpu;

// ── YAMNet TFLite inference ──
constexpr int YAMNET_ARENA_SIZE = 300 * 1024;  // 300KB tensor arena (allocated in PSRAM)
uint8_t* yamnetArena = nullptr;
tflite::MicroInterpreter* yamnetInterpreter = nullptr;
TfLiteTensor* yamnetInput = nullptr;
TfLiteTensor* yamnetOutput = nullptr;
bool yamnetReady = false;
AudioClassResult lastClassification = {};
String lastEnvironmentLabel = "unknown";
String lastAmbientEvents = "";

String wifiSsid = DEFAULT_WIFI_SSID;
String wifiPassword = DEFAULT_WIFI_PASSWORD;
String deepgramApiKey;
String openaiApiKey;
String openaiApiBaseUrl = DEFAULT_OPENAI_BASE_URL;
String openaiModel = DEFAULT_OPENAI_MODEL;
String deepgramModel = DEFAULT_DEEPGRAM_MODEL;
String deepgramLanguage = DEFAULT_DEEPGRAM_LANGUAGE;
String systemPrompt = DEFAULT_SYSTEM_PROMPT;

String supabaseUrl;
String supabaseAnonKey;
String deviceApiKey;
constexpr bool USE_MADDI_PIPELINE = true;  // toggle: true = Supabase, false = direct OpenAI

bool configReceived = false;
bool wifiConnected = false;
bool displayReady = false;
bool drvReady = false;
bool mpuReady = false;
bool recording = false;
bool buttonWasPressed = false;
bool sensorMonitorEnabled = false;
bool buttonStablePressed = false;
bool buttonLastRawPressed = false;
bool captionLoopEnabled = false;
bool micUseRightChannel = false;
bool drvLibraryReady = false;
uint8_t drvI2cAddress = 0;
uint8_t mpuI2cAddress = 0;

// Audio buffer allocated from PSRAM at boot (640KB + WAV header for 20s recording)
uint8_t* audioBuffer = nullptr;
size_t recordedBytes = 0;
unsigned long recordStartMs = 0;
unsigned long lastSensorMonitorMs = 0;
unsigned long lastButtonRawChangeMs = 0;
unsigned long nextCaptionLoopMs = 0;
uint8_t resultGalleryStep = 0;

// Ambient capture state machine
enum AmbientState {
  AMB_IDLE,         // waiting for next listen cycle
  AMB_LISTENING,    // mic on, waiting for speech onset
  AMB_RECORDING,    // speech detected, accumulating audio
  AMB_SENDING,      // uploading to /ingest-audio
};

bool ambientCaptureEnabled = true;
AmbientState ambientState = AMB_IDLE;
unsigned long ambientNextCaptureMs = 0;
unsigned long ambientCaptureStartMs = 0;
unsigned long ambientLastSpeechMs = 0;   // last time a speech window was detected
unsigned long ambientListenStartMs = 0;  // when we started listening for speech onset
uint32_t ambientCycleCount = 0;
uint32_t ambientSpeechCount = 0;

// VAD — energy-based voice activity detection
// VAD tuning — based on observed INMP441 behavior:
//   Mic self-noise:  -14 to -15 dBFS (per 100ms window)
//   Normal speech:   -8 to -10 dBFS
//   Loud speech:     -5 to -8 dBFS
// Threshold at -12dB gives ~3dB margin above noise, catches normal speech.
constexpr float VAD_FIXED_THRESHOLD_DB = -12.0;
constexpr int VAD_CALIBRATION_CYCLES = 30;     // ~3s of windows for noise floor tracking
constexpr float VAD_MARGIN_DB = 3.0;           // threshold = max(fixed, floor + margin)
float vadNoiseFloorDb = -15.0;                 // realistic initial for INMP441
float vadThresholdDb = VAD_FIXED_THRESHOLD_DB;
int vadCalibrationCount = 0;
bool vadCalibrated = false;

String statusLine = "BOOT";
String captionUser;
String captionAssistant;
String serialLineBuffer;

struct MicrophoneSnapshot {
  bool valid = false;
  bool flatline = false;
  bool railHigh = false;
  bool railLow = false;
  int16_t minimum = 0;
  int16_t maximum = 0;
  int32_t average = 0;
  uint16_t peak = 0;
};

enum AppState {
  STATE_WAITING_CONFIG,
  STATE_IDLE,
  STATE_RECORDING,
  STATE_TRANSCRIBING,
  STATE_THINKING,
  STATE_SHOWING_RESULT,
  STATE_ERROR
};

AppState appState = STATE_WAITING_CONFIG;

enum NaraUiState {
  NARA_UI_0_IDLE,
  NARA_UI_1_SPLASH,
  NARA_UI_2_LISTENING,
  NARA_UI_3_PROCESSING,
  NARA_UI_4_OUTPUT,
  NARA_UI_MENU,
  NARA_UI_3A_LEXICON,
  NARA_UI_3B_HISTORY,
  NARA_UI_3C_SETTINGS,
  NARA_UI_5A_DETAIL
};

void setNaraUiState(NaraUiState nextState);
void renderNaraUiScreen();

struct NaraButtonState {
  uint8_t pin;
  bool idleLevel;
  bool stablePressed;
  bool lastRawPressed;
  unsigned long lastChangeMs;
};

struct NaraSampleOutput {
  const char* word;
  const char* glyphs[3];
};

void rotateNaraHistory(const NaraSampleOutput& newest);

struct NaraSettingItem {
  const char* label;
  bool enabled;
};

NaraButtonState naraRecordButton = {BUTTON_PIN, true, false, false, 0};
NaraButtonState naraSelectButton = {SELECT_BUTTON_PIN, true, false, false, 0};
NaraButtonState naraBackButton = {BACK_BUTTON_PIN, true, false, false, 0};

constexpr NaraSampleOutput NARA_SAMPLE_OUTPUTS[] = {
  {"BECOMING", {"venture", "transformation", "introspect"}},
  {"ALIGNMENT", {"balance", "clarity", "progression"}},
  {"REFRAMING", {"ripple", "conflict", "harmony"}},
};

constexpr const char* NARA_SAFE_GALLERY_GLYPHS[3] = {
  "venture", "clarity", "bond",
};

constexpr const char* NARA_LEXICON_GLYPHS[] = {
  "venture", "manifestation", "intuition", "abundance", "structure", "conformity",
  "divergence", "determination", "courage", "introspect", "cascade", "balance",
  "surrender", "transformation", "harmony", "restriction", "sudden", "healing",
  "illusion", "clarity", "awakening", "complete", "industry", "transition",
  "release", "duality", "conflict", "clouded", "pour", "threshold",
  "fire", "pattern", "house", "bond", "detachment", "unity",
  "cycles", "interconnection", "opening", "ripple", "dialogue", "progression",
};

NaraSampleOutput naraHistory[3] = {
  NARA_SAMPLE_OUTPUTS[1],
  NARA_SAMPLE_OUTPUTS[2],
  NARA_SAMPLE_OUTPUTS[0],
};

NaraSettingItem naraSettings[] = {
  {"CONTEXT", true},
  {"RECORDING", true},
  {"LOW DATA", false},
  {"BATTERY", false},
};

NaraUiState naraUiState = NARA_UI_1_SPLASH;
NaraUiState naraUiReturnState = NARA_UI_4_OUTPUT;
unsigned long naraUiStateStartedMs = 0;
size_t naraUiSampleCursor = 0;
uint8_t naraUiOutputFocusIndex = 0;
bool naraUiOutputMenuArmed = false;
uint8_t naraUiMenuIndex = 0;
uint8_t naraUiHistoryIndex = 0;
uint8_t naraUiSettingsIndex = 0;
uint8_t naraUiDetailGlyphIndex = 0;
uint8_t naraUiLexiconIndex = 0;
uint8_t naraUiIdlePotBucket = 0;
int naraUiLastPotBucket = -1;
unsigned long naraUiLastPotBucketChangeMs = 0;
bool naraUiNeedsRender = true;
bool naraUiNeedsFullRefresh = true;
bool naraUiRecordArmed = false;
NaraSampleOutput naraCurrentOutput = NARA_SAMPLE_OUTPUTS[0];
String naraCurrentWord;
String naraCurrentGlyphs[3];
String naraUiTranscript;
String naraUiProcessingStatus = "GLYPHS IN FLIGHT";
int32_t encoderPosition = 0;
int encoderLastClkState = HIGH;
unsigned long encoderLastEdgeMs = 0;
int32_t naraUiLastEncoderPosition = 0;

bool writeI2CRegister8(uint8_t address, uint8_t reg, uint8_t value);
bool readI2CRegister8(uint8_t address, uint8_t reg, uint8_t& value);

bool waitForHapticIdle(uint16_t timeoutMs = 250) {
  if (!drvReady || drvI2cAddress == 0) return false;

  const unsigned long startedAt = millis();
  while (millis() - startedAt < timeoutMs) {
    uint8_t go = 0;
    if (!readI2CRegister8(drvI2cAddress, DRV2605_REG_GO, go)) {
      return false;
    }
    if ((go & 0x01) == 0) {
      return true;
    }
    delay(5);
  }

  return false;
}

bool prepareHapticPlayback() {
  if (!drvReady || drvI2cAddress == 0) return false;

  if (drvLibraryReady) {
    drv.setMode(DRV2605_MODE_INTTRIG);
    return true;
  }

  return writeI2CRegister8(drvI2cAddress, DRV2605_REG_MODE, DRV2605_MODE_INTTRIG) &&
         writeI2CRegister8(drvI2cAddress, DRV2605_REG_LIBRARY, 1) &&
         writeI2CRegister8(drvI2cAddress, DRV2605_REG_GO, 0);
}

void buzz(uint8_t effect = 1) {
  if (!ENABLE_HAPTIC || !drvReady) return;
  if (!prepareHapticPlayback()) {
    Serial.println("[Haptic] Playback prep failed");
    return;
  }
  if (drvLibraryReady) {
    drv.setWaveform(0, effect);
    drv.setWaveform(1, 0);
    drv.go();
    waitForHapticIdle();
    return;
  }

  Wire.beginTransmission(drvI2cAddress);
  Wire.write(DRV2605_REG_WAVESEQ1);
  Wire.write(effect);
  Wire.endTransmission();

  Wire.beginTransmission(drvI2cAddress);
  Wire.write(DRV2605_REG_WAVESEQ2);
  Wire.write(0);
  Wire.endTransmission();

  Wire.beginTransmission(drvI2cAddress);
  Wire.write(DRV2605_REG_GO);
  Wire.write(1);
  Wire.endTransmission();
  waitForHapticIdle();
}

void vibrateForMs(uint16_t durationMs, uint8_t effect = 47) {
  if (!ENABLE_HAPTIC || !drvReady) return;
  const unsigned long endAt = millis() + durationMs;
  while (millis() < endAt) {
    buzz(effect);
    delay(30);
  }
}

void vibrateReplyPattern() {
  if (!ENABLE_HAPTIC || !drvReady) return;

  const uint8_t replyEffects[] = {47, 47, 89, 47};
  Serial.println("[Haptic] AI reply pattern");
  for (uint8_t effect : replyEffects) {
    buzz(effect);
    delay(35);
  }
}

bool hasWifiConfig() {
  return !wifiSsid.isEmpty() && !wifiPassword.isEmpty();
}

bool hasDeepgramConfig() {
  return !deepgramApiKey.isEmpty();
}

bool hasSupabaseConfig() {
  return !supabaseUrl.isEmpty() && !supabaseAnonKey.isEmpty() && !deviceApiKey.isEmpty();
}

bool hasLegacyAiConfig() {
  return !deepgramApiKey.isEmpty() && !openaiApiKey.isEmpty();
}

bool hasCloudConfig() {
  if (USE_MADDI_PIPELINE) {
    return hasDeepgramConfig() && hasSupabaseConfig();
  }
  return hasLegacyAiConfig();
}

bool canRunCaptionMode() {
  return wifiConnected && hasDeepgramConfig();
}

bool readButtonPressedRaw() {
  return digitalRead(BUTTON_PIN) == LOW;
}

const char* micChannelName() {
  return micUseRightChannel ? "RIGHT" : "LEFT";
}

const char* wifiDisconnectReasonName(uint8_t reason) {
  switch (reason) {
    case 2: return "AUTH_EXPIRE";
    case 3: return "AUTH_LEAVE";
    case 4: return "ASSOC_EXPIRE";
    case 5: return "ASSOC_TOOMANY";
    case 6: return "NOT_AUTHED";
    case 7: return "NOT_ASSOCED";
    case 8: return "ASSOC_LEAVE";
    case 15: return "4WAY_HANDSHAKE_TIMEOUT";
    case 201: return "NO_AP_FOUND";
    case 202: return "AUTH_FAIL";
    case 203: return "ASSOC_FAIL";
    case 204: return "HANDSHAKE_TIMEOUT";
    case 205: return "CONNECTION_FAIL";
    default: return "UNKNOWN";
  }
}

void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      Serial.print("[WiFi] Associated: ");
      Serial.println(reinterpret_cast<const char*>(info.wifi_sta_connected.ssid));
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.print("[WiFi] Disconnected, reason ");
      Serial.print(info.wifi_sta_disconnected.reason);
      Serial.print(" (");
      Serial.print(wifiDisconnectReasonName(info.wifi_sta_disconnected.reason));
      Serial.println(")");
      break;
    default:
      break;
  }
}

String truncateForDisplay(const String& input, size_t maxLen) {
  if (input.length() <= maxLen) return input;
  if (maxLen < 4) return input.substring(0, maxLen);
  return input.substring(0, maxLen - 3) + "...";
}

int positiveModulo(int value, int modulus) {
  if (modulus <= 0) return 0;
  int result = value % modulus;
  return (result < 0) ? result + modulus : result;
}

void updateRotaryEncoder() {
  const int clkState = digitalRead(ENCODER_CLK_PIN);
  if (clkState == encoderLastClkState) return;

  const unsigned long now = millis();
  if (now - encoderLastEdgeMs < ENCODER_DEBOUNCE_MS) {
    encoderLastClkState = clkState;
    return;
  }

  encoderLastEdgeMs = now;
  const int dtState = digitalRead(ENCODER_DT_PIN);
  if (dtState != clkState) {
    encoderPosition++;
  } else {
    encoderPosition--;
  }
  encoderLastClkState = clkState;
}

int responseWordLimit() {
  return 12 + positiveModulo(static_cast<int>(encoderPosition), 69);
}

uint8_t galleryStepFromPot() {
  return static_cast<uint8_t>(positiveModulo(static_cast<int>(encoderPosition), 5));
}

bool isStrictEmoticonPrompt() {
  if (FORCE_DEFAULT_SYSTEM_PROMPT_MODE) return true;
  String lowered = systemPrompt;
  lowered.toLowerCase();
  return lowered.indexOf("emoticon") >= 0 || lowered.indexOf("emoji") >= 0;
}

String effectiveSystemPrompt() {
  if (FORCE_DEFAULT_SYSTEM_PROMPT_MODE) {
    return String(DEFAULT_SYSTEM_PROMPT);
  }
  return systemPrompt;
}

String dynamicPrompt() {
  String prompt = effectiveSystemPrompt();
  if (isStrictEmoticonPrompt()) {
    return prompt;
  }

  prompt += " Keep the reply under ";
  prompt += String(responseWordLimit());
  prompt += " words.";
  return prompt;
}

String extractAsciiEmoticon(const String& text) {
  static constexpr const char* kAsciiEmoticons[] = {
    ":-)", ":)", ":-D", ":D", ";-)", ";)", ":-P", ":P", ":-p", ":p",
    ":-(", ":(", ":'(", ":-|", ":|", ":-/", ":/", ":-O", ":O",
    "XD", "xD", "<3", ">:(", "^-^", "-_-", "._.", "T_T", ":'-("};

  for (const char* emoticon : kAsciiEmoticons) {
    const int index = text.indexOf(emoticon);
    if (index >= 0) return String(emoticon);
  }
  return "";
}

size_t utf8SequenceLength(uint8_t lead) {
  if ((lead & 0x80) == 0x00) return 1;
  if ((lead & 0xE0) == 0xC0) return 2;
  if ((lead & 0xF0) == 0xE0) return 3;
  if ((lead & 0xF8) == 0xF0) return 4;
  return 1;
}

bool isVariationSelector16(const String& text, size_t index) {
  return index + 2 < text.length() &&
         static_cast<uint8_t>(text[index]) == 0xEF &&
         static_cast<uint8_t>(text[index + 1]) == 0xB8 &&
         static_cast<uint8_t>(text[index + 2]) == 0x8F;
}

bool isZeroWidthJoiner(const String& text, size_t index) {
  return index + 2 < text.length() &&
         static_cast<uint8_t>(text[index]) == 0xE2 &&
         static_cast<uint8_t>(text[index + 1]) == 0x80 &&
         static_cast<uint8_t>(text[index + 2]) == 0x8D;
}

String extractSingleEmojiLikeToken(const String& text) {
  for (size_t i = 0; i < text.length(); ++i) {
    const uint8_t lead = static_cast<uint8_t>(text[i]);
    if (lead < 0x80) continue;

    size_t length = utf8SequenceLength(lead);
    if (length < 2 || i + length > text.length()) continue;

    String token = text.substring(i, i + length);
    size_t cursor = i + length;

    while (cursor < text.length()) {
      if (isVariationSelector16(text, cursor)) {
        token += text.substring(cursor, cursor + 3);
        cursor += 3;
        continue;
      }

      if (isZeroWidthJoiner(text, cursor)) {
        token += text.substring(cursor, cursor + 3);
        cursor += 3;
        if (cursor >= text.length()) break;
        const size_t joinedLength = utf8SequenceLength(static_cast<uint8_t>(text[cursor]));
        if (joinedLength < 2 || cursor + joinedLength > text.length()) break;
        token += text.substring(cursor, cursor + joinedLength);
        cursor += joinedLength;
        continue;
      }

      break;
    }

    return token;
  }

  return "";
}

String enforceSingleEmoticonReply(const String& rawReply) {
  if (!isStrictEmoticonPrompt()) {
    return rawReply;
  }

  const String asciiEmoticon = extractAsciiEmoticon(rawReply);
  if (!asciiEmoticon.isEmpty()) return asciiEmoticon;
  return "";
}

void drawWrappedText(const String& text, int16_t x, int16_t y, int16_t maxWidth, int16_t lineHeight, int maxLines) {
  String remaining = text;
  for (int line = 0; line < maxLines && remaining.length() > 0; ++line) {
    int split = remaining.length();
    while (split > 0) {
      String candidate = remaining.substring(0, split);
      int16_t x1, y1;
      uint16_t w, h;
      display.getTextBounds(candidate, x, y, &x1, &y1, &w, &h);
      if (w <= maxWidth) break;
      split = remaining.lastIndexOf(' ', split - 1);
      if (split <= 0) {
        split = min<int>(remaining.length(), 18);
        break;
      }
    }
    String lineText = remaining.substring(0, split);
    lineText.trim();
    if (line == maxLines - 1 && split < remaining.length()) {
      lineText = truncateForDisplay(lineText + " " + remaining.substring(split), 28);
    }
    display.setCursor(x, y + line * lineHeight);
    display.print(lineText);
    remaining = remaining.substring(split);
    remaining.trim();
  }
}

void fullRender() {
  if (!displayReady) return;

  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setFont(&FreeMonoBold9pt7b);

    display.setCursor(8, 18);
    display.print("ROCK");

    display.drawLine(0, 26, 199, 26, GxEPD_BLACK);

    display.setCursor(8, 50);
    display.print(statusLine);

    display.setCursor(8, 74);
    display.print("WiFi:");
    display.print(wifiConnected ? "OK" : "OFF");

    display.setCursor(110, 74);
    display.print("POT:");
    display.print(responseWordLimit());

    display.setCursor(8, 98);
    display.print("USER");
    drawWrappedText(captionUser, 8, 118, 184, 18, 3);

    display.setCursor(8, 170);
    display.print("AI");
    drawWrappedText(captionAssistant, 8, 190, 184, 18, 1);
  } while (display.nextPage());
}

void renderCenteredBitmap(const uint8_t* bitmap) {
  if (!displayReady) return;

  const int16_t x = (display.width() - GALLERY_BITMAP_LARGE_WIDTH) / 2;
  const int16_t y = (display.height() - GALLERY_BITMAP_LARGE_HEIGHT) / 2;

  // Clear the full panel in partial mode so prior collage pixels don't remain outside the centered image.
  display.setPartialWindow(0, 0, display.width(), display.height());
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.drawBitmap(x, y, bitmap, GALLERY_BITMAP_LARGE_WIDTH, GALLERY_BITMAP_LARGE_HEIGHT, GxEPD_BLACK);
  } while (display.nextPage());
}

void renderStatusOnly() {
  if (!displayReady) return;

  display.setPartialWindow(0, 0, 200, 32);
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setFont(&FreeMonoBold9pt7b);
    display.setCursor(8, 22);
    display.print(truncateForDisplay(statusLine, 16));
  } while (display.nextPage());
}

void updateScreen(const String& newStatus, const String& userText = "", const String& assistantText = "", bool full = false) {
  statusLine = newStatus;
  if (userText.length()) captionUser = userText;
  if (assistantText.length()) captionAssistant = assistantText;
  if (full) fullRender();
  else renderStatusOnly();
}

void renderGlyphCollage() {
  if (!displayReady) return;

  constexpr int16_t TOP_Y = 8;
  constexpr int16_t BOTTOM_Y = 88;
  constexpr int16_t LEFT_X = 8;
  constexpr int16_t RIGHT_X = 112;
  constexpr int16_t CENTER_X = 60;
  constexpr int16_t LABEL_Y = 194;
  constexpr char LABEL_TEXT[] = "SELF-MASTERY";

  // This view spans nearly the whole panel, but partial mode is still faster than a full refresh.
  display.setPartialWindow(0, 0, display.width(), display.height());
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setFont(&FreeMonoBold9pt7b);
    display.drawBitmap(LEFT_X, TOP_Y, TREE_BITMAP_SMALL, GALLERY_BITMAP_SMALL_WIDTH, GALLERY_BITMAP_SMALL_HEIGHT, GxEPD_BLACK);
    display.drawBitmap(RIGHT_X, TOP_Y, BUTTERFLY_BITMAP_SMALL, GALLERY_BITMAP_SMALL_WIDTH, GALLERY_BITMAP_SMALL_HEIGHT, GxEPD_BLACK);
    display.drawBitmap(CENTER_X, BOTTOM_Y, FLOWER_BITMAP_SMALL, GALLERY_BITMAP_SMALL_WIDTH, GALLERY_BITMAP_SMALL_HEIGHT, GxEPD_BLACK);
    int16_t x1, y1;
    uint16_t w, h;
    display.getTextBounds(LABEL_TEXT, 0, LABEL_Y, &x1, &y1, &w, &h);
    display.setCursor((display.width() - static_cast<int16_t>(w)) / 2, LABEL_Y);
    display.print(LABEL_TEXT);
  } while (display.nextPage());
}

void renderResultGalleryStep() {
  switch (resultGalleryStep) {
    case 0:
      renderGlyphCollage();
      break;
    case 1:
      renderCenteredBitmap(TREE_BITMAP_LARGE);
      break;
    case 2:
      renderCenteredBitmap(BUTTERFLY_BITMAP_LARGE);
      break;
    default:
      renderCenteredBitmap(FLOWER_BITMAP_LARGE);
      break;
  }
}

void startResultGallery() {
  resultGalleryStep = 0;
  appState = STATE_SHOWING_RESULT;
  renderResultGalleryStep();
}

void updateResultGalleryFromPot() {
  if (appState != STATE_SHOWING_RESULT) return;

  const uint8_t nextStep = galleryStepFromPot();
  if (nextStep == resultGalleryStep) return;

  if (nextStep < 4) {
    resultGalleryStep = nextStep;
    renderResultGalleryStep();
    return;
  }

  resultGalleryStep = 0;
  updateScreen("READY", captionUser, captionAssistant, true);
  appState = STATE_IDLE;
}

void saveConfig() {
  preferences.begin(CONFIG_NAMESPACE, false);
  preferences.putString("wifi_ssid", wifiSsid);
  preferences.putString("wifi_pass", wifiPassword);
  preferences.putString("deepgram_key", deepgramApiKey);
  preferences.putString("openai_key", openaiApiKey);
  preferences.putString("openai_url", openaiApiBaseUrl);
  preferences.putString("openai_model", openaiModel);
  preferences.putString("dg_model", deepgramModel);
  preferences.putString("dg_lang", deepgramLanguage);
  preferences.putString("sys_prompt", systemPrompt);
  preferences.putString("supa_url", supabaseUrl);
  preferences.putString("supa_anon", supabaseAnonKey);
  preferences.putString("device_key", deviceApiKey);
  preferences.putBool("configured", true);
  preferences.end();
}

bool loadConfig() {
  preferences.begin(CONFIG_NAMESPACE, true);
  const bool configured = preferences.getBool("configured", false);
  if (!configured) {
    preferences.end();
    return false;
  }
  wifiSsid = preferences.getString("wifi_ssid", DEFAULT_WIFI_SSID);
  wifiPassword = preferences.getString("wifi_pass", DEFAULT_WIFI_PASSWORD);
  deepgramApiKey = preferences.getString("deepgram_key", "");
  openaiApiKey = preferences.getString("openai_key", "");
  openaiApiBaseUrl = preferences.getString("openai_url", DEFAULT_OPENAI_BASE_URL);
  openaiModel = preferences.getString("openai_model", DEFAULT_OPENAI_MODEL);
  deepgramModel = preferences.getString("dg_model", DEFAULT_DEEPGRAM_MODEL);
  deepgramLanguage = preferences.getString("dg_lang", DEFAULT_DEEPGRAM_LANGUAGE);
  systemPrompt = preferences.getString("sys_prompt", DEFAULT_SYSTEM_PROMPT);
  supabaseUrl = preferences.getString("supa_url", "");
  supabaseAnonKey = preferences.getString("supa_anon", "");
  deviceApiKey = preferences.getString("device_key", "");
  preferences.end();

  bool migrated = false;
  if (wifiSsid.isEmpty() ||
      wifiSsid == LEGACY_DEFAULT_WIFI_SSID ||
      wifiSsid == PRIOR_DEFAULT_WIFI_SSID ||
      wifiSsid == SESSION_DEFAULT_WIFI_SSID) {
    wifiSsid = DEFAULT_WIFI_SSID;
    migrated = true;
  }
  if (wifiPassword.isEmpty() ||
      wifiPassword == PRIOR_DEFAULT_WIFI_PASSWORD ||
      wifiPassword == SESSION_DEFAULT_WIFI_PASSWORD) {
    wifiPassword = DEFAULT_WIFI_PASSWORD;
    migrated = true;
  }
  if (systemPrompt.isEmpty() ||
      systemPrompt == LEGACY_DEFAULT_SYSTEM_PROMPT ||
      systemPrompt == PRIOR_DEFAULT_SYSTEM_PROMPT) {
    systemPrompt = DEFAULT_SYSTEM_PROMPT;
    migrated = true;
  }
  if (FORCE_DEFAULT_SYSTEM_PROMPT_MODE && systemPrompt != DEFAULT_SYSTEM_PROMPT) {
    systemPrompt = DEFAULT_SYSTEM_PROMPT;
    migrated = true;
  }

  if (migrated) {
    saveConfig();
  }
  return true;
}

bool validateConfig() {
  return hasWifiConfig() && hasCloudConfig();
}

void printConfigTemplate() {
  Serial.print("WiFi default SSID: ");
  Serial.println(wifiSsid);
  Serial.println("Send one JSON line over serial:");
  Serial.println(
    "{\"wifi_ssid\":\"caroline\",\"wifi_password\":\"caroline#1\","
    "\"deepgram_api_key\":\"YOUR_DEEPGRAM_KEY\",\"deepgram_model\":\"nova-2-general\","
    "\"deepgram_language\":\"en-US\",\"supabase_url\":\"https://PROJECT.supabase.co\","
    "\"supabase_anon_key\":\"YOUR_SUPABASE_ANON_KEY\","
    "\"device_api_key\":\"YOUR_DEVICE_API_KEY\",\"openai_apiKey\":\"YOUR_OPENAI_KEY\","
    "\"openai_apiBaseUrl\":\"https://api.openai.com\",\"openai_model\":\"gpt-4.1-nano\","
    "\"system_prompt\":\"You are a concise embedded assistant.\"}");
}

bool applyConfigJson(const String& jsonPayload) {
  JsonDocument doc;
  const DeserializationError error = deserializeJson(doc, jsonPayload);
  if (error) {
    Serial.print("[Config] JSON parse failed: ");
    Serial.println(error.c_str());
    return false;
  }

  if (doc["wifi_ssid"].is<String>()) wifiSsid = doc["wifi_ssid"].as<String>();
  if (doc["wifi_password"].is<String>()) wifiPassword = doc["wifi_password"].as<String>();
  if (doc["deepgram_api_key"].is<String>()) deepgramApiKey = doc["deepgram_api_key"].as<String>();
  if (doc["deepgram_model"].is<String>()) deepgramModel = doc["deepgram_model"].as<String>();
  if (doc["deepgram_language"].is<String>()) deepgramLanguage = doc["deepgram_language"].as<String>();
  if (doc["openai_apiKey"].is<String>()) openaiApiKey = doc["openai_apiKey"].as<String>();
  if (doc["openai_apiBaseUrl"].is<String>()) openaiApiBaseUrl = doc["openai_apiBaseUrl"].as<String>();
  if (doc["openai_model"].is<String>()) openaiModel = doc["openai_model"].as<String>();
  if (!FORCE_DEFAULT_SYSTEM_PROMPT_MODE && doc["system_prompt"].is<String>()) {
    systemPrompt = doc["system_prompt"].as<String>();
  }
  if (doc.containsKey("supabase_url")) supabaseUrl = doc["supabase_url"].as<String>();
  if (doc.containsKey("supabase_anon_key")) supabaseAnonKey = doc["supabase_anon_key"].as<String>();
  if (doc.containsKey("device_api_key")) deviceApiKey = doc["device_api_key"].as<String>();

  if (!hasWifiConfig()) {
    Serial.println("[Config] Missing WiFi credentials");
    return false;
  }

  saveConfig();
  configReceived = validateConfig();
  if (validateConfig()) {
    Serial.println("[Config] Saved");
  } else {
    Serial.println("[Config] Saved partial config; waiting for remaining credentials");
  }
  return true;
}

bool receiveConfig() {
  static String jsonBuffer;
  static bool receiving = false;
  static unsigned long lastReceiveMs = 0;

  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (!receiving) {
      if (c == '{') {
        jsonBuffer = "{";
        receiving = true;
        lastReceiveMs = millis();
      }
      continue;
    }

    jsonBuffer += c;
    lastReceiveMs = millis();
    if (c != '}') continue;

    const String completeJson = jsonBuffer;
    jsonBuffer = "";
    receiving = false;
    return applyConfigJson(completeJson);
  }

  if (receiving && millis() - lastReceiveMs > 3000) {
    jsonBuffer = "";
    receiving = false;
    Serial.println("[Config] Timed out");
  }
  return false;
}

bool connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(false, true);
  delay(100);
  WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
  Serial.print("[WiFi] Connecting");
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; ++i) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  wifiConnected = WiFi.status() == WL_CONNECTED;
  if (wifiConnected) {
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WiFi] Failed");
  }
  return wifiConnected;
}

void initDisplay() {
  einkSpi.begin(EINK_CLK_PIN, -1, EINK_DIN_PIN, EINK_CS_PIN);
  display.epd2.selectSPI(einkSpi, SPISettings(4000000, MSBFIRST, SPI_MODE0));
  display.init(115200, true, 2, false);
  display.setRotation(0);
  display.setTextColor(GxEPD_BLACK);
  display.setFont(&FreeMonoBold9pt7b);
  displayReady = true;
}

bool i2cAddressResponds(uint8_t address) {
  Wire.beginTransmission(address);
  return Wire.endTransmission() == 0;
}

bool readI2CRegister8(uint8_t address, uint8_t reg, uint8_t& value) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) {
    return false;
  }

  if (Wire.requestFrom(static_cast<int>(address), 1) != 1) {
    return false;
  }

  value = Wire.read();
  return true;
}

bool writeI2CRegister8(uint8_t address, uint8_t reg, uint8_t value) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  Wire.write(value);
  return Wire.endTransmission() == 0;
}

bool initDrvAtAddress(uint8_t address) {
  uint8_t feedback = 0;
  uint8_t control3 = 0;

  if (!i2cAddressResponds(address)) {
    return false;
  }
  if (!readI2CRegister8(address, DRV2605_REG_FEEDBACK, feedback)) {
    return false;
  }
  if (!readI2CRegister8(address, DRV2605_REG_CONTROL3, control3)) {
    return false;
  }

  return writeI2CRegister8(address, DRV2605_REG_MODE, 0x00) &&
         writeI2CRegister8(address, DRV2605_REG_RTPIN, 0x00) &&
         writeI2CRegister8(address, DRV2605_REG_WAVESEQ1, 1) &&
         writeI2CRegister8(address, DRV2605_REG_WAVESEQ2, 0) &&
         writeI2CRegister8(address, DRV2605_REG_OVERDRIVE, 0) &&
         writeI2CRegister8(address, DRV2605_REG_SUSTAINPOS, 0) &&
         writeI2CRegister8(address, DRV2605_REG_SUSTAINNEG, 0) &&
         writeI2CRegister8(address, DRV2605_REG_BREAK, 0) &&
         writeI2CRegister8(address, DRV2605_REG_AUDIOMAX, 0x64) &&
         writeI2CRegister8(address, DRV2605_REG_FEEDBACK, feedback & 0x7F) &&
         writeI2CRegister8(address, DRV2605_REG_CONTROL3, control3 | 0x20) &&
         writeI2CRegister8(address, DRV2605_REG_LIBRARY, 1) &&
         writeI2CRegister8(address, DRV2605_REG_MODE, DRV2605_MODE_INTTRIG);
}

void printI2CScan() {
  int foundCount = 0;
  Serial.println("[I2C] Scan start");
  Serial.print("[I2C] Lines idle SDA=");
  Serial.print(digitalRead(I2C_SDA_PIN) ? "HIGH" : "LOW");
  Serial.print(" SCL=");
  Serial.println(digitalRead(I2C_SCL_PIN) ? "HIGH" : "LOW");
  for (uint8_t address = 1; address < 0x78; ++address) {
    if (!i2cAddressResponds(address)) {
      continue;
    }
    Serial.printf("[I2C] Found 0x%02X\n", address);
    ++foundCount;
  }

  if (foundCount == 0) {
    Serial.println("[I2C] No devices found");
  }
}

void initI2CDevices() {
  pinMode(I2C_SDA_PIN, INPUT_PULLUP);
  pinMode(I2C_SCL_PIN, INPUT_PULLUP);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(I2C_CLOCK_HZ);
  Wire.setTimeOut(50);
  printI2CScan();

  drvReady = false;
  drvLibraryReady = false;
  drvI2cAddress = 0;
  const uint8_t drvAddresses[] = {DRV2605_I2C_ADDR_PRIMARY, DRV2605_I2C_ADDR_ALT};
  for (const uint8_t address : drvAddresses) {
    if (!initDrvAtAddress(address)) {
      continue;
    }
    drvReady = true;
    drvI2cAddress = address;
    Serial.printf("[I2C] DRV2605L at 0x%02X\n", drvI2cAddress);
    if (drvI2cAddress == DRV2605_I2C_ADDR_PRIMARY && drv.begin(&Wire)) {
      drv.selectLibrary(1);
      drv.setMode(DRV2605_MODE_INTTRIG);
      drvLibraryReady = true;
      Serial.println("[I2C] DRV2605L library init OK");
    } else if (drvI2cAddress == DRV2605_I2C_ADDR_PRIMARY) {
      Serial.println("[I2C] DRV2605L library init failed; using raw mode");
    }
    break;
  }
  if (!drvReady) {
    Serial.println("[I2C] DRV2605L not detected at 0x5A or 0x5B");
  }

  mpuReady = false;
  mpuI2cAddress = 0;
  const uint8_t mpuAddresses[] = {MPU6050_I2C_ADDR_PRIMARY, MPU6050_I2C_ADDR_ALT};
  for (const uint8_t address : mpuAddresses) {
    if (!mpu.begin(address, &Wire)) {
      continue;
    }
    mpuReady = true;
    mpuI2cAddress = address;
    Serial.printf("[I2C] MPU6050 at 0x%02X\n", mpuI2cAddress);
    break;
  }
  if (mpuReady) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  } else {
    Serial.println("[I2C] MPU6050 not detected at 0x68 or 0x69");
  }
}

bool initMicrophone() {
  microphoneI2S.end();
  delay(5);
  microphoneI2S.setPins(MIC_SCK_PIN, MIC_WS_PIN, -1, MIC_SD_PIN);
  const bool started = microphoneI2S.begin(
    I2S_MODE_STD,
    SAMPLE_RATE,
    I2S_DATA_BIT_WIDTH_16BIT,
    I2S_SLOT_MODE_MONO,
    micUseRightChannel ? I2S_STD_SLOT_RIGHT : I2S_STD_SLOT_LEFT);
  if (!started) {
    Serial.printf("[Mic] initMicrophone failed on %s channel WS=%d SCK=%d SD=%d\n",
      micChannelName(),
      MIC_WS_PIN,
      MIC_SCK_PIN,
      MIC_SD_PIN);
  }
  return started;
}

void stopMicrophone() {
  microphoneI2S.end();
}

bool captureMicrophoneSnapshot(MicrophoneSnapshot& snapshot) {
  int16_t sampleBuffer[AUDIO_CHUNK_SIZE / sizeof(int16_t)];
  snapshot = {};

  if (!initMicrophone()) {
    return false;
  }

  delay(30);
  const size_t bytesRead = microphoneI2S.readBytes(
    reinterpret_cast<char*>(sampleBuffer), sizeof(sampleBuffer));
  stopMicrophone();

  if (bytesRead == 0) {
    return false;
  }

  snapshot.valid = true;
  snapshot.minimum = sampleBuffer[0];
  snapshot.maximum = sampleBuffer[0];
  int64_t total = 0;

  for (size_t i = 0; i < bytesRead / sizeof(int16_t); ++i) {
    const int32_t sample = sampleBuffer[i];
    const uint16_t magnitude = static_cast<uint16_t>(
      sample < 0 ? -sample : sample);
    snapshot.peak = max(snapshot.peak, magnitude);
    snapshot.minimum = min(snapshot.minimum, sampleBuffer[i]);
    snapshot.maximum = max(snapshot.maximum, sampleBuffer[i]);
    total += sample;
  }

  const size_t sampleCount = bytesRead / sizeof(int16_t);
  snapshot.average = static_cast<int32_t>(total / sampleCount);

  const int32_t span = static_cast<int32_t>(snapshot.maximum) - snapshot.minimum;
  snapshot.flatline = span < 16;
  snapshot.railHigh = snapshot.minimum > 30000 ||
                       (snapshot.flatline && snapshot.average > 30000);
  snapshot.railLow = snapshot.maximum < -30000 ||
                      (snapshot.flatline && snapshot.average < -30000);
  return true;
}

void printMpuSnapshot() {
  if (!ENABLE_IMU) {
    Serial.println("[HW] MPU6050 disabled in this build");
    return;
  }

  if (!mpuReady) {
    Serial.println("[HW] MPU6050 not found");
    return;
  }

  sensors_event_t accel;
  sensors_event_t gyro;
  sensors_event_t temp;
  mpu.getEvent(&accel, &gyro, &temp);

  Serial.print("[HW] MPU accel=(");
  Serial.print(accel.acceleration.x, 2);
  Serial.print(", ");
  Serial.print(accel.acceleration.y, 2);
  Serial.print(", ");
  Serial.print(accel.acceleration.z, 2);
  Serial.print(") gyro=(");
  Serial.print(gyro.gyro.x, 2);
  Serial.print(", ");
  Serial.print(gyro.gyro.y, 2);
  Serial.print(", ");
  Serial.print(gyro.gyro.z, 2);
  Serial.print(") temp=");
  Serial.print(temp.temperature, 2);
  Serial.println("C");
}

void printSensorSnapshot(bool includeMic) {
  const bool rawPressed = readButtonPressedRaw();
  Serial.print("[HW] Button D2 raw=");
  Serial.print(rawPressed ? "LOW" : "HIGH");
  Serial.print(" state=");
  Serial.println(rawPressed ? "PRESSED" : "released");

  printMpuSnapshot();

  if (!includeMic) {
    return;
  }

  MicrophoneSnapshot micSnapshot;
  if (captureMicrophoneSnapshot(micSnapshot)) {
    Serial.print("[HW] Mic min=");
    Serial.print(micSnapshot.minimum);
    Serial.print(" max=");
    Serial.print(micSnapshot.maximum);
    Serial.print(" avg=");
    Serial.print(micSnapshot.average);
    Serial.print(" peak=");
    Serial.println(micSnapshot.peak);

    if (micSnapshot.railHigh) {
      Serial.println("[HW] Mic data line looks stuck HIGH");
    } else if (micSnapshot.railLow) {
      Serial.println("[HW] Mic data line looks stuck LOW");
    } else if (micSnapshot.flatline) {
      Serial.println("[HW] Mic data looks flat; check WS/SCK/SD wiring");
    }
  } else {
    Serial.println("[HW] Mic init failed");
  }
}

void ensureAudioBuffer() {
  if (audioBuffer != nullptr) return;
  const size_t bufSize = MAX_AUDIO_BYTES + WAV_HEADER_SIZE;
  audioBuffer = reinterpret_cast<uint8_t*>(heap_caps_malloc(bufSize, MALLOC_CAP_SPIRAM));
  if (audioBuffer) {
    Serial.printf("[Mic] PSRAM audio buffer allocated: %u bytes\n",
      static_cast<unsigned>(bufSize));
  } else {
    Serial.printf("[Mic] PSRAM audio buffer FAILED (%u bytes)\n",
      static_cast<unsigned>(bufSize));
  }
}

bool captureRecordedAudioSnapshot(MicrophoneSnapshot& snapshot) {
  snapshot = {};
  if (audioBuffer == nullptr || recordedBytes < sizeof(int16_t)) {
    return false;
  }

  const int16_t* sampleBuffer = reinterpret_cast<const int16_t*>(audioBuffer + WAV_HEADER_SIZE);
  const size_t sampleCount = recordedBytes / sizeof(int16_t);
  snapshot.valid = true;
  snapshot.minimum = sampleBuffer[0];
  snapshot.maximum = sampleBuffer[0];
  int64_t total = 0;

  for (size_t i = 0; i < sampleCount; ++i) {
    const int32_t sample = sampleBuffer[i];
    const uint16_t magnitude = static_cast<uint16_t>(
      sample < 0 ? -sample : sample);
    snapshot.peak = max(snapshot.peak, magnitude);
    snapshot.minimum = min(snapshot.minimum, sampleBuffer[i]);
    snapshot.maximum = max(snapshot.maximum, sampleBuffer[i]);
    total += sample;
  }

  snapshot.average = static_cast<int32_t>(total / sampleCount);
  const int32_t span = static_cast<int32_t>(snapshot.maximum) - snapshot.minimum;
  snapshot.flatline = span < 16;
  snapshot.railHigh = snapshot.minimum > 30000 ||
                       (snapshot.flatline && snapshot.average > 30000);
  snapshot.railLow = snapshot.maximum < -30000 ||
                      (snapshot.flatline && snapshot.average < -30000);
  return true;
}

void writeWavHeader(uint8_t* buffer, size_t pcmBytes) {
  const uint32_t chunkSize = pcmBytes + WAV_HEADER_SIZE - 8;
  const uint32_t byteRate = SAMPLE_RATE * 2;
  const uint16_t blockAlign = 2;
  const uint16_t bitsPerSample = 16;
  const uint32_t dataSize = pcmBytes;

  memcpy(buffer + 0, "RIFF", 4);
  memcpy(buffer + 4, &chunkSize, 4);
  memcpy(buffer + 8, "WAVE", 4);
  memcpy(buffer + 12, "fmt ", 4);
  const uint32_t subChunk1Size = 16;
  const uint16_t audioFormat = 1;
  const uint16_t channels = 1;
  memcpy(buffer + 16, &subChunk1Size, 4);
  memcpy(buffer + 20, &audioFormat, 2);
  memcpy(buffer + 22, &channels, 2);
  memcpy(buffer + 24, &SAMPLE_RATE, 4);
  memcpy(buffer + 28, &byteRate, 4);
  memcpy(buffer + 32, &blockAlign, 2);
  memcpy(buffer + 34, &bitsPerSample, 2);
  memcpy(buffer + 36, "data", 4);
  memcpy(buffer + 40, &dataSize, 4);
}

bool extractJsonString(const String& input, int startIndex, String& value) {
  value = "";
  bool escaping = false;

  for (int i = startIndex; i < input.length(); ++i) {
    const char c = input[i];
    if (escaping) {
      switch (c) {
        case '"': value += '"'; break;
        case '\\': value += '\\'; break;
        case '/': value += '/'; break;
        case 'b': value += '\b'; break;
        case 'f': value += '\f'; break;
        case 'n': value += '\n'; break;
        case 'r': value += '\r'; break;
        case 't': value += '\t'; break;
        default: value += c; break;
      }
      escaping = false;
      continue;
    }

    if (c == '\\') {
      escaping = true;
      continue;
    }

    if (c == '"') {
      return true;
    }

    value += c;
  }

  return false;
}

bool extractDeepgramTranscript(const String& body, String& transcript) {
  const String needle = "\"alternatives\":[{\"transcript\":\"";
  const int start = body.indexOf(needle);
  if (start < 0) {
    transcript = "";
    return false;
  }

  return extractJsonString(body, start + needle.length(), transcript);
}

void beginRecording() {
  ensureAudioBuffer();
  recordedBytes = 0;
  if (audioBuffer == nullptr) {
    captionUser = "Mic buffer alloc failed.";
    captionAssistant = "Reset board and try again.";
    updateScreen("MIC FAIL", captionUser, captionAssistant, true);
    appState = STATE_ERROR;
    return;
  }
  if (!initMicrophone()) {
    captionUser = "Mic init failed.";
    captionAssistant = String("WS=") + MIC_WS_PIN + " SCK=" + MIC_SCK_PIN + " SD=" + MIC_SD_PIN;
    updateScreen("MIC FAIL", captionUser, captionAssistant, true);
    appState = STATE_ERROR;
    return;
  }
  recordStartMs = millis();
  recording = true;
  appState = STATE_RECORDING;
  if (!ENABLE_NARA_UI_TEST) {
    updateScreen("LISTENING", "", "", true);
  }
  buzz(47);
}

void captureAudioLoop() {
  if (!recording) return;

  // Button-hold recordings cap at 5s (CONSULT_MAX_AUDIO), not 20s
  const size_t maxBytes = CONSULT_MAX_AUDIO;
  const size_t remaining = maxBytes - recordedBytes;
  if (remaining == 0) {
    recording = false;
    return;
  }

  const size_t bytesToRead = min<size_t>(AUDIO_CHUNK_SIZE, remaining);
  size_t bytesRead = microphoneI2S.readBytes(
    reinterpret_cast<char*>(audioBuffer + WAV_HEADER_SIZE + recordedBytes),
    bytesToRead);
  if (bytesRead > 0) {
    recordedBytes += bytesRead;
  }

  if (recordedBytes >= maxBytes ||
      millis() - recordStartMs >= CONSULT_RECORD_SECONDS * 1000UL) {
    recording = false;
  }
}

void captureAudioForMs(uint32_t durationMs) {
  const unsigned long startedAt = millis();
  while (millis() - startedAt < durationMs && recordedBytes < MAX_AUDIO_BYTES) {
    const size_t remaining = MAX_AUDIO_BYTES - recordedBytes;
    if (remaining == 0) {
      break;
    }

    const size_t bytesToRead = min<size_t>(AUDIO_CHUNK_SIZE, remaining);
    const size_t bytesRead = microphoneI2S.readBytes(
      reinterpret_cast<char*>(audioBuffer + WAV_HEADER_SIZE + recordedBytes),
      bytesToRead);
    if (bytesRead > 0) {
      recordedBytes += bytesRead;
    }
    delay(1);
  }
}

void endRecording() {
  recording = false;
  stopMicrophone();
  writeWavHeader(audioBuffer, recordedBytes);
  buzz(10);
}

void finalizeHoldToSpeakRecording() {
  if (recording) {
    Serial.printf("[Mic] Capturing %lu ms release tail\n",
      static_cast<unsigned long>(HOLD_TO_SPEAK_RELEASE_TAIL_MS));
    captureAudioForMs(HOLD_TO_SPEAK_RELEASE_TAIL_MS);
    endRecording();
  } else {
    stopMicrophone();
    if (recordedBytes > 0) {
      writeWavHeader(audioBuffer, recordedBytes);
    }
  }

  Serial.printf("[Mic] Finalized hold-to-speak with %u bytes\n",
    static_cast<unsigned>(recordedBytes));
  MicrophoneSnapshot snapshot;
  if (captureRecordedAudioSnapshot(snapshot)) {
    Serial.printf("[Mic] Hold capture min=%d max=%d avg=%ld peak=%u\n",
      snapshot.minimum,
      snapshot.maximum,
      static_cast<long>(snapshot.average),
      snapshot.peak);
    if (snapshot.railHigh) {
      Serial.println("[Mic] Hold capture looks stuck HIGH");
    } else if (snapshot.railLow) {
      Serial.println("[Mic] Hold capture looks stuck LOW");
    } else if (snapshot.flatline) {
      Serial.println("[Mic] Hold capture looks flat");
    }
  }
}

bool recordMicrophoneForMs(uint32_t durationMs) {
  ensureAudioBuffer();
  if (audioBuffer == nullptr) {
    Serial.println("[Mic] Audio buffer allocation failed");
    return false;
  }

  recordedBytes = 0;
  if (!initMicrophone()) {
    Serial.printf("[Mic] Init failed on %s channel\n", micChannelName());
    return false;
  }

  captureAudioForMs(durationMs);

  stopMicrophone();

  if (recordedBytes == 0) {
    Serial.println("[Mic] No audio captured");
    return false;
  }

  writeWavHeader(audioBuffer, recordedBytes);

  MicrophoneSnapshot snapshot;
  if (captureRecordedAudioSnapshot(snapshot)) {
    Serial.printf(
      "[Mic] Captured %u bytes on %s channel min=%d max=%d avg=%ld peak=%u\n",
      static_cast<unsigned>(recordedBytes),
      micChannelName(),
      snapshot.minimum,
      snapshot.maximum,
      static_cast<long>(snapshot.average),
      snapshot.peak);

    if (snapshot.railHigh) {
      Serial.println("[Mic] Recorded audio looks stuck HIGH");
    } else if (snapshot.railLow) {
      Serial.println("[Mic] Recorded audio looks stuck LOW");
    } else if (snapshot.flatline) {
      Serial.println("[Mic] Recorded audio looks flat");
    }
  }

  return true;
}

String deepgramTranscribe() {
  if (!ENABLE_NARA_UI_TEST) {
    updateScreen("TRANSCRIBING");
  }
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = "https://api.deepgram.com/v1/listen?model=" + deepgramModel +
               "&language=" + deepgramLanguage +
               "&smart_format=true&punctuate=true";

  if (!http.begin(client, url)) {
    return "";
  }

  http.addHeader("Authorization", "Token " + deepgramApiKey);
  http.addHeader("Content-Type", "audio/wav");

  const int code = http.POST(audioBuffer, recordedBytes + WAV_HEADER_SIZE);
  const String body = http.getString();
  http.end();

  if (code <= 0) {
    Serial.printf("[Deepgram] HTTP error %d\n", code);
    return "";
  }

  Serial.printf("[Deepgram] HTTP %d\n", code);
  if (code < 200 || code >= 300) {
    Serial.println("[Deepgram] Response:");
    Serial.println(body);
    return "";
  }

  String transcript;
  if (!extractDeepgramTranscript(body, transcript)) {
    Serial.println("[Deepgram] Transcript extraction failed");
    Serial.println(body);
    return "";
  }

  transcript.trim();
  return transcript;
}

String openaiReply(const String& transcript) {
  updateScreen("THINKING", transcript, "", true);
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  auto requestReply = [&](const String& systemInstruction, float temperature, int maxCompletionTokens) -> String {
    if (!http.begin(client, openaiApiBaseUrl + "/v1/chat/completions")) {
      return "";
    }

    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + openaiApiKey);

    JsonDocument doc;
    doc["model"] = openaiModel;
    JsonArray messages = doc["messages"].to<JsonArray>();
    JsonObject sys = messages.add<JsonObject>();
    sys["role"] = "system";
    sys["content"] = systemInstruction;
    JsonObject user = messages.add<JsonObject>();
    user["role"] = "user";
    user["content"] = transcript;
    doc["temperature"] = temperature;
    if (maxCompletionTokens > 0) {
      doc["max_completion_tokens"] = maxCompletionTokens;
    }

    String payload;
    serializeJson(doc, payload);

    const int code = http.POST(payload);
    if (code <= 0) {
      Serial.printf("[OpenAI] HTTP error %d\n", code);
      http.end();
      return "";
    }

    const String body = http.getString();
    http.end();

    JsonDocument response;
    if (deserializeJson(response, body) != DeserializationError::Ok) {
      Serial.println("[OpenAI] Parse failed");
      return "";
    }

    String reply = response["choices"][0]["message"]["content"].as<String>();
    reply.replace("\n", " ");
    reply.trim();
    return reply;
  };

  const bool strictMode = isStrictEmoticonPrompt();
  String rawReply = requestReply(dynamicPrompt(), strictMode ? 0.1f : 0.6f, strictMode ? 8 : 0);
  if (!strictMode) {
    return rawReply;
  }

  Serial.println("[OpenAI] Raw reply: " + rawReply);
  String finalReply = enforceSingleEmoticonReply(rawReply);
  if (!finalReply.isEmpty()) {
    Serial.println("[OpenAI] Final reply: " + finalReply);
    return finalReply;
  }

  const String repairPrompt =
    "Reply with exactly one ASCII emoticon and nothing else. "
    "No Unicode emoji. No words. No quotes. "
    "Valid examples: :) :( :D :P ;) :| <3 T_T -_- ._.";
  rawReply = requestReply(repairPrompt, 0.0f, 6);
  Serial.println("[OpenAI] Repair reply: " + rawReply);
  finalReply = enforceSingleEmoticonReply(rawReply);
  if (!finalReply.isEmpty()) {
    Serial.println("[OpenAI] Final reply: " + finalReply);
    return finalReply;
  }

  Serial.println("[OpenAI] No ASCII emoticon returned");
  return "";
}

void processInjectedTranscript(String transcript) {
  transcript.trim();
  if (transcript.isEmpty()) {
    return;
  }

  Serial.println("[Injected] " + transcript);
  captionUser = transcript;
  appState = STATE_THINKING;

  const String reply = openaiReply(transcript);
  if (reply.isEmpty()) {
    captionAssistant = "OpenAI request failed.";
    updateScreen("LLM FAIL", captionUser, captionAssistant, true);
    appState = STATE_IDLE;
    return;
  }

  Serial.println("[AI] " + reply);
  captionAssistant = reply;
  startResultGallery();
  vibrateReplyPattern();
}

bool runCaptionPass(uint32_t durationMs) {
  if (!wifiConnected) {
    Serial.println("[Caption] WiFi not connected");
    return false;
  }

  if (!hasDeepgramConfig()) {
    Serial.println("[Caption] Deepgram API key missing");
    return false;
  }

  appState = STATE_RECORDING;
  captionUser = "Listening...";
  captionAssistant = String("Mic ") + micChannelName();
  updateScreen("LISTEN", captionUser, captionAssistant, true);
  Serial.printf("[Caption] Recording %lu ms on %s channel\n",
    static_cast<unsigned long>(durationMs), micChannelName());

  if (!recordMicrophoneForMs(durationMs)) {
    captionUser = "Mic capture failed.";
    captionAssistant = String("Channel ") + micChannelName();
    updateScreen("MIC FAIL", captionUser, captionAssistant, true);
    appState = STATE_IDLE;
    return false;
  }

  appState = STATE_TRANSCRIBING;
  const String transcript = deepgramTranscribe();
  if (transcript.isEmpty()) {
    captionUser = "No speech recognized.";
    captionAssistant = String("Mic ") + micChannelName();
    updateScreen("NO SPEECH", captionUser, captionAssistant, true);
    Serial.println("[Caption] No speech recognized");
    appState = STATE_IDLE;
    return false;
  }

  captionUser = transcript;
  Serial.println("[Caption] " + transcript);

  if (openaiApiKey.isEmpty()) {
    captionAssistant = String("Deepgram ") + micChannelName();
    updateScreen("CAPTION", captionUser, captionAssistant, true);
    appState = STATE_IDLE;
    return true;
  }

  appState = STATE_THINKING;
  captionAssistant = "Thinking...";
  updateScreen("THINK", captionUser, captionAssistant, true);

  const String reply = openaiReply(transcript);
  if (reply.isEmpty()) {
    captionAssistant = "OpenAI request failed.";
    updateScreen("LLM FAIL", captionUser, captionAssistant, true);
    Serial.println("[AI] OpenAI request failed");
    appState = STATE_IDLE;
    return false;
  }

  captionAssistant = reply;
  startResultGallery();
  Serial.println("[AI] " + reply);
  vibrateReplyPattern();
  return true;
}

// Maddi context ingestion: sends WAV audio to /ingest-audio Edge Function
// Fire-and-forget — stores a T1 signal for context building
void maddiIngest() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = supabaseUrl + "/functions/v1/ingest-audio";
  if (!http.begin(client, url)) {
    Serial.println("[Maddi:Ingest] HTTP begin failed");
    return;
  }

  http.addHeader("Content-Type", "audio/wav");
  http.addHeader("Authorization", "Bearer " + supabaseAnonKey);
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("X-Device-Key", deviceApiKey);
  http.setTimeout(10000);

  // Read motion state from IMU
  String motionState = "unknown";
  if (ENABLE_IMU) {
    sensors_event_t accel, gyro, temp;
    mpu.getEvent(&accel, &gyro, &temp);
    float totalAccel = sqrt(
      accel.acceleration.x * accel.acceleration.x +
      accel.acceleration.y * accel.acceleration.y +
      accel.acceleration.z * accel.acceleration.z
    );
    if (totalAccel < 10.5) motionState = "still";
    else if (totalAccel < 13.0) motionState = "walking";
    else motionState = "active";
  }
  http.addHeader("X-Motion-State", motionState);

  // Send on-device YAMNet classification results
  if (yamnetReady && lastClassification.confidence > 0) {
    http.addHeader("X-Environment-Class", lastEnvironmentLabel);
    http.addHeader("X-Ambient-Events", lastAmbientEvents);
    http.addHeader("X-YAMNet-Label", String(lastClassification.label));
    http.addHeader("X-YAMNet-Confidence", String(lastClassification.confidence, 2));
  }

  // Send audio energy level for environment context
  {
    const int16_t* samples = reinterpret_cast<const int16_t*>(audioBuffer + WAV_HEADER_SIZE);
    const size_t count = recordedBytes / sizeof(int16_t);
    double sumSq = 0;
    for (size_t i = 0; i < count; i++) { double s = samples[i]; sumSq += s * s; }
    double rms = sqrt(sumSq / max(count, (size_t)1));
    if (rms < 1.0) rms = 1.0;
    float rmsDb = 20.0 * log10(rms / 32768.0);
    http.addHeader("X-Audio-Rms-Db", String(rmsDb, 1));
    Serial.printf("[Maddi:Ingest] POSTing %d bytes to /ingest-audio (motion: %s, rms: %.1fdB)\n",
      recordedBytes + WAV_HEADER_SIZE, motionState.c_str(), rmsDb);
  }
  const int code = http.POST(audioBuffer, recordedBytes + WAV_HEADER_SIZE);

  if (code >= 200 && code < 300) {
    const String body = http.getString();
    Serial.printf("[Maddi:Ingest] OK — %s\n", body.c_str());
  } else {
    Serial.printf("[Maddi:Ingest] Failed HTTP %d\n", code);
  }
  http.end();
}

// Maddi consultation: sends WAV audio to /consult Edge Function
// Returns true on success, populating glyphIds[] and consultWord
String consultGlyphIds[3];
String consultWord;

bool maddiConsult() {
  if (supabaseUrl.isEmpty() || deviceApiKey.isEmpty()) {
    Serial.println("[Maddi] supabase_url or device_api_key not configured");
    return false;
  }

  if (!ENABLE_NARA_UI_TEST) {
    updateScreen("CONSULTING");
  }
  WiFiClientSecure client;
  client.setInsecure();  // TODO: add cert pinning for production
  HTTPClient http;

  String url = supabaseUrl + "/functions/v1/consult";
  if (!http.begin(client, url)) {
    Serial.println("[Maddi] HTTP begin failed");
    return false;
  }

  http.addHeader("Content-Type", "audio/wav");
  http.addHeader("Authorization", "Bearer " + supabaseAnonKey);
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("X-Device-Key", deviceApiKey);
  http.setTimeout(30000);  // 30s timeout — pipeline takes 15-20s

  Serial.printf("[Maddi] POSTing %d bytes to /consult\n", recordedBytes + WAV_HEADER_SIZE);
  const int code = http.POST(audioBuffer, recordedBytes + WAV_HEADER_SIZE);
  const String body = http.getString();
  http.end();

  if (code <= 0) {
    Serial.printf("[Maddi] HTTP error %d\n", code);
    return false;
  }
  if (code < 200 || code >= 300) {
    Serial.printf("[Maddi] HTTP %d\n", code);
    Serial.println(body);
    return false;
  }

  // Parse response: {"glyphs":["spiral","mirror","bridge"],"word":"reflect","consultation_id":1,"latency_ms":2800}
  JsonDocument doc;
  if (deserializeJson(doc, body) != DeserializationError::Ok) {
    Serial.println("[Maddi] JSON parse failed");
    Serial.println(body);
    return false;
  }

  JsonArray glyphs = doc["glyphs"];
  if (glyphs.size() < 3) {
    Serial.println("[Maddi] Expected 3 glyphs");
    return false;
  }

  for (int i = 0; i < 3; i++) {
    consultGlyphIds[i] = glyphs[i].as<String>();
  }
  consultWord = doc["word"].as<String>();
  int latencyMs = doc["latency_ms"] | 0;

  Serial.printf("[Maddi] Glyphs: %s, %s, %s | Word: %s | Latency: %dms\n",
    consultGlyphIds[0].c_str(), consultGlyphIds[1].c_str(), consultGlyphIds[2].c_str(),
    consultWord.c_str(), latencyMs);

  return true;
}

void renderMaddiResult() {
  if (!displayReady) return;
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setFont(&FreeMonoBold9pt7b);

    // Draw the word prominently at top
    String upperWord = consultWord;
    upperWord.toUpperCase();
    int16_t x1, y1;
    uint16_t w, h;
    display.getTextBounds(upperWord, 0, 0, &x1, &y1, &w, &h);
    display.setCursor((200 - (int16_t)w) / 2, 40);
    display.print(upperWord);

    const int16_t topRowY = 68;
    const int16_t bottomRowY = 118;
    const int16_t topLeftX = 46;
    const int16_t topRightX = 106;
    const int16_t bottomCenterX = 76;
    const int16_t glyphPositions[3][2] = {
      {topLeftX, topRowY},
      {topRightX, topRowY},
      {bottomCenterX, bottomRowY},
    };

    for (int i = 0; i < 3; i++) {
      const uint8_t* bitmap = nullptr;
      for (size_t j = 0; j < CONSULT_GLYPH_BITMAP_COUNT; j++) {
        if (consultGlyphIds[i].equalsIgnoreCase(CONSULT_GLYPH_BITMAPS[j].id)) {
          bitmap = CONSULT_GLYPH_BITMAPS[j].bitmap;
          break;
        }
      }

      const int16_t drawX = glyphPositions[i][0];
      const int16_t drawY = glyphPositions[i][1];
      if (bitmap != nullptr) {
        display.drawBitmap(
          drawX,
          drawY,
          bitmap,
          CONSULT_GLYPH_BITMAP_WIDTH,
          CONSULT_GLYPH_BITMAP_HEIGHT,
          GxEPD_BLACK
        );
      } else {
        String fallback = consultGlyphIds[i];
        fallback.toUpperCase();
        display.getTextBounds(fallback, 0, 0, &x1, &y1, &w, &h);
        display.setCursor(drawX + (CONSULT_GLYPH_BITMAP_WIDTH - static_cast<int16_t>(w)) / 2, drawY + 28);
        display.print(truncateForDisplay(fallback, 8));
      }
    }

    display.drawLine(20, 172, 180, 172, GxEPD_BLACK);

    // Label at bottom
    display.getTextBounds("NARA", 0, 0, &x1, &y1, &w, &h);
    display.setCursor((200 - (int16_t)w) / 2, 192);
    display.print("NARA");
  } while (display.nextPage());
}

bool updateNaraButtonState(NaraButtonState& button) {
  const bool rawPressed = (digitalRead(button.pin) != button.idleLevel);
  if (rawPressed != button.lastRawPressed) {
    button.lastRawPressed = rawPressed;
    button.lastChangeMs = millis();
  }

  if (rawPressed == button.stablePressed) {
    return false;
  }

  if (millis() - button.lastChangeMs < BUTTON_DEBOUNCE_MS) {
    return false;
  }

  button.stablePressed = rawPressed;
  return true;
}

void initializeNaraButtonState(NaraButtonState& button) {
  button.idleLevel = digitalRead(button.pin);
  button.lastRawPressed = false;
  button.stablePressed = false;
  button.lastChangeMs = millis();
}

String normalizeGlyphId(const String& rawId) {
  String normalized = rawId;
  normalized.trim();
  normalized.toLowerCase();
  if (normalized == "spiral") return "venture";
  if (normalized == "mirror") return "clarity";
  if (normalized == "bridge") return "bond";
  return normalized;
}

const uint8_t* lookupConsultGlyphBitmap(const char* id) {
  if (id == nullptr) return nullptr;
  String normalized = normalizeGlyphId(String(id));
  for (size_t index = 0; index < CONSULT_GLYPH_BITMAP_COUNT; index++) {
    if (normalized.equalsIgnoreCase(CONSULT_GLYPH_BITMAPS[index].id)) {
      return CONSULT_GLYPH_BITMAPS[index].bitmap;
    }
  }
  return nullptr;
}

bool consultGlyphPixelOn(const uint8_t* bitmap, uint16_t x, uint16_t y) {
  const uint16_t bytesPerRow = (CONSULT_GLYPH_BITMAP_WIDTH + 7) / 8;
  const size_t byteIndex = y * bytesPerRow + (x / 8);
  const uint8_t mask = 0x80 >> (x % 8);
  return (pgm_read_byte(bitmap + byteIndex) & mask) != 0;
}

void drawScaledConsultGlyph(int16_t x, int16_t y, const uint8_t* bitmap, uint16_t targetW, uint16_t targetH) {
  if (bitmap == nullptr || targetW == 0 || targetH == 0) return;

  for (uint16_t dy = 0; dy < targetH; dy++) {
    const uint16_t srcY = (dy * CONSULT_GLYPH_BITMAP_HEIGHT) / targetH;
    for (uint16_t dx = 0; dx < targetW; dx++) {
      const uint16_t srcX = (dx * CONSULT_GLYPH_BITMAP_WIDTH) / targetW;
      if (consultGlyphPixelOn(bitmap, srcX, srcY)) {
        display.drawPixel(x + dx, y + dy, GxEPD_BLACK);
      }
    }
  }
}

void drawCenteredTextLine(const String& text, int16_t centerY) {
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(text, 0, centerY, &x1, &y1, &w, &h);
  display.setCursor((display.width() - static_cast<int16_t>(w)) / 2, centerY);
  display.print(text);
}

uint8_t readNaraUiPotBucket(uint8_t bucketCount) {
  if (bucketCount <= 1) return 0;
  return static_cast<uint8_t>(positiveModulo(static_cast<int>(encoderPosition), bucketCount));
}

bool readStableNaraUiPotBucket(uint8_t bucketCount, uint8_t& stableBucket) {
  const int rawBucket = static_cast<int>(readNaraUiPotBucket(bucketCount));
  if (rawBucket != naraUiLastPotBucket) {
    naraUiLastPotBucket = rawBucket;
    naraUiLastPotBucketChangeMs = millis();
    return false;
  }

  if (millis() - naraUiLastPotBucketChangeMs < NARA_UI_POT_SETTLE_MS) {
    return false;
  }

  stableBucket = static_cast<uint8_t>(rawBucket);
  return true;
}

void drawNaraUiHeader(const char* title, const char* code) {
  display.setTextColor(GxEPD_BLACK);
  display.setFont(&FreeMonoBold9pt7b);
  if (title != nullptr && strlen(title) > 0) {
    display.setCursor(10, 26);
    display.print(title);
    display.drawLine(8, 34, 192, 34, GxEPD_BLACK);
  }
}

void splitFooterLabel(const char* label, String& firstLine, String& secondLine) {
  if (label == nullptr) {
    firstLine = "";
    secondLine = "";
    return;
  }

  const String text = String(label);
  const int splitAt = text.indexOf(' ');
  if (splitAt < 0) {
    firstLine = text;
    secondLine = "";
    return;
  }

  firstLine = text.substring(0, splitAt);
  secondLine = text.substring(splitAt + 1);
}

void drawNaraUiFooter(const char* left, const char* right) {
  display.drawLine(8, 172, 192, 172, GxEPD_BLACK);

  String leftTop;
  String leftBottom;
  String rightTop;
  String rightBottom;
  splitFooterLabel(left, leftTop, leftBottom);
  splitFooterLabel(right, rightTop, rightBottom);

  display.setCursor(10, 190);
  display.print(leftTop);
  if (leftBottom.length() > 0) {
    display.setCursor(10, 201);
    display.print(leftBottom);
  }

  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(rightTop, 0, 0, &x1, &y1, &w, &h);
  display.setCursor(display.width() - static_cast<int16_t>(w) - 10, 190);
  display.print(rightTop);
  if (rightBottom.length() > 0) {
    display.getTextBounds(rightBottom, 0, 0, &x1, &y1, &w, &h);
    display.setCursor(display.width() - static_cast<int16_t>(w) - 10, 201);
    display.print(rightBottom);
  }
}

void renderNaraUiIdle() {
  display.setCursor(92, 118);
  display.print("+");
}

void renderNaraUiSplash() {
  display.drawBitmap(0, 0, NARA_LOGO, NARA_LOGO_WIDTH, NARA_LOGO_HEIGHT, GxEPD_BLACK);
}

void renderNaraUiListening() {
  if (naraUiTranscript.length() > 0) {
    drawWrappedText(naraUiTranscript, 16, 90, 168, 18, 4);
    return;
  }

  drawCenteredTextLine("LISTENING", 96);
  drawCenteredTextLine("RELEASE TO END", 126);
}

void renderNaraUiProcessing() {
  if (naraUiTranscript.length() > 0) {
    drawWrappedText(naraUiTranscript, 16, 82, 168, 18, 4);
    drawCenteredTextLine(naraUiProcessingStatus, 164);
    return;
  }

  drawCenteredTextLine("PROCESSING", 96);
  drawCenteredTextLine(naraUiProcessingStatus, 126);
}

void renderNaraUiOutput() {
  display.setFont(&FreeMonoBold12pt7b);
  drawCenteredTextLine(naraCurrentWord, 36);
  display.setFont(&FreeMonoBold9pt7b);

  const int16_t glyphX[3] = {16, 122, 67};
  const int16_t glyphY[3] = {50, 50, 108};
  const int16_t glyphW[3] = {60, 60, 64};
  const int16_t glyphH[3] = {60, 60, 64};

  for (uint8_t index = 0; index < 3; index++) {
    const uint8_t* bitmap = lookupConsultGlyphBitmap(naraCurrentGlyphs[index].c_str());
    if (naraUiOutputFocusIndex == index && !naraUiOutputMenuArmed) {
      display.drawRect(glyphX[index] - 4, glyphY[index] - 4, glyphW[index] + 8, glyphH[index] + 8, GxEPD_BLACK);
    }
    if (bitmap != nullptr) {
      drawScaledConsultGlyph(glyphX[index], glyphY[index], bitmap, glyphW[index], glyphH[index]);
    } else {
      const uint8_t* fallbackBitmap = lookupConsultGlyphBitmap(NARA_SAFE_GALLERY_GLYPHS[index]);
      if (fallbackBitmap != nullptr) {
        drawScaledConsultGlyph(glyphX[index], glyphY[index], fallbackBitmap, glyphW[index], glyphH[index]);
      }
    }
  }
}

void renderNaraUiMenu() {
  const char* labels[] = {"LEXICON", "HISTORY", "SETTINGS"};
  const int16_t centerY[] = {74, 114, 154};

  display.setFont(&FreeMonoBold12pt7b);
  for (uint8_t index = 0; index < 3; index++) {
    int16_t x1, y1;
    uint16_t w, h;
    display.getTextBounds(labels[index], 0, centerY[index], &x1, &y1, &w, &h);
    const int16_t textX = (display.width() - static_cast<int16_t>(w)) / 2;
    if (index == naraUiMenuIndex) {
      display.drawRect(textX - 10, y1 - 8, w + 20, h + 16, GxEPD_BLACK);
    }
    display.setCursor(textX, centerY[index]);
    display.print(labels[index]);
  }
  display.setFont(&FreeMonoBold9pt7b);
}

void renderNaraUiHistory() {
  for (uint8_t row = 0; row < 3; row++) {
    const NaraSampleOutput& entry = naraHistory[row];
    const int16_t y = 58 + row * 40;
    if (row == naraUiHistoryIndex) {
      display.drawRect(10, y - 16, 180, 28, GxEPD_BLACK);
    }
    display.setCursor(16, y);
    display.print(entry.word);

    for (uint8_t glyphIndex = 0; glyphIndex < 3; glyphIndex++) {
      const uint8_t* bitmap = lookupConsultGlyphBitmap(entry.glyphs[glyphIndex]);
      if (bitmap != nullptr) {
        drawScaledConsultGlyph(120 + glyphIndex * 22, y - 14, bitmap, 18, 18);
      }
    }
  }
}

void renderNaraUiSettings() {
  for (uint8_t index = 0; index < 4; index++) {
    const int16_t y = 50 + index * 30;
    if (index == naraUiSettingsIndex) {
      display.drawRect(10, y - 12, 182, 22, GxEPD_BLACK);
    }
    display.setCursor(16, y);
    display.print(naraSettings[index].label);
    display.setCursor(116, y);
    display.print(naraSettings[index].enabled ? "[X] ON" : "[ ] OFF");
  }
}

void renderNaraUiDetail() {
  const uint8_t* bitmap = lookupConsultGlyphBitmap(naraCurrentGlyphs[naraUiDetailGlyphIndex].c_str());
  if (bitmap != nullptr) {
    drawScaledConsultGlyph(52, 56, bitmap, 96, 96);
  }
}

void setNaraCurrentOutputFromSample(const NaraSampleOutput& sample) {
  naraCurrentOutput = sample;
  naraCurrentWord = sample.word;
  for (uint8_t index = 0; index < 3; index++) {
    naraCurrentGlyphs[index] = sample.glyphs[index];
  }
}

void setNaraCurrentOutputFromConsult() {
  naraCurrentWord = consultWord;
  for (uint8_t index = 0; index < 3; index++) {
    naraCurrentGlyphs[index] = normalizeGlyphId(consultGlyphIds[index]);
    Serial.printf("[Nara] Output glyph %u = %s\n", index, naraCurrentGlyphs[index].c_str());
  }
}

void failNaraUiCapture(const String& transcript, const String& status) {
  naraUiTranscript = transcript;
  naraUiProcessingStatus = status;
  naraUiNeedsRender = true;
  renderNaraUiScreen();
  delay(1500);
  naraUiTranscript = "";
  naraUiProcessingStatus = "GLYPHS IN FLIGHT";
  setNaraUiState(NARA_UI_0_IDLE);
}

void processNaraUiCapture() {
  if (recordedBytes == 0) {
    failNaraUiCapture("No audio captured.", "TRY AGAIN");
    return;
  }

  if (!wifiConnected) {
    failNaraUiCapture("WiFi is not connected.", "WIFI FAIL");
    return;
  }

  if (!hasDeepgramConfig()) {
    failNaraUiCapture("Deepgram is not configured.", "CONFIG");
    return;
  }

  appState = STATE_TRANSCRIBING;
  naraUiProcessingStatus = "TRANSCRIBING";
  naraUiNeedsRender = true;
  renderNaraUiScreen();

  const String transcript = deepgramTranscribe();
  if (transcript.isEmpty()) {
    appState = STATE_IDLE;
    failNaraUiCapture("No speech recognized.", "TRY AGAIN");
    return;
  }

  naraUiTranscript = transcript;
  naraUiProcessingStatus = "CONSULTING";
  naraUiNeedsRender = true;
  renderNaraUiScreen();

  if (USE_MADDI_PIPELINE && !supabaseUrl.isEmpty() && !deviceApiKey.isEmpty()) {
    appState = STATE_THINKING;
    if (!maddiConsult()) {
      appState = STATE_IDLE;
      failNaraUiCapture(transcript, "CONSULT FAIL");
      return;
    }
    setNaraCurrentOutputFromConsult();
  } else {
    const NaraSampleOutput& sample =
      NARA_SAMPLE_OUTPUTS[naraUiSampleCursor % (sizeof(NARA_SAMPLE_OUTPUTS) / sizeof(NARA_SAMPLE_OUTPUTS[0]))];
    naraUiSampleCursor++;
    rotateNaraHistory(sample);
    setNaraCurrentOutputFromSample(sample);
  }

  naraUiOutputFocusIndex = 0;
  naraUiOutputMenuArmed = false;
  naraUiProcessingStatus = "GLYPHS IN FLIGHT";
  appState = STATE_IDLE;
  setNaraUiState(NARA_UI_4_OUTPUT);
}

void renderNaraUiLexicon() {
  constexpr int visibleCount = 22;
  constexpr int centerX = 100;
  constexpr int centerY = 102;
  constexpr int radiusX = 68;
  constexpr int radiusY = 48;
  constexpr int lexiconCount = sizeof(NARA_LEXICON_GLYPHS) / sizeof(NARA_LEXICON_GLYPHS[0]);
  const int beforeCenter = (visibleCount - 1) / 2;
  const int afterCenter = visibleCount - 1 - beforeCenter;

  for (int offset = -beforeCenter; offset <= afterCenter; offset++) {
    int glyphIndex = static_cast<int>(naraUiLexiconIndex) + offset;
    while (glyphIndex < 0) glyphIndex += lexiconCount;
    while (glyphIndex >= lexiconCount) glyphIndex -= lexiconCount;

    const uint8_t* bitmap = lookupConsultGlyphBitmap(NARA_LEXICON_GLYPHS[glyphIndex]);
    if (bitmap == nullptr) continue;

    if (offset == 0) {
      display.drawRect(centerX - 34, centerY - 34, 68, 68, GxEPD_BLACK);
      drawScaledConsultGlyph(centerX - 28, centerY - 28, bitmap, 56, 56);
      continue;
    }

    const int ringOffset = (offset < 0) ? (offset + beforeCenter + 1) : (offset + beforeCenter);
    const float angle = ((static_cast<float>(ringOffset) / static_cast<float>(visibleCount - 1)) * TWO_PI) - HALF_PI;
    const int16_t x = centerX + static_cast<int16_t>(cosf(angle) * radiusX);
    const int16_t y = centerY + static_cast<int16_t>(sinf(angle) * radiusY);
    const int distance = abs(offset);
    const uint16_t size = static_cast<uint16_t>(max(12, 22 - distance / 2));
    drawScaledConsultGlyph(x - size / 2, y - size / 2, bitmap, size, size);
  }
}

void setNaraUiState(NaraUiState nextState) {
  naraUiState = nextState;
  naraUiStateStartedMs = millis();
  naraUiLastPotBucket = -1;
  naraUiLastPotBucketChangeMs = millis();
  naraUiLastEncoderPosition = encoderPosition;
  naraUiNeedsRender = true;
}

void renderNaraUiScreen() {
  if (!displayReady) return;

  const uint8_t renderPasses = naraUiNeedsFullRefresh ? 1 : 2;
  for (uint8_t pass = 0; pass < renderPasses; pass++) {
    if (naraUiState == NARA_UI_1_SPLASH || naraUiNeedsFullRefresh) {
      display.setFullWindow();
    } else {
      display.setPartialWindow(0, 0, display.width(), display.height());
    }
    display.firstPage();
    do {
      display.fillScreen(GxEPD_WHITE);
      display.setTextColor(GxEPD_BLACK);
      display.setFont(&FreeMonoBold9pt7b);

      switch (naraUiState) {
        case NARA_UI_0_IDLE:
          drawNaraUiHeader("IDLE", "UI_0");
          renderNaraUiIdle();
          drawNaraUiFooter(naraUiIdlePotBucket == 1 ? "MENU" : "RECORD", "SELECT");
          break;
        case NARA_UI_1_SPLASH:
          renderNaraUiSplash();
          break;
        case NARA_UI_2_LISTENING:
          drawNaraUiHeader("LISTENING", "UI_2");
          renderNaraUiListening();
          drawNaraUiFooter("RECORD", "CANCEL");
          break;
        case NARA_UI_3_PROCESSING:
          drawNaraUiHeader("PROCESSING", "UI_3");
          renderNaraUiProcessing();
          drawNaraUiFooter("THINKING", "AUTO");
          break;
        case NARA_UI_4_OUTPUT:
          drawNaraUiHeader("", "UI_4");
          renderNaraUiOutput();
          drawNaraUiFooter(naraUiOutputMenuArmed ? "MENU" : "GLYPH", "BACK");
          break;
        case NARA_UI_MENU:
          drawNaraUiHeader("MENU", "UI_M");
          renderNaraUiMenu();
          drawNaraUiFooter("ROTATE", "BACK");
          break;
        case NARA_UI_3A_LEXICON:
          drawNaraUiHeader("LEXICON", "UI_3A");
          renderNaraUiLexicon();
          drawNaraUiFooter("ROTATE", "BACK");
          break;
        case NARA_UI_3B_HISTORY:
          drawNaraUiHeader("HISTORY", "UI_3B");
          renderNaraUiHistory();
          drawNaraUiFooter("SELECT", "BACK");
          break;
        case NARA_UI_3C_SETTINGS:
          drawNaraUiHeader("SETTINGS", "UI_3C");
          renderNaraUiSettings();
          drawNaraUiFooter("TOGGLE", "BACK");
          break;
        case NARA_UI_5A_DETAIL:
          drawNaraUiHeader("", "UI_5A");
          renderNaraUiDetail();
          drawNaraUiFooter("ROTATE", "BACK");
          break;
      }
    } while (display.nextPage());
  }

  naraUiNeedsFullRefresh = (naraUiState == NARA_UI_1_SPLASH);
}

void rotateNaraHistory(const NaraSampleOutput& newest) {
  naraHistory[2] = naraHistory[1];
  naraHistory[1] = naraHistory[0];
  naraHistory[0] = newest;
}

void applyNaraUiPotSelection(uint8_t bucket) {
  bool changed = false;
  switch (naraUiState) {
    case NARA_UI_0_IDLE:
      if (bucket != naraUiIdlePotBucket) {
        naraUiIdlePotBucket = bucket;
        changed = true;
      }
      break;
    case NARA_UI_4_OUTPUT:
      if (bucket >= 3) {
        if (!naraUiOutputMenuArmed) {
          naraUiOutputMenuArmed = true;
          changed = true;
        }
      } else {
        if (naraUiOutputMenuArmed || bucket != naraUiOutputFocusIndex) {
          naraUiOutputMenuArmed = false;
          naraUiOutputFocusIndex = bucket;
          changed = true;
        }
      }
      break;
    case NARA_UI_MENU:
      if (bucket != naraUiMenuIndex) {
        naraUiMenuIndex = bucket;
        changed = true;
      }
      break;
    case NARA_UI_3A_LEXICON:
      if (bucket != naraUiLexiconIndex) {
        naraUiLexiconIndex = bucket;
        changed = true;
      }
      break;
    case NARA_UI_3B_HISTORY:
      if (bucket != naraUiHistoryIndex) {
        naraUiHistoryIndex = bucket;
        changed = true;
      }
      break;
    case NARA_UI_3C_SETTINGS:
      if (bucket != naraUiSettingsIndex) {
        naraUiSettingsIndex = bucket;
        changed = true;
      }
      break;
    case NARA_UI_5A_DETAIL:
      if (bucket != naraUiDetailGlyphIndex) {
        naraUiDetailGlyphIndex = bucket;
        changed = true;
      }
      break;
    default:
      break;
  }

  if (changed) {
    naraUiNeedsRender = true;
  }
}

void handleNaraUiSelectPress() {
  switch (naraUiState) {
    case NARA_UI_0_IDLE:
      if (naraUiIdlePotBucket == 1) {
        naraUiReturnState = NARA_UI_0_IDLE;
        naraUiMenuIndex = 0;
        setNaraUiState(NARA_UI_MENU);
      }
      break;
    case NARA_UI_4_OUTPUT:
      if (naraUiOutputMenuArmed) {
        naraUiReturnState = NARA_UI_4_OUTPUT;
        naraUiMenuIndex = 0;
        setNaraUiState(NARA_UI_MENU);
      } else {
        naraUiDetailGlyphIndex = naraUiOutputFocusIndex;
        setNaraUiState(NARA_UI_5A_DETAIL);
      }
      break;
    case NARA_UI_MENU:
      if (naraUiMenuIndex == 0) setNaraUiState(NARA_UI_3A_LEXICON);
      else if (naraUiMenuIndex == 1) setNaraUiState(NARA_UI_3B_HISTORY);
      else setNaraUiState(NARA_UI_3C_SETTINGS);
      break;
    case NARA_UI_3B_HISTORY:
      setNaraCurrentOutputFromSample(naraHistory[naraUiHistoryIndex]);
      naraUiOutputFocusIndex = 0;
      naraUiOutputMenuArmed = false;
      setNaraUiState(NARA_UI_4_OUTPUT);
      break;
    case NARA_UI_3C_SETTINGS:
      naraSettings[naraUiSettingsIndex].enabled = !naraSettings[naraUiSettingsIndex].enabled;
      naraUiNeedsRender = true;
      break;
    default:
      break;
  }
}

void handleNaraUiBackPress() {
  switch (naraUiState) {
    case NARA_UI_2_LISTENING:
      setNaraUiState(NARA_UI_0_IDLE);
      break;
    case NARA_UI_4_OUTPUT:
      setNaraUiState(NARA_UI_0_IDLE);
      break;
    case NARA_UI_MENU:
      setNaraUiState(naraUiReturnState);
      break;
    case NARA_UI_3A_LEXICON:
    case NARA_UI_3B_HISTORY:
    case NARA_UI_3C_SETTINGS:
      setNaraUiState(NARA_UI_MENU);
      break;
    case NARA_UI_5A_DETAIL:
      setNaraUiState(NARA_UI_4_OUTPUT);
      break;
    default:
      break;
  }
}

void startNaraUiTest() {
  initializeNaraButtonState(naraRecordButton);
  initializeNaraButtonState(naraSelectButton);
  initializeNaraButtonState(naraBackButton);
  setNaraCurrentOutputFromSample(NARA_SAMPLE_OUTPUTS[0]);
  naraUiOutputFocusIndex = 0;
  naraUiOutputMenuArmed = false;
  naraUiMenuIndex = 0;
  naraUiHistoryIndex = 0;
  naraUiSettingsIndex = 0;
  naraUiDetailGlyphIndex = 0;
  naraUiLexiconIndex = 0;
  naraUiIdlePotBucket = 0;
  naraUiNeedsRender = true;
  naraUiNeedsFullRefresh = true;
  naraUiRecordArmed = false;
  naraUiTranscript = "";
  naraUiProcessingStatus = "GLYPHS IN FLIGHT";
  naraUiLastPotBucket = -1;
  naraUiLastPotBucketChangeMs = millis();
  naraUiLastEncoderPosition = encoderPosition;
  setNaraUiState(NARA_UI_1_SPLASH);
  renderNaraUiScreen();
}

void processNaraUiTest() {
  updateRotaryEncoder();
  const bool recordChanged = updateNaraButtonState(naraRecordButton);
  const bool selectChanged = updateNaraButtonState(naraSelectButton);
  const bool backChanged = updateNaraButtonState(naraBackButton);

  if (recordChanged && naraRecordButton.stablePressed && naraUiState == NARA_UI_1_SPLASH) {
    naraUiNeedsFullRefresh = false;
    naraUiRecordArmed = false;
    setNaraUiState(NARA_UI_0_IDLE);
  }

  if (naraUiState == NARA_UI_0_IDLE && !naraRecordButton.stablePressed) {
    naraUiRecordArmed = true;
  }

  if (recordChanged && naraRecordButton.stablePressed && naraUiState == NARA_UI_0_IDLE && naraUiRecordArmed) {
    naraUiRecordArmed = false;
    naraUiTranscript = "";
    naraUiProcessingStatus = "GLYPHS IN FLIGHT";
    beginRecording();
    if (appState == STATE_ERROR) {
      setNaraUiState(NARA_UI_0_IDLE);
      return;
    }
    setNaraUiState(NARA_UI_2_LISTENING);
  }

  if (naraUiState == NARA_UI_2_LISTENING && recording) {
    captureAudioLoop();
  }

  if (recordChanged && !naraRecordButton.stablePressed && naraUiState == NARA_UI_2_LISTENING) {
    finalizeHoldToSpeakRecording();
    setNaraUiState(NARA_UI_3_PROCESSING);
    processNaraUiCapture();
  }

  if (selectChanged && naraSelectButton.stablePressed) {
    handleNaraUiSelectPress();
  }

  if (backChanged && naraBackButton.stablePressed) {
    if (naraUiState == NARA_UI_2_LISTENING && recording) {
      recording = false;
      stopMicrophone();
      recordedBytes = 0;
      appState = STATE_IDLE;
    }
    handleNaraUiBackPress();
  }

  const int32_t encoderDelta = encoderPosition - naraUiLastEncoderPosition;
  if (encoderDelta != 0) {
    naraUiLastEncoderPosition = encoderPosition;
    const int step = (encoderDelta > 0) ? 1 : -1;
    const int iterations = abs(static_cast<int>(encoderDelta));

    for (int index = 0; index < iterations; index++) {
      switch (naraUiState) {
        case NARA_UI_0_IDLE:
          naraUiIdlePotBucket = static_cast<uint8_t>(positiveModulo(static_cast<int>(naraUiIdlePotBucket) + step, 2));
          break;
        case NARA_UI_4_OUTPUT: {
          const int currentBucket = naraUiOutputMenuArmed ? 3 : static_cast<int>(naraUiOutputFocusIndex);
          const int nextBucket = positiveModulo(currentBucket + step, 4);
          if (nextBucket == 3) {
            naraUiOutputMenuArmed = true;
          } else {
            naraUiOutputMenuArmed = false;
            naraUiOutputFocusIndex = static_cast<uint8_t>(nextBucket);
          }
          break;
        }
        case NARA_UI_MENU:
          naraUiMenuIndex = static_cast<uint8_t>(positiveModulo(static_cast<int>(naraUiMenuIndex) + step, 3));
          break;
        case NARA_UI_3A_LEXICON: {
          const int count = static_cast<int>(sizeof(NARA_LEXICON_GLYPHS) / sizeof(NARA_LEXICON_GLYPHS[0]));
          naraUiLexiconIndex = static_cast<uint8_t>(positiveModulo(static_cast<int>(naraUiLexiconIndex) + step, count));
          break;
        }
        case NARA_UI_3B_HISTORY:
          naraUiHistoryIndex = static_cast<uint8_t>(positiveModulo(static_cast<int>(naraUiHistoryIndex) + step, 3));
          break;
        case NARA_UI_3C_SETTINGS:
          naraUiSettingsIndex = static_cast<uint8_t>(positiveModulo(static_cast<int>(naraUiSettingsIndex) + step, 4));
          break;
        case NARA_UI_5A_DETAIL:
          naraUiDetailGlyphIndex = static_cast<uint8_t>(positiveModulo(static_cast<int>(naraUiDetailGlyphIndex) + step, 3));
          break;
        default:
          break;
      }
    }
    naraUiNeedsRender = true;
  }

  if ((recordChanged || selectChanged || backChanged) && naraUiState != NARA_UI_1_SPLASH) {
    naraUiNeedsRender = true;
  }

  if (naraUiNeedsRender) {
    renderNaraUiScreen();
    naraUiNeedsRender = false;
  }
}

// ─── VAD: Energy-based voice activity detection ─────────────────────
// Calculates RMS energy (dBFS) of recorded audio buffer.
// Returns true if energy exceeds threshold (speech likely present).

// Calculate RMS energy in 100ms windows. Returns peak window dBFS and overall dBFS.
struct VadResult {
  float overallDb;
  float peakWindowDb;
  int speechWindowCount;  // how many 100ms windows exceeded threshold
};

VadResult calculateVadEnergy() {
  VadResult result = { -100.0, -100.0, 0 };
  if (audioBuffer == nullptr || recordedBytes < 320) return result;

  const int16_t* samples = reinterpret_cast<const int16_t*>(audioBuffer + WAV_HEADER_SIZE);
  const size_t totalSamples = recordedBytes / sizeof(int16_t);
  const size_t windowSize = SAMPLE_RATE / 10;  // 100ms = 1600 samples at 16kHz

  double totalSumSq = 0;
  float peakDb = -100.0;
  int speechWindows = 0;

  for (size_t offset = 0; offset + windowSize <= totalSamples; offset += windowSize) {
    double windowSumSq = 0;
    for (size_t i = 0; i < windowSize; i++) {
      double s = static_cast<double>(samples[offset + i]);
      windowSumSq += s * s;
    }
    totalSumSq += windowSumSq;

    double windowRms = sqrt(windowSumSq / windowSize);
    if (windowRms < 1.0) windowRms = 1.0;
    float windowDb = 20.0 * log10(windowRms / 32768.0);

    if (windowDb > peakDb) peakDb = windowDb;
    if (vadCalibrationCount >= VAD_CALIBRATION_CYCLES && windowDb > vadThresholdDb) {
      speechWindows++;
    }
  }

  double overallRms = sqrt(totalSumSq / totalSamples);
  if (overallRms < 1.0) overallRms = 1.0;
  result.overallDb = 20.0 * log10(overallRms / 32768.0);
  result.peakWindowDb = peakDb;
  result.speechWindowCount = speechWindows;
  return result;
}

bool vadDetectSpeech() {
  VadResult vad = calculateVadEnergy();

  // Auto-calibrate noise floor during first N cycles (use overall RMS)
  if (vadCalibrationCount < VAD_CALIBRATION_CYCLES) {
    vadCalibrationCount++;
    vadNoiseFloorDb = vadNoiseFloorDb + (vad.overallDb - vadNoiseFloorDb) / vadCalibrationCount;
    vadThresholdDb = vadNoiseFloorDb + VAD_MARGIN_DB;
    Serial.printf("[VAD] Calibrating %d/%d: overall=%.1fdB peak=%.1fdB floor=%.1fdB threshold=%.1fdB\n",
      vadCalibrationCount, VAD_CALIBRATION_CYCLES, vad.overallDb, vad.peakWindowDb,
      vadNoiseFloorDb, vadThresholdDb);
    return false;
  }

  // Speech detected if ANY 100ms window exceeded threshold
  bool hasSpeech = vad.speechWindowCount > 0;
  Serial.printf("[VAD] overall=%.1fdB peak=%.1fdB threshold=%.1fdB windows=%d → %s\n",
    vad.overallDb, vad.peakWindowDb, vadThresholdDb,
    vad.speechWindowCount, hasSpeech ? "SPEECH" : "silence");
  return hasSpeech;
}

// ─── Ambient context capture — VAD-gated adaptive pipeline ──────────
// State machine:
//   IDLE → LISTENING (mic on, checking for speech in 100ms windows)
//   LISTENING → RECORDING (speech window detected, start accumulating)
//   LISTENING → IDLE (no speech after LISTEN_WINDOW_MS, rest 10s)
//   RECORDING → SENDING (2s silence or 30s cap → upload)
//   RECORDING → IDLE (button interrupt)
//   SENDING → IDLE (rest 2s after speech)

// Check RMS energy of the most recently captured 100ms window (in-place)
float vadCheckLastWindow() {
  const size_t windowSamples = SAMPLE_RATE / 10;  // 1600 samples = 100ms
  const size_t totalSamples = recordedBytes / sizeof(int16_t);
  if (totalSamples < windowSamples) return -100.0;

  const int16_t* samples = reinterpret_cast<const int16_t*>(audioBuffer + WAV_HEADER_SIZE);
  const size_t start = totalSamples - windowSamples;

  double sumSq = 0;
  for (size_t i = start; i < totalSamples; i++) {
    double s = static_cast<double>(samples[i]);
    sumSq += s * s;
  }
  double rms = sqrt(sumSq / windowSamples);
  if (rms < 1.0) rms = 1.0;
  return 20.0 * log10(rms / 32768.0);
}

void ambientStartListening() {
  if (!wifiConnected || supabaseUrl.isEmpty() || deviceApiKey.isEmpty()) return;
  if (appState != STATE_IDLE) return;
  if (buttonStablePressed) return;

  ensureAudioBuffer();
  if (audioBuffer == nullptr) return;
  recordedBytes = 0;

  if (!initMicrophone()) {
    Serial.println("[Ambient] Mic init failed");
    return;
  }

  ambientState = AMB_LISTENING;
  ambientListenStartMs = millis();
  ambientCycleCount++;
}

void ambientStop() {
  if (ambientState == AMB_IDLE) return;
  stopMicrophone();
  if (recordedBytes > 0) {
    writeWavHeader(audioBuffer, recordedBytes);
  }
  ambientState = AMB_IDLE;
}

void processAmbientStateMachine() {
  // Button interrupt — always takes priority
  if (ambientState != AMB_IDLE && buttonStablePressed) {
    Serial.println("[Ambient] Interrupted by button press");
    ambientStop();
    recordedBytes = 0;
    ambientNextCaptureMs = millis() + 10000;
    return;
  }

  if (ambientState == AMB_IDLE) return;

  // ── Capture a 100ms chunk of audio ──
  const size_t windowBytes = (SAMPLE_RATE / 10) * sizeof(int16_t);  // 3200 bytes = 100ms
  const size_t remaining = AMBIENT_MAX_AUDIO - recordedBytes;

  if (remaining >= windowBytes) {
    size_t totalRead = 0;
    while (totalRead < windowBytes) {
      const size_t toRead = min<size_t>(AUDIO_CHUNK_SIZE, windowBytes - totalRead);
      size_t bytesRead = microphoneI2S.readBytes(
        reinterpret_cast<char*>(audioBuffer + WAV_HEADER_SIZE + recordedBytes + totalRead),
        toRead);
      totalRead += bytesRead;
      if (bytesRead == 0) break;
    }
    recordedBytes += totalRead;
  }

  const float windowDb = vadCheckLastWindow();
  const bool windowHasSpeech = vadCalibrated && (windowDb > vadThresholdDb);

  // ── Calibration phase — learn ambient noise level from listening windows ──
  if (!vadCalibrated && ambientState == AMB_LISTENING) {
    vadCalibrationCount++;
    // Running average of window energy as noise floor
    if (vadCalibrationCount == 1) {
      vadNoiseFloorDb = windowDb;  // reset from initial -50
    } else {
      vadNoiseFloorDb = vadNoiseFloorDb + (windowDb - vadNoiseFloorDb) / vadCalibrationCount;
    }
    // Threshold is the higher of: fixed minimum OR calibrated floor + margin
    float calibratedThreshold = vadNoiseFloorDb + VAD_MARGIN_DB;
    vadThresholdDb = max(VAD_FIXED_THRESHOLD_DB, calibratedThreshold);

    if (vadCalibrationCount % 10 == 0 || vadCalibrationCount >= VAD_CALIBRATION_CYCLES) {
      Serial.printf("[VAD] Calibrating %d/%d: window=%.1fdB floor=%.1fdB threshold=%.1fdB\n",
        vadCalibrationCount, VAD_CALIBRATION_CYCLES, windowDb, vadNoiseFloorDb, vadThresholdDb);
    }
    if (vadCalibrationCount >= VAD_CALIBRATION_CYCLES) {
      vadCalibrated = true;
      Serial.printf("[VAD] Calibration complete. Noise floor: %.1fdB, Threshold: %.1fdB\n",
        vadNoiseFloorDb, vadThresholdDb);
    }
    return;
  }

  const unsigned long now = millis();

  // ── LISTENING: immediately start recording (no VAD gating) ──
  if (ambientState == AMB_LISTENING) {
    ambientState = AMB_RECORDING;
    ambientCaptureStartMs = now;
    ambientLastSpeechMs = now;
    Serial.printf("[Ambient] Recording started (10s capture)\n");
    return;
  }

  // ── RECORDING: accumulate audio for AMBIENT_RECORD_MS, then always send ──
  if (ambientState == AMB_RECORDING) {
    if (windowHasSpeech) {
      ambientLastSpeechMs = now;
    }

    bool timeUp = (now - ambientCaptureStartMs >= AMBIENT_RECORD_MS);
    bool maxCap = (now - ambientCaptureStartMs >= AMBIENT_MAX_RECORD_MS);
    bool bufferFull = (recordedBytes >= AMBIENT_MAX_AUDIO);

    if (timeUp || maxCap || bufferFull) {
      const char* reason = timeUp ? "10s complete" : maxCap ? "30s cap" : "buffer full";
      float durationS = (now - ambientCaptureStartMs) / 1000.0;

      ambientStop();

      if (recordedBytes > SAMPLE_RATE * 2) {
        // Check button before HTTP call
        if (digitalRead(BUTTON_PIN) == LOW) {
          Serial.println("[Ambient] Button pressed before send, skipping");
          recordedBytes = 0;
          ambientNextCaptureMs = now + 10000;
          return;
        }

        ambientSpeechCount++;
        Serial.printf("[Ambient] Recording complete (%s, %.1fs, %u bytes). Sending #%u...\n",
          reason, durationS, recordedBytes, ambientSpeechCount);

        // Run on-device YAMNet classification before sending
        classifyAudioOnDevice();

        statusLine = String("CTX ") + ambientSpeechCount;
        renderStatusOnly();

        maddiIngest();

        statusLine = "READY";
        renderStatusOnly();
      }

      recordedBytes = 0;
      ambientNextCaptureMs = now + AMBIENT_REST_SPEECH_MS;
    }
  }
}

void processRecording() {
  if (recordedBytes == 0) {
    Serial.println("[Mic] No audio captured during hold-to-speak");
    captionUser = "No audio captured.";
    captionAssistant = String("Mic ") + micChannelName();
    updateScreen("MIC FAIL", captionUser, captionAssistant, true);
    appState = STATE_IDLE;
    return;
  }

  if (USE_MADDI_PIPELINE && !supabaseUrl.isEmpty() && !deviceApiKey.isEmpty()) {
    // ─── Maddi path: send audio to /consult, get glyphs + word ───
    // Skip separate ingest — /consult does its own STT.
    // Ambient capture handles context building separately.
    appState = STATE_THINKING;
    updateScreen("THINKING");
    if (!maddiConsult()) {
      captionAssistant = "Consult failed.";
      updateScreen("CONSULT FAIL", "", captionAssistant, true);
      appState = STATE_IDLE;
      return;
    }
    captionUser = consultWord;
    captionAssistant = consultGlyphIds[0] + " / " + consultGlyphIds[1] + " / " + consultGlyphIds[2];
    renderMaddiResult();
    vibrateReplyPattern();
    appState = STATE_SHOWING_RESULT;
    return;
  }

  // ─── Legacy path: direct Deepgram + OpenAI ───
  appState = STATE_TRANSCRIBING;
  const String transcript = deepgramTranscribe();
  if (transcript.isEmpty()) {
    captionUser = "No speech recognized.";
    captionAssistant = "";
    updateScreen("NO SPEECH", captionUser, captionAssistant, true);
    appState = STATE_IDLE;
    return;
  }

  Serial.println("[User] " + transcript);
  captionUser = transcript;

  appState = STATE_THINKING;
  const String reply = openaiReply(transcript);
  if (reply.isEmpty()) {
    captionAssistant = "OpenAI request failed.";
    updateScreen("LLM FAIL", captionUser, captionAssistant, true);
    appState = STATE_IDLE;
    return;
  }

  Serial.println("[AI] " + reply);
  captionAssistant = reply;
  startResultGallery();
  vibrateReplyPattern();
}

void printHardwareSummary() {
  Serial.println("ROCK ESP32-S3");
  Serial.println("INMP441 WS=4 SCK=5 SD=6");
  Serial.println("Focus test: Deepgram captions + OpenAI reply");
  Serial.print("Mic channel: ");
  Serial.println(micChannelName());
  Serial.println("I2C SDA=38 SCL=39");
  Serial.println("DRV2605L + MPU6050 enabled");
  Serial.println("EINK DIN=11 CLK=12 CS=10 DC=13 RST=14 BUSY=9");
}

void runHardwareSelfTest() {
  Serial.println("[HW] Self-test start");
  Serial.println(displayReady ? "[HW] E-paper OK" : "[HW] E-paper init failed");
  if (drvReady) {
    Serial.printf("[HW] DRV2605L OK at 0x%02X\n", drvI2cAddress);
  } else {
    Serial.println("[HW] DRV2605L not found");
  }
  if (mpuReady) {
    Serial.printf("[HW] MPU6050 OK at 0x%02X\n", mpuI2cAddress);
  } else {
    Serial.println("[HW] MPU6050 not found");
  }
  Serial.print("[HW] Mic channel ");
  Serial.println(micChannelName());
  printSensorSnapshot(false);
  Serial.println("[HW] Mic stays idle until hold-to-speak or CAPTION");
  Serial.println("[HW] Use BUZZ, SENSORS, or MONITOR ON to test IMU and haptic");
  Serial.println("[HW] Self-test complete");
}

void setWaitingConfigState() {
  appState = STATE_WAITING_CONFIG;

  if (!hasCloudConfig()) {
    captionUser = wifiConnected ? "WiFi ready. Send cloud config." : "WiFi not connected yet.";
    captionAssistant = "Use SENSORS over serial to test hardware.";
    updateScreen(wifiConnected ? "WAIT API" : "CONFIG", captionUser, captionAssistant, true);
    printConfigTemplate();
    return;
  }

  captionUser = "WiFi connection failed.";
  captionAssistant = "Check hotspot credentials.";
  updateScreen("WIFI FAIL", captionUser, captionAssistant, true);
  printConfigTemplate();
}

void processSensorMonitor() {
  if (!sensorMonitorEnabled || recording) {
    return;
  }

  if (millis() - lastSensorMonitorMs < SENSOR_MONITOR_INTERVAL_MS) {
    return;
  }

  lastSensorMonitorMs = millis();
  printSensorSnapshot(false);
}

void processButtonDiagnostics() {
  const bool rawPressed = readButtonPressedRaw();

  if (rawPressed != buttonLastRawPressed) {
    buttonLastRawPressed = rawPressed;
    lastButtonRawChangeMs = millis();
  }

  if (rawPressed == buttonStablePressed) {
    return;
  }

  if (millis() - lastButtonRawChangeMs < BUTTON_DEBOUNCE_MS) {
    return;
  }

  buttonStablePressed = rawPressed;
  Serial.print("[HW] Button D2 changed: raw=");
  Serial.print(buttonStablePressed ? "LOW" : "HIGH");
  Serial.print(" state=");
  Serial.println(buttonStablePressed ? "PRESSED" : "released");
}

// ── YAMNet initialization ──
void initYamnet() {
  if (yamnetReady) return;  // already initialized

  Serial.println("[YAMNet] Initializing TFLite Micro...");

  // Allocate tensor arena in PSRAM
  if (!yamnetArena) {
    yamnetArena = (uint8_t*)heap_caps_malloc(YAMNET_ARENA_SIZE, MALLOC_CAP_SPIRAM);
  }
  if (!yamnetArena) {
    Serial.println("[YAMNet] PSRAM arena allocation failed!");
    return;
  }
  Serial.printf("[YAMNet] Arena allocated: %d KB in PSRAM\n", YAMNET_ARENA_SIZE / 1024);

  // Load model
  const tflite::Model* model = tflite::GetModel(YAMNET_MODEL_DATA);
  if (model->version() != TFLITE_SCHEMA_VERSION) {
    Serial.printf("[YAMNet] Model schema version mismatch: %lu vs %d\n",
      model->version(), TFLITE_SCHEMA_VERSION);
    return;
  }

  // Register all ops — will narrow down once we know which ones the model uses
  static tflite::AllOpsResolver resolver;

  // Create interpreter
  static tflite::MicroInterpreter staticInterpreter(
    model, resolver, yamnetArena, YAMNET_ARENA_SIZE);
  yamnetInterpreter = &staticInterpreter;

  TfLiteStatus allocStatus = yamnetInterpreter->AllocateTensors();
  if (allocStatus != kTfLiteOk) {
    Serial.println("[YAMNet] AllocateTensors() failed!");
    yamnetInterpreter = nullptr;
    return;
  }

  yamnetInput = yamnetInterpreter->input(0);
  yamnetOutput = yamnetInterpreter->output(0);

  Serial.printf("[YAMNet] Ready! Input: [%d,%d,%d,%d] type=%d, Output: [%d,%d] type=%d\n",
    yamnetInput->dims->data[0], yamnetInput->dims->data[1],
    yamnetInput->dims->data[2], yamnetInput->dims->data[3],
    yamnetInput->type,
    yamnetOutput->dims->data[0], yamnetOutput->dims->data[1],
    yamnetOutput->type);
  Serial.printf("[YAMNet] Arena used: %d of %d bytes\n",
    yamnetInterpreter->arena_used_bytes(), YAMNET_ARENA_SIZE);

  // Init mel filterbank
  initMelFilterbank();
  yamnetReady = true;
}

// ── Run YAMNet classification on recorded audio ──
bool classifyAudioOnDevice() {
  if (!yamnetReady || !yamnetInterpreter || audioBuffer == nullptr) return false;

  const int16_t* pcm = reinterpret_cast<const int16_t*>(audioBuffer + WAV_HEADER_SIZE);
  const int numSamples = recordedBytes / sizeof(int16_t);

  if (numSamples < MEL_AUDIO_SAMPLES) {
    Serial.printf("[YAMNet] Audio too short for classification (%d < %d samples)\n",
      numSamples, MEL_AUDIO_SAMPLES);
    return false;
  }

  // Get input quantization params
  float inputScale = yamnetInput->params.scale;
  int inputZeroPoint = yamnetInput->params.zero_point;

  // Compute mel spectrogram directly into input tensor
  unsigned long t0 = millis();
  bool ok = computeMelSpectrogram(pcm, numSamples, yamnetInput->data.int8, inputScale, inputZeroPoint);
  unsigned long melTime = millis() - t0;

  if (!ok) {
    Serial.println("[YAMNet] Mel spectrogram computation failed");
    return false;
  }

  // Run inference
  t0 = millis();
  TfLiteStatus status = yamnetInterpreter->Invoke();
  unsigned long inferTime = millis() - t0;

  if (status != kTfLiteOk) {
    Serial.println("[YAMNet] Inference failed!");
    return false;
  }

  // Process output — handle both float32 and int8 output types
  if (yamnetOutput->type == kTfLiteFloat32) {
    // Float32 output — read directly
    const float* scores = yamnetOutput->data.f;
    int topIdx[3] = {0, 0, 0};
    float topScores[3] = {-1, -1, -1};
    for (int t = 0; t < 3; t++) {
      for (int i = 0; i < NUM_CLASSES; i++) {
        bool already = false;
        for (int j = 0; j < t; j++) if (topIdx[j] == i) { already = true; break; }
        if (!already && scores[i] > topScores[t]) {
          topScores[t] = scores[i];
          topIdx[t] = i;
        }
      }
    }
    lastClassification.classIndex = topIdx[0];
    lastClassification.label = ESC10_LABELS[topIdx[0]];
    lastClassification.category = ESC10_CATEGORIES[topIdx[0]];
    lastClassification.confidence = topScores[0];
    for (int i = 0; i < 3; i++) {
      lastClassification.labels[i] = ESC10_LABELS[topIdx[i]];
      lastClassification.scores[i] = topScores[i];
    }
  } else {
    // Int8 output — dequantize
    float outputScale = yamnetOutput->params.scale;
    int outputZeroPoint = yamnetOutput->params.zero_point;
    lastClassification = processClassificationOutput(
      yamnetOutput->data.int8, outputScale, outputZeroPoint);
  }

  lastEnvironmentLabel = lastClassification.category;
  lastAmbientEvents = String(lastClassification.labels[0]) + ", " +
                       lastClassification.labels[1] + ", " +
                       lastClassification.labels[2];

  Serial.printf("[YAMNet] %s (%s) %.0f%% in %lums (mel: %lums, infer: %lums) | %s %.0f%%, %s %.0f%%\n",
    lastClassification.label, lastClassification.category,
    lastClassification.confidence * 100,
    melTime + inferTime, melTime, inferTime,
    lastClassification.labels[1], lastClassification.scores[1] * 100,
    lastClassification.labels[2], lastClassification.scores[2] * 100);

  return true;
}

void initializeSystem() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(POT_PIN, INPUT_PULLUP);
  pinMode(GALLERY_POT_PIN, INPUT_PULLUP);
  pinMode(SELECT_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BACK_BUTTON_PIN, INPUT_PULLUP);
  encoderLastClkState = digitalRead(ENCODER_CLK_PIN);
  encoderLastEdgeMs = millis();
  ensureAudioBuffer();
  printHardwareSummary();
  WiFi.onEvent(onWiFiEvent);
  initDisplay();

  if (ENABLE_NARA_UI_TEST) {
    naraUiNeedsFullRefresh = true;
    setNaraUiState(NARA_UI_1_SPLASH);
    renderNaraUiScreen();
    initI2CDevices();
    buttonLastRawPressed = readButtonPressedRaw();
    buttonStablePressed = buttonLastRawPressed;
    buttonWasPressed = buttonStablePressed;
    lastButtonRawChangeMs = millis();
    runHardwareSelfTest();
    lastSensorMonitorMs = millis();
    initYamnet();
    if (loadConfig()) {
      configReceived = validateConfig();
    }
    if (hasWifiConfig()) {
      connectWifi();
    }
    startNaraUiTest();
    return;
  }

  // ── Boot splash: show Maddi logo for 10 seconds ──
  if (displayReady) {
    display.setFullWindow();
    display.firstPage();
    do {
      display.fillScreen(GxEPD_WHITE);
      display.drawBitmap(0, 0, MADDI_LOGO, LOGO_WIDTH, LOGO_HEIGHT, GxEPD_BLACK);
    } while (display.nextPage());
    Serial.println("[Boot] Splash screen displayed (10s)");
    unsigned long splashStart = millis();
    // Continue hardware init during splash wait
    initI2CDevices();
    buttonLastRawPressed = readButtonPressedRaw();
    buttonStablePressed = buttonLastRawPressed;
    buttonWasPressed = buttonStablePressed;
    lastButtonRawChangeMs = millis();
    runHardwareSelfTest();
    lastSensorMonitorMs = millis();
    // Wait remaining time to fill 10s
    while (millis() - splashStart < 10000) {
      delay(100);
    }
  } else {
    initI2CDevices();
    buttonLastRawPressed = readButtonPressedRaw();
    buttonStablePressed = buttonLastRawPressed;
    buttonWasPressed = buttonStablePressed;
    lastButtonRawChangeMs = millis();
    runHardwareSelfTest();
    lastSensorMonitorMs = millis();
  }

  initYamnet();

  if (loadConfig()) {
    configReceived = validateConfig();
  }

  if (hasWifiConfig()) {
    connectWifi();
  }

  if (canRunCaptionMode()) {
    appState = STATE_IDLE;
    captionUser = "Deepgram ready";
    captionAssistant = openaiApiKey.isEmpty()
      ? String("Hold D2 or CAPTION on ") + micChannelName()
      : String("Hold D2 or CAPTION AI on ") + micChannelName();
    updateScreen("READY", captionUser, captionAssistant, true);
  } else if (configReceived && wifiConnected) {
    appState = STATE_IDLE;
    captionUser = "Button D2 ready";
    captionAssistant = "Button logs edges over serial";
    updateScreen("READY", captionUser, captionAssistant, true);
  } else {
    setWaitingConfigState();
  }
}

void processSerialCommands() {
  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\r') {
      continue;
    }
    if (c != '\n') {
      serialLineBuffer += c;
      continue;
    }

    String line = serialLineBuffer;
    serialLineBuffer = "";
    line.trim();
    if (line.isEmpty()) {
      continue;
    }

    if (line.startsWith("{")) {
      if (applyConfigJson(line)) {
        if (hasWifiConfig()) {
          connectWifi();
        }

        if (canRunCaptionMode()) {
          appState = STATE_IDLE;
          captionUser = "Deepgram ready.";
          captionAssistant = openaiApiKey.isEmpty()
            ? String("Hold D2 or CAPTION on ") + micChannelName()
            : String("Hold D2 or CAPTION AI on ") + micChannelName();
          updateScreen("READY", captionUser, captionAssistant, true);
        } else if (validateConfig() && wifiConnected) {
          appState = STATE_IDLE;
          captionUser = "Config saved.";
          captionAssistant = "Push button to talk.";
          updateScreen("READY", captionUser, captionAssistant, true);
          buzz(89);
        } else {
          setWaitingConfigState();
        }
      }
      continue;
    }

    if (line.startsWith("BUZZ")) {
      if (!drvReady) {
        Serial.println("[Haptic] DRV2605L not found");
        continue;
      }

      uint8_t effect = 47;
      const int separator = line.indexOf(':');
      if (separator > 0) {
        const long parsedEffect = line.substring(separator + 1).toInt();
        if (parsedEffect > 0 && parsedEffect <= 123) {
          effect = static_cast<uint8_t>(parsedEffect);
        }
      }

      Serial.print("[Haptic] Effect ");
      Serial.println(effect);
      buzz(effect);
      continue;
    }

    if (line.startsWith("TEST:")) {
      if (openaiApiKey.isEmpty()) {
        Serial.println("[Test] OpenAI API key missing");
        continue;
      }
      if (appState == STATE_IDLE || appState == STATE_SHOWING_RESULT) {
        processInjectedTranscript(line.substring(5));
      } else {
        Serial.println("[Test] Busy");
      }
      continue;
    }

    if (line == "STATUS") {
      Serial.print("[Status] ");
      Serial.println(statusLine);
      Serial.print("[Status] WiFi=");
      Serial.print(wifiConnected ? "connected" : "disconnected");
      Serial.print(" SSID=");
      Serial.println(wifiSsid);
      Serial.print("[Status] Cloud=");
      Serial.println(hasCloudConfig() ? "ready" : "missing config");
      Serial.print("[Status] Deepgram=");
      Serial.println(hasDeepgramConfig() ? "ready" : "missing");
      Serial.print("[Status] Supabase=");
      Serial.println(hasSupabaseConfig() ? "ready" : "missing");
      Serial.print("[Status] OpenAI=");
      Serial.println(openaiApiKey.isEmpty() ? "missing" : "ready");
      Serial.println("[Status] Focus=button+mic");
      Serial.print("[Status] Haptic=");
      if (drvReady) Serial.printf("0x%02X\n", drvI2cAddress);
      else Serial.println("missing");
      Serial.print("[Status] MPU=");
      if (mpuReady) Serial.printf("0x%02X\n", mpuI2cAddress);
      else Serial.println("missing");
      Serial.println(ENABLE_BUTTON_PTT ? "[Status] ButtonPTT=hold-to-speak" : "[Status] ButtonPTT=disabled");
      Serial.print("[Status] MicChannel=");
      Serial.println(micChannelName());
      Serial.print("[Status] CaptionLoop=");
      Serial.println(captionLoopEnabled ? "on" : "off");
      Serial.print("[Status] SystemPrompt=");
      Serial.println(effectiveSystemPrompt());
      Serial.print("[Status] EffectivePrompt=");
      Serial.println(dynamicPrompt());
      Serial.print("[Status] OpenAIModel=");
      Serial.println(openaiModel);
      Serial.println("Supabase URL: " + (supabaseUrl.isEmpty() ? "(not set)" : supabaseUrl));
      Serial.println("Device Key: " + (deviceApiKey.isEmpty() ? "(not set)" : "****" + deviceApiKey.substring(deviceApiKey.length() - 4)));
      Serial.println("Pipeline: " + String(USE_MADDI_PIPELINE && !supabaseUrl.isEmpty() ? "MADDI" : "LEGACY"));
      {
        const char* stateNames[] = {"idle", "listening", "recording", "sending"};
        Serial.printf("Ambient: %s state=%s (cycles: %u, speech: %u)\n",
          ambientCaptureEnabled ? "ON" : "OFF", stateNames[ambientState],
          ambientCycleCount, ambientSpeechCount);
        Serial.printf("VAD: floor=%.1fdB threshold=%.1fdB calibrated=%s\n",
          vadNoiseFloorDb, vadThresholdDb, vadCalibrated ? "yes" : "no");
      }
      continue;
    }

    if (line == "PROMPT") {
      Serial.print("[Prompt] Stored=");
      Serial.println(systemPrompt);
      Serial.print("[Prompt] Active=");
      Serial.println(effectiveSystemPrompt());
      Serial.print("[Prompt] Effective=");
      Serial.println(dynamicPrompt());
      continue;
    }

    if (line == "PROMPT DEFAULT") {
      systemPrompt = DEFAULT_SYSTEM_PROMPT;
      saveConfig();
      Serial.println("[Prompt] Reset to DEFAULT_SYSTEM_PROMPT");
      Serial.print("[Prompt] Stored=");
      Serial.println(systemPrompt);
      continue;
    }

    if (line == "SCAN") {
      printI2CScan();
      continue;
    }

    if (line == "SENSORS") {
      printSensorSnapshot(false);
      continue;
    }

    if (line == "MONITOR ON") {
      sensorMonitorEnabled = true;
      lastSensorMonitorMs = 0;
      Serial.println("[Monitor] ON");
      continue;
    }

    if (line == "MONITOR OFF") {
      sensorMonitorEnabled = false;
      Serial.println("[Monitor] OFF");
      continue;
    }

    if (line == "CAPTION") {
      runCaptionPass(CAPTION_RECORD_MS);
      continue;
    }

    if (line == "CAPTION ON") {
      captionLoopEnabled = true;
      nextCaptionLoopMs = 0;
      Serial.println("[Caption] Loop ON");
      continue;
    }

    if (line == "CAPTION OFF") {
      captionLoopEnabled = false;
      Serial.println("[Caption] Loop OFF");
      continue;
    }

    if (line == "AMBIENT ON") {
      ambientCaptureEnabled = true;
      ambientNextCaptureMs = millis();
      Serial.println("[Ambient] VAD-gated context capture ON");
      continue;
    }

    if (line == "AMBIENT OFF") {
      ambientCaptureEnabled = false;
      ambientStop();
      recordedBytes = 0;
      Serial.printf("[Ambient] Context capture OFF (cycles: %u, speech: %u)\n", ambientCycleCount, ambientSpeechCount);
      continue;
    }

    if (line == "MIC LEFT") {
      micUseRightChannel = false;
      Serial.println("[Mic] Channel set to LEFT");
      continue;
    }

    if (line == "MIC RIGHT") {
      micUseRightChannel = true;
      Serial.println("[Mic] Channel set to RIGHT");
      continue;
    }

    if (line == "HELP") {
      Serial.println("Commands:");
      Serial.println("TEST:<message>  run OpenAI/display path without mic");
      Serial.println("STATUS          print current status");
      Serial.println("SENSORS         print D2 button state and IMU data");
      Serial.println("MONITOR ON      print D2 button state and IMU data every second");
      Serial.println("MONITOR OFF     stop live button and IMU output");
      Serial.println("BUZZ[:n]        trigger DRV2605L effect (default 47)");
      Serial.println("SCAN            scan the I2C bus");
      Serial.println("Hold D2         record while held, then caption and AI reply");
      Serial.println("CAPTION         record 3.5s, caption, then AI reply");
      Serial.println("CAPTION ON      loop mic capture -> caption -> AI");
      Serial.println("CAPTION OFF     stop the Deepgram loop");
      Serial.println("AMBIENT ON      enable always-on context capture");
      Serial.println("AMBIENT OFF     disable always-on context capture");
      Serial.println("MIC LEFT        use left I2S channel");
      Serial.println("MIC RIGHT       use right I2S channel");
      Serial.println("PROMPT          print stored/effective system prompt");
      Serial.println("PROMPT DEFAULT  reset stored prompt to DEFAULT_SYSTEM_PROMPT");
      continue;
    }
  }
}

}  // namespace

void setup() {
  Serial.setRxBufferSize(4096);
  Serial.begin(115200);
  delay(1000);
  initializeSystem();
}

void loop() {
  processSerialCommands();
  updateRotaryEncoder();

  if (ENABLE_NARA_UI_TEST) {
    processNaraUiTest();
    delay(10);
    return;
  }

  processButtonDiagnostics();
  processSensorMonitor();

  if (captionLoopEnabled &&
      !recording &&
      appState != STATE_WAITING_CONFIG &&
      millis() >= nextCaptionLoopMs) {
    runCaptionPass(CAPTION_RECORD_MS);
    nextCaptionLoopMs = millis() + CAPTION_LOOP_GAP_MS;
  }

  if (appState == STATE_WAITING_CONFIG) {
    if (receiveConfig()) {
      configReceived = validateConfig();
      if (hasWifiConfig()) {
        connectWifi();
      }

      if (canRunCaptionMode()) {
        appState = STATE_IDLE;
        captionUser = "Deepgram ready.";
        captionAssistant = String("CAPTION ON with ") + micChannelName();
        updateScreen("READY", captionUser, captionAssistant, true);
      } else if (configReceived && wifiConnected) {
        appState = STATE_IDLE;
        captionUser = "Config saved.";
        captionAssistant = "Push button to talk.";
        updateScreen("READY", captionUser, captionAssistant, true);
        buzz(89);
      } else {
        setWaitingConfigState();
      }
    }
    delay(20);
    return;
  }

  if (appState == STATE_SHOWING_RESULT) {
    updateResultGalleryFromPot();
  }

  const bool buttonPressed = buttonStablePressed;

  if (!ENABLE_BUTTON_PTT) {
    buttonWasPressed = buttonPressed;
    delay(10);
    return;
  }

  // Maddi dismiss-on-button: if a result is showing in Maddi pipeline mode,
  // a button press returns to idle. Gallery scrolling is pot-driven now
  // (see updateResultGalleryFromPot above), so the button is free for this.
  if (buttonPressed &&
      !buttonWasPressed &&
      appState == STATE_SHOWING_RESULT &&
      USE_MADDI_PIPELINE &&
      !supabaseUrl.isEmpty()) {
    Serial.println("[Button] Dismissing Maddi result, returning to idle");
    updateScreen("READY", captionUser, captionAssistant, true);
    appState = STATE_IDLE;
  } else if (buttonPressed &&
      !buttonWasPressed &&
      !captionLoopEnabled &&
      appState == STATE_IDLE) {
    // Interrupt ambient capture if running
    if (ambientState != AMB_IDLE) {
      Serial.println("[Button] Interrupting ambient capture for consultation");
      ambientStop();
      recordedBytes = 0;
    }
    Serial.println("[Button] Press detected, starting recording");
    beginRecording();
  }

  if (buttonPressed && recording) {
    captureAudioLoop();
  }

  if (!buttonPressed &&
      buttonWasPressed &&
      appState == STATE_RECORDING) {
    Serial.println("[Button] Release detected, stopping recording");
    finalizeHoldToSpeakRecording();
    processRecording();
  }

  // ─── Ambient context capture — VAD-gated state machine ───
  if (ambientCaptureEnabled &&
      USE_MADDI_PIPELINE &&
      !supabaseUrl.isEmpty() &&
      wifiConnected &&
      appState == STATE_IDLE &&
      !recording &&
      !captionLoopEnabled) {

    if (ambientState != AMB_IDLE) {
      processAmbientStateMachine();
    } else if (millis() >= ambientNextCaptureMs) {
      ambientStartListening();
    }
  }

  buttonWasPressed = buttonPressed;
  delay((ambientState == AMB_LISTENING || ambientState == AMB_RECORDING) ? 1 : (recording ? 1 : 10));
}
