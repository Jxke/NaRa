#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include "Adafruit_GC9A01A.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// Hardware SPI — SCK=13, MOSI=11 used automatically
#define TFT_CS   9
#define TFT_DC  10
#define TFT_RST  8

Adafruit_GC9A01A display(TFT_CS, TFT_DC, TFT_RST);
Adafruit_MPU6050 mpu;

const int16_t W = 240, H = 240;
const int16_t EYE_R    = 55;
const int16_t PUPIL_R  = 20;
const int16_t OUTLINE  = 2;

// Eye centres
const int16_t LEFT_CX  = W / 4;
const int16_t RIGHT_CX = 3 * W / 4;
const int16_t CY       = H / 2;

const float SCALE = 10.0f;
const float ALPHA = 0.60f;

float fx = 0.0f, fy = 0.0f;
int16_t prevPx = 0, prevPy = 0;

// Draw a complete static eye (called once per eye at startup)
void drawEye(int16_t cx, int16_t cy) {
  display.fillCircle(cx, cy, EYE_R, GC9A01A_WHITE);
  for (int i = 0; i < OUTLINE; i++)
    display.drawCircle(cx, cy, EYE_R - i, GC9A01A_BLACK);
  display.fillCircle(cx, cy, PUPIL_R, GC9A01A_BLACK);
}

// Erase old pupil, restore outline, draw new pupil — for one eye
void updatePupil(int16_t cx, int16_t cy, int16_t oldPx, int16_t oldPy, int16_t newPx, int16_t newPy) {
  display.fillCircle(cx + oldPx, cy + oldPy, PUPIL_R, GC9A01A_WHITE);
  for (int i = 0; i < OUTLINE; i++)
    display.drawCircle(cx, cy, EYE_R - i, GC9A01A_BLACK);
  display.fillCircle(cx + newPx, cy + newPy, PUPIL_R, GC9A01A_BLACK);
}

void setup() {
  // 40 MHz hardware SPI — well within GC9A01 spec
  display.begin(40000000);
  display.setRotation(0);
  display.fillScreen(GC9A01A_WHITE);

  drawEye(LEFT_CX,  CY);
  drawEye(RIGHT_CX, CY);

  Wire.begin();
  if (!mpu.begin()) {
    // Flash screen red if IMU not found
    display.fillScreen(GC9A01A_RED);
    while (1) delay(10);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setFilterBandwidth(MPU6050_BAND_260_HZ);
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  float ax = a.acceleration.y;
  float ay = -a.acceleration.x;

  int16_t maxOffset = EYE_R - PUPIL_R - OUTLINE - 2;
  float dx = constrain(-ax * SCALE, -maxOffset, maxOffset);
  float dy = constrain( ay * SCALE, -maxOffset, maxOffset);

  fx += ALPHA * (dx - fx);
  fy += ALPHA * (dy - fy);

  int16_t iPx = (int16_t)fx;
  int16_t iPy = (int16_t)fy;

  if (iPx != prevPx || iPy != prevPy) {
    updatePupil(LEFT_CX,  CY, prevPx, prevPy, iPx, iPy);
    updatePupil(RIGHT_CX, CY, prevPx, prevPy, iPx, iPy);
    prevPx = iPx;
    prevPy = iPy;
  }
}
