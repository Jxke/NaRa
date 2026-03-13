#include <SPI.h>
#include <Adafruit_GFX.h>
#include "Adafruit_GC9A01A.h"

#define TFT_SCK  13
#define TFT_MOSI 11
#define TFT_DC   10
#define TFT_CS    9
#define TFT_RST   8

Adafruit_GC9A01A display(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCK, TFT_RST);

void setup() {
  display.begin();
  display.setRotation(0);
  display.fillScreen(GC9A01A_RED);
  display.setCursor(80, 110);
  display.setTextColor(GC9A01A_WHITE);
  display.setTextSize(3);
  display.print("HELLO");
}

void loop() {}
