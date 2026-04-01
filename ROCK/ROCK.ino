#include <WiFi.h>
#include <ArduinoASRChat.h>
#include <ArduinoGPTChat.h>
#include <ArduinoTTSChat.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "Audio.h"

Audio audio;

namespace {

constexpr int I2S_DOUT = 47;
constexpr int I2S_BCLK = 48;
constexpr int I2S_LRC = 45;

constexpr int I2S_MIC_SERIAL_CLOCK = 5;
constexpr int I2S_MIC_LEFT_RIGHT_CLOCK = 4;
constexpr int I2S_MIC_SERIAL_DATA = 6;

constexpr int BOOT_BUTTON_PIN = 0;
constexpr int SAMPLE_RATE = 16000;

constexpr char CONFIG_NAMESPACE[] = "voice_config";
constexpr char DEFAULT_ASR_CLUSTER[] = "volcengine_input_en";
constexpr char DEFAULT_OPENAI_BASE_URL[] = "https://api.openai.com";
constexpr char DEFAULT_SYSTEM_PROMPT[] =
  "You are a concise voice assistant running on an ESP32-S3. "
  "Keep replies brief, clear, and natural for spoken playback.";
constexpr char DEFAULT_TTS_VOICE_ID[] = "female-tianmei";
constexpr char DEFAULT_TTS_MODEL[] = "speech-2.6-hd";
constexpr char DEFAULT_TTS_AUDIO_FORMAT[] = "mp3";

String wifi_ssid;
String wifi_password;
String subscription = "free";
String asr_api_key;
String asr_cluster = DEFAULT_ASR_CLUSTER;
String openai_apiKey;
String openai_apiBaseUrl = DEFAULT_OPENAI_BASE_URL;
String system_prompt = DEFAULT_SYSTEM_PROMPT;
String minimax_apiKey;
String minimax_groupId;
String tts_voice_id = DEFAULT_TTS_VOICE_ID;
float tts_speed = 1.0f;
float tts_volume = 1.0f;
String tts_model = DEFAULT_TTS_MODEL;
String tts_audio_format = DEFAULT_TTS_AUDIO_FORMAT;
int tts_sample_rate = 16000;
int tts_bitrate = 32000;

bool configReceived = false;
bool systemInitialized = false;
bool ttsCompleted = false;

ArduinoASRChat* asrChat = nullptr;
ArduinoGPTChat* gptChat = nullptr;
ArduinoTTSChat* ttsChat = nullptr;
Preferences preferences;

enum ConversationState {
  STATE_WAITING_CONFIG,
  STATE_IDLE,
  STATE_LISTENING,
  STATE_PROCESSING_LLM,
  STATE_PLAYING_TTS,
  STATE_WAIT_TTS_COMPLETE
};

ConversationState currentState = STATE_WAITING_CONFIG;
bool continuousMode = false;
bool buttonPressed = false;
bool wasButtonPressed = false;
unsigned long ttsStartTime = 0;
unsigned long ttsCheckTime = 0;

void onTTSComplete();
void onTTSError(const char* error);
void stopContinuousMode();
void startContinuousMode();
void handleASRResult();

void printConfigTemplate() {
  Serial.println();
  Serial.println("Send a single-line JSON document over Serial, then press BOOT.");
  Serial.println(
    "{\"wifi_ssid\":\"YOUR_WIFI\",\"wifi_password\":\"YOUR_WIFI_PASSWORD\","
    "\"subscription\":\"free\",\"asr_api_key\":\"YOUR_VOLCENGINE_ASR_KEY\","
    "\"asr_cluster\":\"volcengine_input_en\",\"openai_apiKey\":\"YOUR_OPENAI_KEY\","
    "\"openai_apiBaseUrl\":\"https://api.openai.com\","
    "\"system_prompt\":\"You are a concise voice assistant.\"}");
  Serial.println();
  Serial.println("Optional pro fields:");
  Serial.println(
    "{\"minimax_apiKey\":\"YOUR_MINIMAX_KEY\",\"minimax_groupId\":\"YOUR_GROUP_ID\","
    "\"tts_voice_id\":\"female-tianmei\",\"tts_speed\":1.0,\"tts_volume\":1.0,"
    "\"tts_model\":\"speech-2.6-hd\",\"tts_audio_format\":\"mp3\","
    "\"tts_sample_rate\":16000,\"tts_bitrate\":32000}");
  Serial.println();
}

bool saveConfigToFlash() {
  preferences.begin(CONFIG_NAMESPACE, false);
  preferences.putString("wifi_ssid", wifi_ssid);
  preferences.putString("wifi_pass", wifi_password);
  preferences.putString("subscription", subscription);
  preferences.putString("asr_key", asr_api_key);
  preferences.putString("asr_cluster", asr_cluster);
  preferences.putString("openai_key", openai_apiKey);
  preferences.putString("openai_url", openai_apiBaseUrl);
  preferences.putString("sys_prompt", system_prompt);
  preferences.putString("minimax_key", minimax_apiKey);
  preferences.putString("minimax_gid", minimax_groupId);
  preferences.putString("tts_voice", tts_voice_id);
  preferences.putFloat("tts_speed", tts_speed);
  preferences.putFloat("tts_volume", tts_volume);
  preferences.putString("tts_model", tts_model);
  preferences.putString("tts_format", tts_audio_format);
  preferences.putInt("tts_sample", tts_sample_rate);
  preferences.putInt("tts_bitrate", tts_bitrate);
  preferences.putBool("configured", true);
  preferences.end();
  Serial.println("[Flash] Configuration saved");
  return true;
}

bool loadConfigFromFlash() {
  preferences.begin(CONFIG_NAMESPACE, true);
  const bool configured = preferences.getBool("configured", false);
  if (!configured) {
    preferences.end();
    Serial.println("[Flash] No saved configuration");
    return false;
  }

  wifi_ssid = preferences.getString("wifi_ssid", "");
  wifi_password = preferences.getString("wifi_pass", "");
  subscription = preferences.getString("subscription", "free");
  asr_api_key = preferences.getString("asr_key", "");
  asr_cluster = preferences.getString("asr_cluster", DEFAULT_ASR_CLUSTER);
  openai_apiKey = preferences.getString("openai_key", "");
  openai_apiBaseUrl = preferences.getString("openai_url", DEFAULT_OPENAI_BASE_URL);
  system_prompt = preferences.getString("sys_prompt", DEFAULT_SYSTEM_PROMPT);
  minimax_apiKey = preferences.getString("minimax_key", "");
  minimax_groupId = preferences.getString("minimax_gid", "");
  tts_voice_id = preferences.getString("tts_voice", DEFAULT_TTS_VOICE_ID);
  tts_speed = preferences.getFloat("tts_speed", 1.0f);
  tts_volume = preferences.getFloat("tts_volume", 1.0f);
  tts_model = preferences.getString("tts_model", DEFAULT_TTS_MODEL);
  tts_audio_format = preferences.getString("tts_format", DEFAULT_TTS_AUDIO_FORMAT);
  tts_sample_rate = preferences.getInt("tts_sample", 16000);
  tts_bitrate = preferences.getInt("tts_bitrate", 32000);
  preferences.end();

  Serial.println("[Flash] Configuration loaded");
  Serial.println("[Flash] Subscription: " + subscription);
  Serial.println("[Flash] WiFi SSID: " + wifi_ssid);
  return true;
}

bool validateConfig() {
  if (wifi_ssid.isEmpty() || wifi_password.isEmpty()) {
    Serial.println("[Config] Missing WiFi credentials");
    return false;
  }
  if (asr_api_key.isEmpty()) {
    Serial.println("[Config] Missing Volcengine ASR API key");
    return false;
  }
  if (openai_apiKey.isEmpty()) {
    Serial.println("[Config] Missing OpenAI API key");
    return false;
  }
  if (subscription == "pro" && (minimax_apiKey.isEmpty() || minimax_groupId.isEmpty())) {
    Serial.println("[Config] Pro mode requires MiniMax API key and group ID");
    return false;
  }
  return true;
}

bool receiveConfig() {
  static String jsonBuffer;
  static unsigned long lastReceiveTime = 0;
  static bool receiving = false;

  if (!receiving && Serial.available() > 0) {
    while (Serial.available() > 0 && Serial.peek() != '{') {
      Serial.read();
    }
  }

  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (c == '{' && !receiving) {
      jsonBuffer = "{";
      receiving = true;
      lastReceiveTime = millis();
      continue;
    }

    if (!receiving) {
      continue;
    }

    jsonBuffer += c;
    lastReceiveTime = millis();

    if (c != '}') {
      continue;
    }

    delay(200);
    int noDataCount = 0;
    while (noDataCount < 10) {
      if (Serial.available() > 0) {
        const char extra = static_cast<char>(Serial.read());
        if (extra == '\n' || extra == '\r') {
          break;
        }
        jsonBuffer += extra;
        noDataCount = 0;
        delay(2);
      } else {
        delay(5);
        noDataCount++;
      }
    }

    jsonBuffer.trim();
    if (!jsonBuffer.startsWith("{") || !jsonBuffer.endsWith("}")) {
      jsonBuffer = "";
      receiving = false;
      return false;
    }

    JsonDocument doc;
    const DeserializationError error = deserializeJson(doc, jsonBuffer);
    jsonBuffer = "";
    receiving = false;

    if (error) {
      Serial.print("[Config] JSON parse failed: ");
      Serial.println(error.c_str());
      return false;
    }

    if (doc["wifi_ssid"].is<String>()) {
      wifi_ssid = doc["wifi_ssid"].as<String>();
    }
    if (doc["wifi_password"].is<String>()) {
      wifi_password = doc["wifi_password"].as<String>();
    }
    if (doc["subscription"].is<String>()) {
      subscription = doc["subscription"].as<String>();
      subscription.toLowerCase();
    }
    if (doc["asr_api_key"].is<String>()) {
      asr_api_key = doc["asr_api_key"].as<String>();
    }
    if (doc["asr_cluster"].is<String>()) {
      asr_cluster = doc["asr_cluster"].as<String>();
    }
    if (doc["openai_apiKey"].is<String>()) {
      openai_apiKey = doc["openai_apiKey"].as<String>();
    }
    if (doc["openai_apiBaseUrl"].is<String>()) {
      openai_apiBaseUrl = doc["openai_apiBaseUrl"].as<String>();
    }
    if (doc["system_prompt"].is<String>()) {
      system_prompt = doc["system_prompt"].as<String>();
    }
    if (doc["minimax_apiKey"].is<String>()) {
      minimax_apiKey = doc["minimax_apiKey"].as<String>();
    }
    if (doc["minimax_groupId"].is<String>()) {
      minimax_groupId = doc["minimax_groupId"].as<String>();
    }
    if (doc["tts_voice_id"].is<String>()) {
      tts_voice_id = doc["tts_voice_id"].as<String>();
    }
    if (doc["tts_speed"].is<float>()) {
      tts_speed = doc["tts_speed"].as<float>();
    }
    if (doc["tts_volume"].is<float>()) {
      tts_volume = doc["tts_volume"].as<float>();
    }
    if (doc["tts_model"].is<String>()) {
      tts_model = doc["tts_model"].as<String>();
    }
    if (doc["tts_audio_format"].is<String>()) {
      tts_audio_format = doc["tts_audio_format"].as<String>();
    }
    if (doc["tts_sample_rate"].is<int>()) {
      tts_sample_rate = doc["tts_sample_rate"].as<int>();
    }
    if (doc["tts_bitrate"].is<int>()) {
      tts_bitrate = doc["tts_bitrate"].as<int>();
    }

    if (!validateConfig()) {
      return false;
    }

    Serial.println("[Config] Configuration received");
    Serial.println("[Config] Mode: " + subscription);
    return true;
  }

  if (receiving && jsonBuffer.length() > 0 && millis() - lastReceiveTime > 3000) {
    Serial.println("[Config] Receive timeout, clearing buffer");
    jsonBuffer = "";
    receiving = false;
  }

  return false;
}

bool connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
  Serial.println("[WiFi] Connecting...");

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 30) {
    Serial.print('.');
    delay(500);
    attempt++;
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Connection failed");
    return false;
  }

  Serial.println("[WiFi] Connected");
  Serial.print("[WiFi] IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[System] Free heap: ");
  Serial.println(ESP.getFreeHeap());
  return true;
}

bool initializeSystem() {
  if (!validateConfig()) {
    return false;
  }

  Serial.println("[System] Initializing");
  if (!connectWifi()) {
    return false;
  }

  asrChat = new ArduinoASRChat(asr_api_key.c_str(), asr_cluster.c_str());
  gptChat = new ArduinoGPTChat(openai_apiKey.c_str(), openai_apiBaseUrl.c_str());
  gptChat->setSystemPrompt(system_prompt.c_str());
  gptChat->enableMemory(true);

  if (!asrChat->initINMP441Microphone(
        I2S_MIC_SERIAL_CLOCK,
        I2S_MIC_LEFT_RIGHT_CLOCK,
        I2S_MIC_SERIAL_DATA)) {
    Serial.println("[ASR] Microphone init failed");
    return false;
  }

  asrChat->setAudioParams(SAMPLE_RATE, 16, 1);
  asrChat->setSilenceDuration(1000);
  asrChat->setMaxRecordingSeconds(50);
  asrChat->setTimeoutNoSpeechCallback([]() {
    if (continuousMode) {
      stopContinuousMode();
    }
  });

  if (!asrChat->connectWebSocket()) {
    Serial.println("[ASR] WebSocket connection failed");
    return false;
  }
  Serial.println("[ASR] Ready");

  if (subscription == "pro") {
    ttsChat = new ArduinoTTSChat(minimax_apiKey.c_str());
    ttsChat->setVoiceId(tts_voice_id.c_str());
    ttsChat->setSpeed(tts_speed);
    ttsChat->setVolume(tts_volume);
    ttsChat->setAudioParams(tts_sample_rate, tts_bitrate);

    if (!ttsChat->initMAX98357Speaker(I2S_BCLK, I2S_LRC, I2S_DOUT)) {
      Serial.println("[TTS] MAX98357 init failed");
      return false;
    }

    ttsChat->setCompletionCallback(onTTSComplete);
    ttsChat->setErrorCallback(onTTSError);

    if (!ttsChat->connectWebSocket()) {
      Serial.println("[TTS] MiniMax WebSocket connection failed");
      return false;
    }
    Serial.println("[TTS] MiniMax WebSocket mode ready");
  } else {
    audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
    audio.setVolume(20);
    Serial.println("[TTS] OpenAI audio mode ready");
  }

  Serial.println("[System] Ready");
  Serial.println("[System] Press BOOT to start or stop conversation");
  return true;
}

void onTTSComplete() {
  Serial.println("[TTS] Playback completed");
  ttsCompleted = true;
}

void onTTSError(const char* error) {
  Serial.print("[TTS] Error: ");
  Serial.println(error);
  ttsCompleted = true;
}

void startContinuousMode() {
  continuousMode = true;
  currentState = STATE_LISTENING;
  Serial.println("[Conversation] Started");

  if (!asrChat->startRecording()) {
    Serial.println("[ASR] Failed to start recording");
    continuousMode = false;
    currentState = STATE_IDLE;
    return;
  }
  Serial.println("[ASR] Listening...");
}

void stopContinuousMode() {
  continuousMode = false;
  if (asrChat != nullptr && asrChat->isRecording()) {
    asrChat->stopRecording();
  }
  currentState = STATE_IDLE;
  Serial.println("[Conversation] Stopped");
}

void handleASRResult() {
  const String transcribedText = asrChat->getRecognizedText();
  asrChat->clearResult();

  if (transcribedText.isEmpty()) {
    Serial.println("[ASR] No text recognized");
    if (continuousMode) {
      delay(250);
      currentState = STATE_LISTENING;
      if (asrChat->startRecording()) {
        Serial.println("[ASR] Listening...");
      } else {
        stopContinuousMode();
      }
    } else {
      currentState = STATE_IDLE;
    }
    return;
  }

  Serial.println("[ASR] Recognized: " + transcribedText);
  currentState = STATE_PROCESSING_LLM;
  const String response = gptChat->sendMessage(transcribedText);

  if (response.isEmpty()) {
    Serial.println("[LLM] No response received");
    if (continuousMode) {
      delay(250);
      currentState = STATE_LISTENING;
      if (asrChat->startRecording()) {
        Serial.println("[ASR] Listening...");
      } else {
        stopContinuousMode();
      }
    } else {
      currentState = STATE_IDLE;
    }
    return;
  }

  Serial.println("[LLM] Response: " + response);
  currentState = STATE_PLAYING_TTS;

  bool success = false;
  if (subscription == "pro") {
    ttsCompleted = false;
    success = ttsChat->speak(response.c_str());
  } else {
    success = gptChat->textToSpeech(response);
  }

  if (!success) {
    Serial.println("[TTS] Failed to start playback");
    if (continuousMode) {
      delay(250);
      currentState = STATE_LISTENING;
      if (asrChat->startRecording()) {
        Serial.println("[ASR] Listening...");
      } else {
        stopContinuousMode();
      }
    } else {
      currentState = STATE_IDLE;
    }
    return;
  }

  currentState = STATE_WAIT_TTS_COMPLETE;
  ttsStartTime = millis();
  ttsCheckTime = millis();
}

}  // namespace

void setup() {
  Serial.setRxBufferSize(4096);
  Serial.begin(115200);
  delay(1000);

  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  randomSeed(analogRead(0) + millis());

  Serial.println();
  Serial.println("ESP32-S3 DAZI-AI Voice Assistant");
  Serial.println("Board target: Waveshare ESP32-S3 WROOM N32R16");
  Serial.println("Mic pins: BCLK=5 WS=4 SD=6");
  Serial.println("Speaker pins: BCLK=48 LRC=45 DIN=47");

  if (loadConfigFromFlash()) {
    configReceived = true;
    Serial.println("[Startup] Saved config available");
    Serial.println("[Startup] Send new JSON before pressing BOOT to replace it");
  } else {
    printConfigTemplate();
  }

  Serial.println("[Startup] Press BOOT to initialize after config is present");
}

void loop() {
  if (currentState == STATE_WAITING_CONFIG) {
    if (receiveConfig()) {
      configReceived = true;
      Serial.println("[Startup] New config staged; press BOOT to initialize and save");
    }

    buttonPressed = digitalRead(BOOT_BUTTON_PIN) == LOW;
    if (buttonPressed && !wasButtonPressed && configReceived && !systemInitialized) {
      wasButtonPressed = true;
      if (initializeSystem()) {
        systemInitialized = true;
        saveConfigToFlash();
        delay(500);
        startContinuousMode();
      } else {
        Serial.println("[Startup] Initialization failed");
      }
    } else if (!buttonPressed && wasButtonPressed) {
      wasButtonPressed = false;
    }

    delay(50);
    return;
  }

  if (subscription == "pro" && ttsChat != nullptr) {
    ttsChat->loop();
  } else {
    audio.loop();
  }

  if (asrChat != nullptr) {
    asrChat->loop();
  }

  buttonPressed = digitalRead(BOOT_BUTTON_PIN) == LOW;
  if (buttonPressed && !wasButtonPressed) {
    wasButtonPressed = true;
    if (continuousMode) {
      stopContinuousMode();
    }
  } else if (!buttonPressed && wasButtonPressed) {
    wasButtonPressed = false;
  }

  switch (currentState) {
    case STATE_IDLE:
      break;
    case STATE_LISTENING:
      if (asrChat->hasNewResult()) {
        handleASRResult();
      }
      break;
    case STATE_PROCESSING_LLM:
    case STATE_PLAYING_TTS:
      break;
    case STATE_WAIT_TTS_COMPLETE:
      if (millis() - ttsCheckTime > 100) {
        ttsCheckTime = millis();
        bool playbackComplete = false;
        if (subscription == "pro") {
          playbackComplete = ttsCompleted || !ttsChat->isPlaying();
        } else {
          playbackComplete = !audio.isRunning();
        }

        if (playbackComplete) {
          Serial.println("[TTS] Playback finished");
          if (continuousMode) {
            delay(250);
            currentState = STATE_LISTENING;
            if (asrChat->startRecording()) {
              Serial.println("[ASR] Listening...");
            } else {
              stopContinuousMode();
            }
          } else {
            currentState = STATE_IDLE;
          }
        } else if (millis() - ttsStartTime > 60000) {
          Serial.println("[TTS] Timeout");
          if (subscription == "pro" && ttsChat != nullptr) {
            ttsChat->stop();
          }
          if (continuousMode) {
            currentState = STATE_LISTENING;
            if (asrChat->startRecording()) {
              Serial.println("[ASR] Listening...");
            } else {
              stopContinuousMode();
            }
          } else {
            currentState = STATE_IDLE;
          }
        }
      }
      break;
    case STATE_WAITING_CONFIG:
      break;
  }

  if (currentState == STATE_LISTENING || currentState == STATE_WAIT_TTS_COMPLETE) {
    delay(1);
  } else {
    delay(10);
  }
}
