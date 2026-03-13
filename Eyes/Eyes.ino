#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include "Adafruit_GC9A01A.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_AHTX0.h>

// Explicit SPI pins (required for UNO Q)
#define TFT_SCK  13
#define TFT_MOSI 11
#define TFT_DC   10
#define TFT_CS    9
#define TFT_RST   8

Adafruit_GC9A01A display(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCK, TFT_RST);
Adafruit_MPU6050 mpu;
Adafruit_AHTX0 aht;

const int16_t W = 240, H = 240;
const int16_t EYE_R   = 55;
const int16_t PUPIL_R = 20;
const int16_t OUTLINE = 2;

const int16_t LEFT_CX  = W / 4;
const int16_t RIGHT_CX = 3 * W / 4;
const int16_t CY       = H / 2;

const float SCALE = 10.0f;
const float ALPHA = 0.60f;

// Pre-computed squared radii
const int32_t EYE_R2   = (int32_t)EYE_R * EYE_R;
const int32_t INNER_R2 = (int32_t)(EYE_R - OUTLINE) * (EYE_R - OUTLINE);
const int32_t PUPIL_R2 = (int32_t)PUPIL_R * PUPIL_R;

// Single eye framebuffer — 111x111 pixels x 2 bytes = ~24KB
const int16_t DIAM = EYE_R * 2 + 1;
uint16_t eyeBuf[DIAM * DIAM];

float fx = 0.0f, fy = 0.0f;
int16_t prevPx = 0, prevPy = 0;

unsigned long lastSensorPrint = 0;
bool ahtOk = false;

// Render one eye into eyeBuf then blit it to the display in one shot
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
      else if (pr2 <= PUPIL_R2) color = GC9A01A_BLACK;
      else if (er2 >= INNER_R2) color = GC9A01A_BLACK;
      else                      color = GC9A01A_WHITE;

      eyeBuf[row * DIAM + col] = color;
    }
  }
  display.drawRGBBitmap(cx - EYE_R, cy - EYE_R, eyeBuf, DIAM, DIAM);
}

void setup() {
  Serial.begin(115200);

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

void loop() {
  // --- IMU: update googly eyes ---
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  float ax = a.acceleration.y;
  float ay = -a.acceleration.x;

  int16_t maxOffset = EYE_R - PUPIL_R - OUTLINE - 2;
  float dx = constrain( ax * SCALE, -maxOffset, maxOffset);
  float dy = constrain(-ay * SCALE, -maxOffset, maxOffset);

  fx += ALPHA * (dx - fx);
  fy += ALPHA * (dy - fy);

  int16_t iPx = (int16_t)fx;
  int16_t iPy = (int16_t)fy;

  if (iPx != prevPx || iPy != prevPy) {
    drawEyeFB(LEFT_CX,  CY, iPx, iPy);
    drawEyeFB(RIGHT_CX, CY, iPx, iPy);
    prevPx = iPx;
    prevPy = iPy;
  }

  // --- AHT20: print temp & humidity every second ---
  if (millis() - lastSensorPrint >= 1000) {
    lastSensorPrint = millis();
    if (ahtOk) {
      sensors_event_t humidity, temperature;
      aht.getEvent(&humidity, &temperature);
      Serial.print("Temp: ");
      Serial.print(temperature.temperature, 1);
      Serial.print(" C  Humidity: ");
      Serial.print(humidity.relative_humidity, 1);
      Serial.println(" %");
    } else {
      Serial.println("AHT20 not found");
    }
  }
}
