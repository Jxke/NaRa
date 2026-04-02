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
#include <Adafruit_DRV2605.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "esp_heap_caps.h"

namespace {

constexpr char CONFIG_NAMESPACE[] = "rock_cfg";
constexpr char DEFAULT_OPENAI_BASE_URL[] = "https://api.openai.com";
constexpr char DEFAULT_OPENAI_MODEL[] = "gpt-4.1-nano";
constexpr char DEFAULT_DEEPGRAM_MODEL[] = "nova-2-general";
constexpr char DEFAULT_DEEPGRAM_LANGUAGE[] = "en-US";
constexpr char DEFAULT_SYSTEM_PROMPT[] =
  "You are a concise embedded assistant. Answer clearly and briefly.";

constexpr int BUTTON_PIN = 2;
constexpr int POT_PIN = 8;

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

constexpr uint32_t SAMPLE_RATE = 16000;
constexpr uint16_t WAV_HEADER_SIZE = 44;
constexpr uint32_t MAX_RECORD_SECONDS = 10;
constexpr size_t MAX_AUDIO_BYTES = SAMPLE_RATE * 2 * MAX_RECORD_SECONDS;
constexpr uint32_t AUDIO_CHUNK_SIZE = 1024;

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

String wifiSsid;
String wifiPassword;
String deepgramApiKey;
String openaiApiKey;
String openaiApiBaseUrl = DEFAULT_OPENAI_BASE_URL;
String openaiModel = DEFAULT_OPENAI_MODEL;
String deepgramModel = DEFAULT_DEEPGRAM_MODEL;
String deepgramLanguage = DEFAULT_DEEPGRAM_LANGUAGE;
String systemPrompt = DEFAULT_SYSTEM_PROMPT;

bool configReceived = false;
bool wifiConnected = false;
bool displayReady = false;
bool drvReady = false;
bool mpuReady = false;
bool recording = false;
bool buttonWasPressed = false;

uint8_t* audioBuffer = nullptr;
size_t recordedBytes = 0;
unsigned long recordStartMs = 0;

String statusLine = "BOOT";
String captionUser;
String captionAssistant;
String serialLineBuffer;

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

void buzz(uint8_t effect = 1) {
  if (!drvReady) return;
  drv.setWaveform(0, effect);
  drv.setWaveform(1, 0);
  drv.go();
}

String truncateForDisplay(const String& input, size_t maxLen) {
  if (input.length() <= maxLen) return input;
  if (maxLen < 4) return input.substring(0, maxLen);
  return input.substring(0, maxLen - 3) + "...";
}

int responseWordLimit() {
  const int raw = analogRead(POT_PIN);
  return map(raw, 0, 4095, 12, 80);
}

String dynamicPrompt() {
  String prompt = systemPrompt;
  prompt += " Keep the reply under ";
  prompt += String(responseWordLimit());
  prompt += " words.";
  return prompt;
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
  wifiSsid = preferences.getString("wifi_ssid", "");
  wifiPassword = preferences.getString("wifi_pass", "");
  deepgramApiKey = preferences.getString("deepgram_key", "");
  openaiApiKey = preferences.getString("openai_key", "");
  openaiApiBaseUrl = preferences.getString("openai_url", DEFAULT_OPENAI_BASE_URL);
  openaiModel = preferences.getString("openai_model", DEFAULT_OPENAI_MODEL);
  deepgramModel = preferences.getString("dg_model", DEFAULT_DEEPGRAM_MODEL);
  deepgramLanguage = preferences.getString("dg_lang", DEFAULT_DEEPGRAM_LANGUAGE);
  systemPrompt = preferences.getString("sys_prompt", DEFAULT_SYSTEM_PROMPT);
  preferences.end();
  return true;
}

bool validateConfig() {
  return !wifiSsid.isEmpty() &&
         !wifiPassword.isEmpty() &&
         !deepgramApiKey.isEmpty() &&
         !openaiApiKey.isEmpty();
}

void printConfigTemplate() {
  Serial.println("Send one JSON line over serial:");
  Serial.println(
    "{\"wifi_ssid\":\"YOUR_WIFI\",\"wifi_password\":\"YOUR_WIFI_PASSWORD\","
    "\"deepgram_api_key\":\"YOUR_DEEPGRAM_KEY\",\"deepgram_model\":\"nova-2-general\","
    "\"deepgram_language\":\"en-US\",\"openai_apiKey\":\"YOUR_OPENAI_KEY\","
    "\"openai_apiBaseUrl\":\"https://api.openai.com\",\"openai_model\":\"gpt-4.1-nano\","
    "\"system_prompt\":\"You are a concise embedded assistant.\"}");
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

    JsonDocument doc;
    const DeserializationError error = deserializeJson(doc, jsonBuffer);
    jsonBuffer = "";
    receiving = false;
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
    if (doc["system_prompt"].is<String>()) systemPrompt = doc["system_prompt"].as<String>();

    if (!validateConfig()) {
      Serial.println("[Config] Missing required fields");
      return false;
    }

    saveConfig();
    configReceived = true;
    Serial.println("[Config] Saved");
    return true;
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

void initI2CDevices() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  drvReady = drv.begin();
  if (drvReady) {
    drv.selectLibrary(1);
    drv.setMode(DRV2605_MODE_INTTRIG);
  }

  mpuReady = mpu.begin(0x68, &Wire);
  if (mpuReady) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }
}

bool initMicrophone() {
  microphoneI2S.setPins(MIC_SCK_PIN, MIC_WS_PIN, -1, MIC_SD_PIN);
  return microphoneI2S.begin(I2S_MODE_STD, SAMPLE_RATE, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO, I2S_STD_SLOT_LEFT);
}

void stopMicrophone() {
  microphoneI2S.end();
}

void ensureAudioBuffer() {
  if (audioBuffer != nullptr) return;
  audioBuffer = static_cast<uint8_t*>(heap_caps_malloc(MAX_AUDIO_BYTES + WAV_HEADER_SIZE, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT));
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

void beginRecording() {
  ensureAudioBuffer();
  recordedBytes = 0;
  if (!initMicrophone()) {
    updateScreen("MIC FAIL", "", "", true);
    appState = STATE_ERROR;
    return;
  }
  recordStartMs = millis();
  recording = true;
  appState = STATE_RECORDING;
  updateScreen("LISTENING", "", "", true);
  buzz(47);
}

void captureAudioLoop() {
  if (!recording) return;

  size_t bytesRead = microphoneI2S.readBytes(reinterpret_cast<char*>(audioBuffer + WAV_HEADER_SIZE + recordedBytes), AUDIO_CHUNK_SIZE);
  if (bytesRead > 0) {
    recordedBytes = min(recordedBytes + bytesRead, MAX_AUDIO_BYTES);
  }

  if (millis() - recordStartMs >= MAX_RECORD_SECONDS * 1000UL) {
    recording = false;
  }
}

void endRecording() {
  recording = false;
  stopMicrophone();
  writeWavHeader(audioBuffer, recordedBytes);
  buzz(10);
}

String deepgramTranscribe() {
  updateScreen("TRANSCRIBING");
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
  if (code <= 0) {
    Serial.printf("[Deepgram] HTTP error %d\n", code);
    http.end();
    return "";
  }

  const String body = http.getString();
  http.end();

  JsonDocument doc;
  if (deserializeJson(doc, body) != DeserializationError::Ok) {
    Serial.println("[Deepgram] Parse failed");
    return "";
  }

  String transcript = doc["results"]["channels"][0]["alternatives"][0]["transcript"].as<String>();
  transcript.trim();
  return transcript;
}

String openaiReply(const String& transcript) {
  updateScreen("THINKING", transcript, "", true);
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

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
  sys["content"] = dynamicPrompt();
  JsonObject user = messages.add<JsonObject>();
  user["role"] = "user";
  user["content"] = transcript;
  doc["temperature"] = 0.6;

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
  updateScreen("READY", captionUser, captionAssistant, true);
  buzz(74);
  appState = STATE_SHOWING_RESULT;
}

void processRecording() {
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
  updateScreen("READY", captionUser, captionAssistant, true);
  buzz(74);
  appState = STATE_SHOWING_RESULT;
}

void printHardwareSummary() {
  Serial.println("ROCK ESP32-S3");
  Serial.println("PTT button GPIO2");
  Serial.println("Pot GPIO8");
  Serial.println("INMP441 WS=4 SCK=5 SD=6");
  Serial.println("I2C SDA=38 SCL=39");
  Serial.println("EINK DIN=11 CLK=12 CS=10 DC=13 RST=14 BUSY=9");
}

void initializeSystem() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(POT_PIN, INPUT);
  printHardwareSummary();
  initDisplay();
  initI2CDevices();

  if (loadConfig()) {
    configReceived = validateConfig();
  }

  if (configReceived && connectWifi()) {
    appState = STATE_IDLE;
    captionUser = drvReady ? "DRV2605L OK" : "DRV2605L not found";
    captionAssistant = mpuReady ? "MPU6050 OK" : "MPU6050 not found";
    updateScreen("READY", captionUser, captionAssistant, true);
  } else {
    appState = STATE_WAITING_CONFIG;
    captionUser = "Send JSON config over Serial.";
    captionAssistant = "Then press button.";
    updateScreen("CONFIG", captionUser, captionAssistant, true);
    printConfigTemplate();
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

    if (line.startsWith("TEST:")) {
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
      continue;
    }

    if (line == "HELP") {
      Serial.println("Commands:");
      Serial.println("TEST:<message>  run OpenAI/display path without mic");
      Serial.println("STATUS          print current status");
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

  if (appState == STATE_WAITING_CONFIG) {
    if (receiveConfig()) {
      if (connectWifi()) {
        appState = STATE_IDLE;
        captionUser = "Config saved.";
        captionAssistant = "Push button to talk.";
        updateScreen("READY", captionUser, captionAssistant, true);
        buzz(89);
      } else {
        captionUser = "WiFi connection failed.";
        captionAssistant = "Check credentials.";
        updateScreen("WIFI FAIL", captionUser, captionAssistant, true);
      }
    }
    delay(20);
    return;
  }

  const bool buttonPressed = digitalRead(BUTTON_PIN) == LOW;

  if (buttonPressed && !buttonWasPressed && (appState == STATE_IDLE || appState == STATE_SHOWING_RESULT)) {
    beginRecording();
  }

  if (buttonPressed && recording) {
    captureAudioLoop();
  }

  if (!buttonPressed && buttonWasPressed && recording) {
    endRecording();
    processRecording();
  }

  buttonWasPressed = buttonPressed;
  delay(recording ? 1 : 10);
}
