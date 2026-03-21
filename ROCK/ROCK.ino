#include <SPI.h>
#include <Wire.h>
#include <math.h>
#include <Adafruit_GFX.h>
#include "Adafruit_GC9A01A.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_AHTX0.h>
#include <Arduino_RouterBridge.h>

// --- Display pins ---
#define TFT_SCK  13
#define TFT_MOSI 11
#define TFT_DC   10
#define TFT_CS    9
#define TFT_RST   8

Adafruit_GC9A01A display(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCK, TFT_RST);
Adafruit_MPU6050 mpu;
Adafruit_AHTX0 aht;

// --- Eye geometry ---
const int16_t W = 240, H = 240;
const int16_t EYE_R   = 55;
const int16_t PUPIL_R = 20;
const int16_t OUTLINE = 2;
const int16_t LEFT_CX  = W / 4;
const int16_t RIGHT_CX = 3 * W / 4;
const int16_t CY       = H / 2;
const float   SCALE    = 10.0f;
const float   ALPHA    = 0.60f;

const int32_t EYE_R2   = (int32_t)EYE_R * EYE_R;
const int32_t INNER_R2 = (int32_t)(EYE_R - OUTLINE) * (EYE_R - OUTLINE);
const int32_t PUPIL_R2 = (int32_t)PUPIL_R * PUPIL_R;
const int16_t DIAM     = EYE_R * 2 + 1;

uint16_t eyeBuf[DIAM * DIAM];

float   fx = 0.0f, fy = 0.0f;
int16_t prevPx = 0, prevPy = 0;
bool    forceRedraw = false;
float   axBias = 0.0f, ayBias = 0.0f;

unsigned long lastSensorPrint = 0;
bool ahtOk = false;

// --- Emoji pixel buffer (40x40 RGB565 in each pupil) ---
const int     EMOJI_SIZE  = PUPIL_R * 2; // 40x40
uint16_t      emojiPixels[EMOJI_SIZE * EMOJI_SIZE];
bool          hasEmoji      = false;
unsigned long emojiShownAt  = 0;
const unsigned long EMOJI_TIMEOUT = 10000; // ms

// --- Button (D2) ---
#define BTN_PIN 2
bool micActive = false;
bool btnStablePressed = false;
bool btnRawState = false;
unsigned long lastBtnEdgeMs = 0;
const unsigned long BTN_DEBOUNCE_MS = 35;

// --- MCU analog mic (A0) stream to Debian via Bridge.notify("audio", int8[128]) ---
#define SAMPLE_RATE    8000
#define AUDIO_BUFSIZE  128
#define US_PER_SAMPLE  (1000000UL / SAMPLE_RATE)

float    dcEst       = 2048.0f;
float    smoothed    = 0.0f;
int8_t   audioBuf[AUDIO_BUFSIZE];
int      audioBufIdx = 0;
uint32_t nextSampleUs = 0;

// --- Linux -> MCU monitor command parser (EMOJI:H/S/N, CLEAR) ---
#define MON_CMD_SIZE 32
char monCmd[MON_CMD_SIZE];
int  monCmdLen = 0;

// RGB565 colors
#define C_BLACK   0x0000
#define C_WHITE   0xFFFF
#define C_YELLOW  0xFFE0

inline uint16_t getPupilColor(int32_t pdx, int32_t pdy) {
  if (!hasEmoji) return C_BLACK;
  int ex = (int)pdx + EMOJI_SIZE / 2;
  int ey = (int)pdy + EMOJI_SIZE / 2;
  if (ex < 0 || ex >= EMOJI_SIZE || ey < 0 || ey >= EMOJI_SIZE)
    return C_WHITE;
  return emojiPixels[ey * EMOJI_SIZE + ex];
}

void drawEyeFB(int16_t cx, int16_t cy, int16_t px, int16_t py) {
  for (int16_t row = 0; row < DIAM; row++) {
    int32_t ey   = row - EYE_R;
    int32_t ey2  = ey * ey;
    int32_t pdy  = ey - py;
    int32_t pdy2 = pdy * pdy;

    for (int16_t col = 0; col < DIAM; col++) {
      int32_t ex  = col - EYE_R;
      int32_t er2 = ex * ex + ey2;
      int32_t pdx = ex - px;
      int32_t pr2 = pdx * pdx + pdy2;

      uint16_t color;
      if      (er2 > EYE_R2)    color = C_WHITE;
      else if (er2 >= INNER_R2) color = C_BLACK;
      else if (pr2 <= PUPIL_R2) color = getPupilColor(pdx, pdy);
      else                      color = C_WHITE;

      eyeBuf[row * DIAM + col] = color;
    }
  }
  display.drawRGBBitmap(cx - EYE_R, cy - EYE_R, eyeBuf, DIAM, DIAM);
}

static int16_t voiceFilter(int raw) {
  dcEst    = 0.995f * dcEst + 0.005f * (float)raw;
  float c  = (float)raw - dcEst;
  if (fabsf(c) < 12.0f) c = 0.0f;
  smoothed = 0.65f * smoothed + 0.35f * c;
  float s  = smoothed * 10.0f;
  if (s >  32767.0f) s =  32767.0f;
  if (s < -32768.0f) s = -32768.0f;
  return (int16_t)s;
}

static void sendAudioPacket() {
  MsgPack::arr_t<int8_t> pkt;
  pkt.reserve(AUDIO_BUFSIZE);
  for (int i = 0; i < AUDIO_BUFSIZE; i++) {
    pkt.push_back(audioBuf[i]);
  }
  Bridge.notify("audio", pkt);
}

static void startMicCapture() {
  micActive = true;
  audioBufIdx = 0;
  dcEst = 2048.0f;
  smoothed = 0.0f;
  nextSampleUs = micros();
  Monitor.println("MIC:START");
}

static void stopMicCapture() {
  if (audioBufIdx > 0) {
    for (int i = audioBufIdx; i < AUDIO_BUFSIZE; i++) {
      audioBuf[i] = 0;
    }
    sendAudioPacket();
    audioBufIdx = 0;
  }
  micActive = false;
  Monitor.println("MIC:STOP");
}

static void sampleMicWhilePressed() {
  if (!micActive) return;

  uint32_t nowUs = micros();
  while ((int32_t)(nowUs - nextSampleUs) >= 0) {
    nextSampleUs += US_PER_SAMPLE;

    int16_t filtered = voiceFilter(analogRead(A0));
    audioBuf[audioBufIdx++] = (int8_t)(filtered >> 8);

    if (audioBufIdx >= AUDIO_BUFSIZE) {
      sendAudioPacket();
      audioBufIdx = 0;
    }

    nowUs = micros();
  }
}

static void handleButton() {
  bool rawPressed = (digitalRead(BTN_PIN) == LOW);
  unsigned long nowMs = millis();

  if (rawPressed != btnRawState) {
    btnRawState = rawPressed;
    lastBtnEdgeMs = nowMs;
  }

  if ((nowMs - lastBtnEdgeMs) >= BTN_DEBOUNCE_MS && btnStablePressed != btnRawState) {
    btnStablePressed = btnRawState;
    if (btnStablePressed) {
      startMicCapture();
    } else {
      stopMicCapture();
    }
  }
}

static inline void setEmojiPixel(int x, int y, uint16_t c) {
  if (x < 0 || x >= EMOJI_SIZE || y < 0 || y >= EMOJI_SIZE) return;
  emojiPixels[y * EMOJI_SIZE + x] = c;
}

static void renderEmojiFace(char code) {
  const int cx = EMOJI_SIZE / 2;
  const int cy = EMOJI_SIZE / 2;
  const int r  = EMOJI_SIZE / 2 - 1;
  const int r2 = r * r;

  // Face circle
  for (int y = 0; y < EMOJI_SIZE; y++) {
    for (int x = 0; x < EMOJI_SIZE; x++) {
      int dx = x - cx;
      int dy = y - cy;
      int d2 = dx * dx + dy * dy;
      setEmojiPixel(x, y, d2 <= r2 ? C_YELLOW : C_WHITE);
    }
  }

  // Eyes
  const int exL = 13, exR = 27, ey = 14, er = 3;
  const int er2 = er * er;
  for (int y = ey - er; y <= ey + er; y++) {
    for (int x = exL - er; x <= exL + er; x++) {
      int dx = x - exL, dy = y - ey;
      if (dx * dx + dy * dy <= er2) setEmojiPixel(x, y, C_BLACK);
    }
    for (int x = exR - er; x <= exR + er; x++) {
      int dx = x - exR, dy = y - ey;
      if (dx * dx + dy * dy <= er2) setEmojiPixel(x, y, C_BLACK);
    }
  }

  // Mouth: H (smile), S (sad), N (neutral)
  for (int x = 10; x <= 30; x++) {
    int xm = x - 20;
    int yM;
    if (code == 'H') {
      yM = 24 + (xm * xm) / 18;
      setEmojiPixel(x, yM, C_BLACK);
      setEmojiPixel(x, yM + 1, C_BLACK);
    } else if (code == 'S') {
      yM = 31 - (xm * xm) / 18;
      setEmojiPixel(x, yM, C_BLACK);
      setEmojiPixel(x, yM + 1, C_BLACK);
    } else {
      yM = 30;
      setEmojiPixel(x, yM, C_BLACK);
      setEmojiPixel(x, yM + 1, C_BLACK);
    }
  }
}

static void handleMonitorCmd(const char* cmd) {
  if (strncmp(cmd, "EMOJI:", 6) == 0) {
    char code = cmd[6];
    if (code == 'H' || code == 'S' || code == 'N') {
      renderEmojiFace(code);
      hasEmoji = true;
      emojiShownAt = millis();
      forceRedraw = true;
      Monitor.print("EMOJI:");
      Monitor.println(code);
    }
    return;
  }

  if (strncmp(cmd, "CLEAR", 5) == 0) {
    hasEmoji = false;
    forceRedraw = true;
    Monitor.println("EMOJI:CLEAR");
  }
}

static void pollMonitorCommands() {
  while (Monitor.available()) {
    char c = (char)Monitor.read();
    if (c == '\n' || c == '\r') {
      if (monCmdLen > 0) {
        monCmd[monCmdLen] = '\0';
        handleMonitorCmd(monCmd);
        monCmdLen = 0;
      }
    } else if (monCmdLen < MON_CMD_SIZE - 1) {
      monCmd[monCmdLen++] = c;
    }
  }
}

void setup() {
  Bridge.begin();
  Monitor.begin();
  delay(150);

  pinMode(BTN_PIN, INPUT_PULLUP);
  btnRawState = (digitalRead(BTN_PIN) == LOW);
  btnStablePressed = btnRawState;
  analogReadResolution(12);

  display.begin();
  display.setRotation(0);
  display.fillScreen(C_WHITE);

  Wire.begin();
  if (!mpu.begin()) {
    display.fillScreen(GC9A01A_RED);
    while (1) delay(10);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setFilterBandwidth(MPU6050_BAND_260_HZ);

  ahtOk = aht.begin();

  // Calibrate IMU: average 32 samples at rest to find resting bias
  float sumX = 0.0f, sumY = 0.0f;
  for (int i = 0; i < 32; i++) {
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);
    sumX += a.acceleration.y;
    sumY += -a.acceleration.x;
    delay(5);
  }
  axBias = sumX / 32.0f;
  ayBias = sumY / 32.0f;

  drawEyeFB(LEFT_CX,  CY, 0, 0);
  drawEyeFB(RIGHT_CX, CY, 0, 0);

  Monitor.println("READY");
}

void loop() {
  sampleMicWhilePressed();
  handleButton();
  pollMonitorCommands();

  // Auto-clear emoji after 10 seconds
  if (hasEmoji && millis() - emojiShownAt >= EMOJI_TIMEOUT) {
    hasEmoji = false;
    forceRedraw = true;
  }

  int16_t iPx, iPy;
  if (hasEmoji || micActive) {
    // Freeze pupils while emoji is shown or while recording button is held.
    fx = fy = 0.0f;
    iPx = iPy = 0;
  } else {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    float ax = a.acceleration.y  - axBias;
    float ay = -a.acceleration.x - ayBias;
    int16_t maxOffset = EYE_R - PUPIL_R - OUTLINE - 2;
    float dx = constrain( ax * SCALE, -maxOffset, maxOffset);
    float dy = constrain(-ay * SCALE, -maxOffset, maxOffset);
    fx += ALPHA * (dx - fx);
    fy += ALPHA * (dy - fy);
    iPx = (int16_t)fx;
    iPy = (int16_t)fy;
  }

  if (iPx != prevPx || iPy != prevPy || forceRedraw) {
    drawEyeFB(LEFT_CX,  CY, iPx, iPy);
    drawEyeFB(RIGHT_CX, CY, iPx, iPy);
    prevPx = iPx;
    prevPy = iPy;
    forceRedraw = false;
  }

  // AHT20: send TEMP/HUM readings to Debian side via Monitor every second
  if (millis() - lastSensorPrint >= 1000) {
    lastSensorPrint = millis();
    if (ahtOk) {
      sensors_event_t humidity, temperature;
      aht.getEvent(&humidity, &temperature);
      Monitor.print("TEMP:");
      Monitor.println(temperature.temperature, 1);
      Monitor.print("HUM:");
      Monitor.println(humidity.relative_humidity, 1);
    }
  }
}
