#include <SPI.h>
#include <Wire.h>
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

unsigned long lastSensorPrint = 0;
bool ahtOk = false;

// --- Emoji pixel buffer ---
// Debian side renders any emoji to EMOJI_SIZE x EMOJI_SIZE RGB565 and sends
// it via Bridge.call("show_emoji", <bytes>) or clears with Bridge.call("clear_emoji")
const int     EMOJI_SIZE  = PUPIL_R * 2; // 40x40
const size_t  EMOJI_BYTES = (size_t)(EMOJI_SIZE * EMOJI_SIZE * 2);
uint16_t      emojiPixels[EMOJI_SIZE * EMOJI_SIZE];
bool          hasEmoji      = false;
unsigned long emojiShownAt  = 0;
const unsigned long EMOJI_TIMEOUT = 10000; // ms

// --- Button (D2) ---
#define BTN_PIN 2
bool micActive = false;

// --- Bridge RPC handlers ---
bool show_emoji(MsgPack::bin_t<uint8_t> data) {
  if (data.size() < EMOJI_BYTES) return false;
  memcpy(emojiPixels, data.data(), EMOJI_BYTES);
  hasEmoji     = true;
  emojiShownAt = millis();
  forceRedraw  = true;
  return true;
}

bool clear_emoji() {
  hasEmoji    = false;
  forceRedraw = true;
  return true;
}

// --- Pupil pixel colour ---
// When emoji is active, map the pupil-relative pixel (pdx, pdy) into the
// emoji buffer. When inactive, return solid black.
inline uint16_t getPupilColor(int32_t pdx, int32_t pdy) {
  if (!hasEmoji) return GC9A01A_BLACK;
  int ex = (int)pdx + EMOJI_SIZE / 2;
  int ey = (int)pdy + EMOJI_SIZE / 2;
  if (ex < 0 || ex >= EMOJI_SIZE || ey < 0 || ey >= EMOJI_SIZE)
    return GC9A01A_WHITE;
  return emojiPixels[ey * EMOJI_SIZE + ex];
}

// --- Eye framebuffer render + blit ---
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
      if      (er2 > EYE_R2)    color = GC9A01A_WHITE;
      else if (er2 >= INNER_R2) color = GC9A01A_BLACK;
      else if (pr2 <= PUPIL_R2) color = getPupilColor(pdx, pdy);
      else                      color = GC9A01A_WHITE;

      eyeBuf[row * DIAM + col] = color;
    }
  }
  display.drawRGBBitmap(cx - EYE_R, cy - EYE_R, eyeBuf, DIAM, DIAM);
}

// --- Setup ---
void setup() {
  Bridge.begin();
  Monitor.begin();

  Bridge.provide("show_emoji", show_emoji);
  Bridge.provide("clear_emoji", clear_emoji);

  pinMode(BTN_PIN, INPUT_PULLUP);

  display.begin();
  display.setRotation(0);
  display.fillScreen(GC9A01A_WHITE);
  drawEyeFB(LEFT_CX,  CY, 0, 0);
  drawEyeFB(RIGHT_CX, CY, 0, 0);

  Wire.begin();
  if (!mpu.begin()) {
    display.fillScreen(GC9A01A_RED);
    while (1) delay(10);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setFilterBandwidth(MPU6050_BAND_260_HZ);

  ahtOk = aht.begin();
}

// --- Loop ---
void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  int16_t iPx, iPy;

  if (hasEmoji) {
    // Emoji active: pupils stay centred, don't follow tilt
    fx = fy = 0.0f;
    iPx = iPy = 0;
  } else {
    float ax = a.acceleration.y;
    float ay = -a.acceleration.x;
    int16_t maxOffset = EYE_R - PUPIL_R - OUTLINE - 2;
    float dx = constrain( ax * SCALE, -maxOffset, maxOffset);
    float dy = constrain(-ay * SCALE, -maxOffset, maxOffset);
    fx += ALPHA * (dx - fx);
    fy += ALPHA * (dy - fy);
    iPx = (int16_t)fx;
    iPy = (int16_t)fy;
  }

  // Auto-clear emoji after 10 seconds
  if (hasEmoji && millis() - emojiShownAt >= EMOJI_TIMEOUT) {
    hasEmoji    = false;
    forceRedraw = true;
  }

  if (iPx != prevPx || iPy != prevPy || forceRedraw) {
    drawEyeFB(LEFT_CX,  CY, iPx, iPy);
    drawEyeFB(RIGHT_CX, CY, iPx, iPy);
    prevPx = iPx;
    prevPy = iPy;
    forceRedraw = false;
  }

  // Button (D2): send MIC:START / MIC:STOP on press/release
  bool btnPressed = (digitalRead(BTN_PIN) == LOW);
  if (btnPressed && !micActive) {
    micActive = true;
    Monitor.println("MIC:START");
  } else if (!btnPressed && micActive) {
    micActive = false;
    Monitor.println("MIC:STOP");
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
