/*
 * Ambient AI Assistant — MCU Firmware
 *
 * Hardware:
 *   GC9A01  240x240 round TFT:  SCK=13 MOSI=11 CS=10 DC=9 RST=8
 *   AHT20   temp/humidity:      I2C default (SCL, SDA, 3.3V, GND)
 *   Mic:                        A0 (electret, DC ~2048 @ 12-bit ADC)
 *   Button:                     D2 (active-low, internal pull-up)
 *
 * Bridge RPC handlers (Linux → MCU):
 *   show_emoji(bin)  — 3200 bytes RGB565 40x40, scaled 6x to 240x240
 *   clear_emoji()    — return to idle face
 *
 * Bridge notifications (MCU → Linux):
 *   notify("audio", int8[128]) — signed 8-bit PCM, 8 kHz, mono
 *
 * Monitor output:
 *   TEMP:xx.x  HUM:xx.x  READY
 */

#include <Arduino_RouterBridge.h>
#include <SPI.h>
#include <Wire.h>

// ---- Pin definitions ----
#define TFT_CS   10
#define TFT_DC    9
#define TFT_RST   8
#define BTN_PIN   2

// ---- GC9A01 commands ----
#define GC9A01_SLPOUT  0x11
#define GC9A01_DISPON  0x26
#define GC9A01_CASET   0x2A
#define GC9A01_RASET   0x2B
#define GC9A01_RAMWR   0x2C
#define GC9A01_MADCTL  0x36
#define GC9A01_COLMOD  0x3A

// ---- AHT20 I2C ----
#define AHT20_ADDR  0x38

// ---- Emoji ----
#define EMOJI_SRC  40
#define SCALE       6   // 40*6 = 240
#define DISP_SIZE 240

static uint16_t emojiPixels[EMOJI_SRC * EMOJI_SRC];
static volatile bool emojiReady = false;
static volatile bool emojiClearFlag = false;

// ---- Button state ----
static bool lastBtnState = false;
static unsigned long lastDebounce = 0;
static const unsigned long DEBOUNCE_MS = 50;

// ---- Sensor timing ----
static unsigned long lastSensorTime = 0;
static const unsigned long SENSOR_INTERVAL_MS = 2000;
static bool ahtReady = false;

// ---- Audio streaming ----
#define SAMPLE_RATE    8000
#define AUDIO_BUFSIZE  128
#define US_PER_SAMPLE  (1000000UL / SAMPLE_RATE)   // 125 µs

static float   dcEst     = 2048.0f;
static float   smoothed  = 0.0f;
static int8_t  audioBuf[AUDIO_BUFSIZE];
static int     audioBufIdx  = 0;
static uint32_t nextSampleUs = 0;

// ================================================================
// voiceFilter — DC removal + noise gate + low-pass + gain
// ================================================================
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

// ================================================================
// GC9A01 raw SPI driver
// ================================================================

static inline void tftCmd(uint8_t cmd) {
  digitalWrite(TFT_DC, LOW);
  digitalWrite(TFT_CS, LOW);
  SPI.transfer(cmd);
  digitalWrite(TFT_CS, HIGH);
}

static inline void tftData8(uint8_t d) {
  digitalWrite(TFT_DC, HIGH);
  digitalWrite(TFT_CS, LOW);
  SPI.transfer(d);
  digitalWrite(TFT_CS, HIGH);
}

static inline void tftData16(uint16_t d) {
  digitalWrite(TFT_DC, HIGH);
  digitalWrite(TFT_CS, LOW);
  SPI.transfer(d >> 8);
  SPI.transfer(d & 0xFF);
  digitalWrite(TFT_CS, HIGH);
}

static void tftWriteCmd(uint8_t cmd, const uint8_t* data, uint8_t len) {
  tftCmd(cmd);
  for (uint8_t i = 0; i < len; i++) {
    tftData8(data[i]);
  }
}

static void tftSetAddrWindow(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
  tftCmd(GC9A01_CASET);
  tftData16(x0);
  tftData16(x1);
  tftCmd(GC9A01_RASET);
  tftData16(y0);
  tftData16(y1);
  tftCmd(GC9A01_RAMWR);
}

static void tftFillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  if (x >= DISP_SIZE || y >= DISP_SIZE) return;
  if (x + w > DISP_SIZE) w = DISP_SIZE - x;
  if (y + h > DISP_SIZE) h = DISP_SIZE - y;

  tftSetAddrWindow(x, y, x + w - 1, y + h - 1);

  uint8_t hi = color >> 8;
  uint8_t lo = color & 0xFF;
  uint32_t n = (uint32_t)w * h;

  digitalWrite(TFT_DC, HIGH);
  digitalWrite(TFT_CS, LOW);
  for (uint32_t i = 0; i < n; i++) {
    SPI.transfer(hi);
    SPI.transfer(lo);
  }
  digitalWrite(TFT_CS, HIGH);
}

static void tftFillScreen(uint16_t color) {
  tftFillRect(0, 0, DISP_SIZE, DISP_SIZE, color);
}

static void tftDrawPixel(uint16_t x, uint16_t y, uint16_t color) {
  if (x >= DISP_SIZE || y >= DISP_SIZE) return;
  tftSetAddrWindow(x, y, x, y);
  tftData16(color);
}

static void tftFillCircle(int16_t cx, int16_t cy, int16_t r, uint16_t color) {
  for (int16_t dy = -r; dy <= r; dy++) {
    int16_t dx = (int16_t)sqrt((float)(r * r - dy * dy));
    int16_t x0 = cx - dx;
    int16_t y0 = cy + dy;
    if (y0 >= 0 && y0 < DISP_SIZE && x0 < DISP_SIZE) {
      int16_t x1 = cx + dx;
      if (x0 < 0) x0 = 0;
      if (x1 >= DISP_SIZE) x1 = DISP_SIZE - 1;
      uint16_t w = x1 - x0 + 1;
      tftFillRect(x0, y0, w, 1, color);
    }
  }
}

static void tftInit() {
  pinMode(TFT_CS, OUTPUT);
  pinMode(TFT_DC, OUTPUT);
  pinMode(TFT_RST, OUTPUT);

  digitalWrite(TFT_RST, HIGH);
  delay(10);
  digitalWrite(TFT_RST, LOW);
  delay(10);
  digitalWrite(TFT_RST, HIGH);
  delay(120);

  SPI.begin();
  SPI.beginTransaction(SPISettings(24000000, MSBFIRST, SPI_MODE0));

  tftCmd(0xEF);
  { uint8_t d[] = {0x14}; tftWriteCmd(0xEB, d, 1); }
  tftCmd(0xFE);
  tftCmd(0xEF);

  { uint8_t d[] = {0x14}; tftWriteCmd(0xEB, d, 1); }
  { uint8_t d[] = {0x14}; tftWriteCmd(0x84, d, 1); }
  { uint8_t d[] = {0x14}; tftWriteCmd(0x85, d, 1); }
  { uint8_t d[] = {0x14}; tftWriteCmd(0x86, d, 1); }
  { uint8_t d[] = {0x14}; tftWriteCmd(0x87, d, 1); }
  { uint8_t d[] = {0x0A}; tftWriteCmd(0x88, d, 1); }
  { uint8_t d[] = {0x21}; tftWriteCmd(0x89, d, 1); }
  { uint8_t d[] = {0x08}; tftWriteCmd(0x8A, d, 1); }
  { uint8_t d[] = {0x80}; tftWriteCmd(0x8B, d, 1); }
  { uint8_t d[] = {0x01}; tftWriteCmd(0x8C, d, 1); }
  { uint8_t d[] = {0x01}; tftWriteCmd(0x8D, d, 1); }
  { uint8_t d[] = {0xFF}; tftWriteCmd(0x8E, d, 1); }
  { uint8_t d[] = {0xFF}; tftWriteCmd(0x8F, d, 1); }

  { uint8_t d[] = {0x00, 0x20}; tftWriteCmd(0xB6, d, 2); }
  { uint8_t d[] = {0x08}; tftWriteCmd(GC9A01_MADCTL, d, 1); }
  { uint8_t d[] = {0x05}; tftWriteCmd(GC9A01_COLMOD, d, 1); }

  { uint8_t d[] = {0x08, 0x08, 0x08, 0x08}; tftWriteCmd(0x90, d, 4); }
  { uint8_t d[] = {0x06}; tftWriteCmd(0xBD, d, 1); }
  { uint8_t d[] = {0x00}; tftWriteCmd(0xBC, d, 1); }
  { uint8_t d[] = {0x60, 0x01, 0x04}; tftWriteCmd(0xFF, d, 3); }

  { uint8_t d[] = {0x13}; tftWriteCmd(0xC3, d, 1); }
  { uint8_t d[] = {0x13}; tftWriteCmd(0xC4, d, 1); }
  { uint8_t d[] = {0x22}; tftWriteCmd(0xC9, d, 1); }

  { uint8_t d[] = {0x11}; tftWriteCmd(0xBE, d, 1); }
  { uint8_t d[] = {0x10, 0x0E}; tftWriteCmd(0xE1, d, 2); }
  { uint8_t d[] = {0x21, 0x0C}; tftWriteCmd(0xDF, d, 2); }

  { uint8_t d[] = {0x45, 0x09, 0x08, 0x08, 0x26, 0x2A};
    tftWriteCmd(0xF0, d, 6); }
  { uint8_t d[] = {0x43, 0x70, 0x72, 0x36, 0x37, 0x6F};
    tftWriteCmd(0xF1, d, 6); }
  { uint8_t d[] = {0x45, 0x09, 0x08, 0x08, 0x26, 0x2A};
    tftWriteCmd(0xF2, d, 6); }
  { uint8_t d[] = {0x43, 0x70, 0x72, 0x36, 0x37, 0x6F};
    tftWriteCmd(0xF3, d, 6); }

  { uint8_t d[] = {0x1B, 0x0B}; tftWriteCmd(0xED, d, 2); }
  { uint8_t d[] = {0x77}; tftWriteCmd(0xAE, d, 1); }
  { uint8_t d[] = {0x63}; tftWriteCmd(0xCD, d, 1); }

  { uint8_t d[] = {0x07, 0x07, 0x04, 0x0E, 0x0F, 0x09, 0x07, 0x08, 0x03};
    tftWriteCmd(0x70, d, 9); }
  { uint8_t d[] = {0x34}; tftWriteCmd(0xE8, d, 1); }
  { uint8_t d[] = {0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00,
                    0x20, 0x20};
    tftWriteCmd(0x62, d, 14); }
  { uint8_t d[] = {0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00,
                    0x20, 0x20};
    tftWriteCmd(0x63, d, 14); }
  { uint8_t d[] = {0x33, 0x33, 0x33, 0x33,
                    0x33, 0x33, 0x33, 0x33,
                    0x33, 0x33};
    tftWriteCmd(0x64, d, 10); }
  { uint8_t d[] = {0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00};
    tftWriteCmd(0x66, d, 7); }
  { uint8_t d[] = {0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00};
    tftWriteCmd(0x67, d, 7); }

  { uint8_t d[] = {0x72, 0x06}; tftWriteCmd(0x74, d, 2); }
  { uint8_t d[] = {0x80}; tftWriteCmd(0x35, d, 1); }

  tftCmd(0x21);

  tftCmd(GC9A01_SLPOUT);
  delay(120);

  { uint8_t d[] = {0x04}; tftWriteCmd(GC9A01_DISPON, d, 1); }
  delay(20);
}

// ================================================================
// AHT20 raw I2C driver
// ================================================================

static bool ahtInit() {
  Wire.begin();
  delay(40);

  Wire.beginTransmission(AHT20_ADDR);
  Wire.write(0x71);
  if (Wire.endTransmission() != 0) return false;

  Wire.requestFrom((uint8_t)AHT20_ADDR, (uint8_t)1);
  if (!Wire.available()) return false;
  uint8_t status = Wire.read();

  if (!(status & 0x08)) {
    Wire.beginTransmission(AHT20_ADDR);
    Wire.write(0xBE);
    Wire.write(0x08);
    Wire.write(0x00);
    Wire.endTransmission();
    delay(10);
  }
  return true;
}

static bool ahtMeasure(float &temp, float &hum) {
  Wire.beginTransmission(AHT20_ADDR);
  Wire.write(0xAC);
  Wire.write(0x33);
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;

  delay(80);

  Wire.requestFrom((uint8_t)AHT20_ADDR, (uint8_t)7);
  if (Wire.available() < 7) return false;

  uint8_t d[7];
  for (int i = 0; i < 7; i++) d[i] = Wire.read();

  if (d[0] & 0x80) return false;

  uint32_t rawHum  = ((uint32_t)d[1] << 12) | ((uint32_t)d[2] << 4) | (d[3] >> 4);
  uint32_t rawTemp = (((uint32_t)d[3] & 0x0F) << 16) | ((uint32_t)d[4] << 8) | d[5];

  hum  = (float)rawHum  / 1048576.0f * 100.0f;
  temp = (float)rawTemp / 1048576.0f * 200.0f - 50.0f;
  return true;
}

// ================================================================
// Display content
// ================================================================

static void drawScaledEmoji() {
  for (int sy = 0; sy < EMOJI_SRC; sy++) {
    for (int sx = 0; sx < EMOJI_SRC; sx++) {
      uint16_t color = emojiPixels[sy * EMOJI_SRC + sx];
      tftFillRect(sx * SCALE, sy * SCALE, SCALE, SCALE, color);
    }
  }
}

static void drawIdleFace() {
  tftFillScreen(0x0000);

  tftFillCircle(85, 105, 30, 0xFFFF);
  tftFillCircle(90, 100, 12, 0x0000);

  tftFillCircle(155, 105, 30, 0xFFFF);
  tftFillCircle(160, 100, 12, 0x0000);

  for (int i = -25; i <= 25; i++) {
    int x = 120 + i;
    int y = 155 + (i * i) / 50;
    tftDrawPixel(x, y, 0xFFFF);
    tftDrawPixel(x, y + 1, 0xFFFF);
  }
}

// ================================================================
// Bridge RPC handlers
// ================================================================

bool handleShowEmoji(MsgPack::bin_t<uint8_t> data) {
  if (data.size() < EMOJI_SRC * EMOJI_SRC * 2) return false;
  memcpy(emojiPixels, data.data(), EMOJI_SRC * EMOJI_SRC * 2);
  emojiReady = true;
  return true;
}

bool handleClearEmoji() {
  emojiClearFlag = true;
  return true;
}

// ================================================================
// Setup & Loop
// ================================================================

void setup() {
  Bridge.begin();
  Monitor.begin();
  delay(200);

  Bridge.provide("show_emoji", handleShowEmoji);
  Bridge.provide("clear_emoji", handleClearEmoji);

  pinMode(BTN_PIN, INPUT_PULLUP);
  analogReadResolution(12);   // 12-bit ADC: 0–4095, DC centre ~2048

  tftInit();
  drawIdleFace();

  ahtReady = ahtInit();
  if (!ahtReady) Monitor.println("ERR:AHT20_NOT_FOUND");

  nextSampleUs = micros();
  Monitor.println("READY");
}

void loop() {
  // ---- Audio sampling at 8 kHz ----
  uint32_t now = micros();
  if ((int32_t)(now - nextSampleUs) >= 0) {
    nextSampleUs += US_PER_SAMPLE;

    int16_t s    = voiceFilter(analogRead(A0));
    audioBuf[audioBufIdx++] = (int8_t)(s >> 8);

    if (audioBufIdx >= AUDIO_BUFSIZE) {
      audioBufIdx = 0;
      MsgPack::arr_t<int8_t> pkt;
      for (int i = 0; i < AUDIO_BUFSIZE; i++) pkt.push_back(audioBuf[i]);
      Bridge.notify("audio", pkt);
    }
  }

  // ---- Emoji display updates ----
  if (emojiReady) {
    emojiReady = false;
    drawScaledEmoji();
  }
  if (emojiClearFlag) {
    emojiClearFlag = false;
    drawIdleFace();
  }

  // ---- Button (debounced) ----
  bool btnState = (digitalRead(BTN_PIN) == LOW);
  unsigned long nowMs = millis();

  if (btnState != lastBtnState && (nowMs - lastDebounce) > DEBOUNCE_MS) {
    lastDebounce = nowMs;
    lastBtnState = btnState;
  }

  // ---- Periodic AHT20 sensor readings ----
  if (ahtReady && (nowMs - lastSensorTime >= SENSOR_INTERVAL_MS)) {
    lastSensorTime = nowMs;
    float temp, hum;
    if (ahtMeasure(temp, hum)) {
      Monitor.print("TEMP:");
      Monitor.println(temp, 1);
      Monitor.print("HUM:");
      Monitor.println(hum, 1);
    }
  }
}
