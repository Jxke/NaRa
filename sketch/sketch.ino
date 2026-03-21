/*
 * Ambient AI Assistant — MCU Firmware
 *
 * Audio transport: Bridge.notify("audio", int8[128]) -> bridge_shim -> VADBatcher
 * Frame: 128 signed 8-bit PCM samples @ 8 kHz
 *
 * Sensor output (ASCII on same Monitor):
 *   TEMP:xx.x\r\n   HUM:xx.x\r\n   READY\r\n   MIC:START\r\n   MIC:STOP\r\n
 *
 * Display commands (Linux -> MCU via mon/write):
 *   EMOJI:H\n  -- happy  :)
 *   EMOJI:S\n  -- sad    :(
 *   EMOJI:N\n  -- neutral :|
 *   CLEAR\n    -- blank screen
 */

#include <Arduino_RouterBridge.h>
#include <SPI.h>
#include <Wire.h>

// ---- Hardware pins ----
// GC9A01A 240x240 round TFT: SCK=13 MOSI=11 CS=9 DC=10 RST=8
#define TFT_CS   9
#define TFT_DC  10
#define TFT_RST  8
#define BTN_PIN  2

// ---- GC9A01A commands ----
#define GC9A01_SLPOUT  0x11
#define GC9A01_DISPON  0x29
#define GC9A01_CASET   0x2A
#define GC9A01_RASET   0x2B
#define GC9A01_RAMWR   0x2C
#define GC9A01_MADCTL  0x36
#define GC9A01_COLMOD  0x3A

#define AHT20_ADDR  0x38
#define DISP_SIZE   240

// RGB565 colors (no INVON, normal polarity)
#define COLOR_BLACK   0x0000
#define COLOR_WHITE   0xFFFF
#define COLOR_YELLOW  0xFFE0
#define COLOR_CYAN    0x07FF

static bool lastBtnState = false;
static unsigned long lastDebounce = 0;
static const unsigned long DEBOUNCE_MS = 50;

static unsigned long lastSensorTime = 0;
static const unsigned long SENSOR_INTERVAL_MS = 2000;
static bool ahtReady = false;

// ---- Audio: Bridge.notify("audio", int8[128]) ----
#define SAMPLE_RATE    8000
#define AUDIO_BUFSIZE  128
#define US_PER_SAMPLE  (1000000UL / SAMPLE_RATE)

static float    dcEst       = 2048.0f;
static float    smoothed    = 0.0f;
static int8_t   audioBuf[AUDIO_BUFSIZE];
static int      audioBufIdx = 0;
static uint32_t nextSampleUs = 0;

// ---- Monitor command buffer (Linux -> MCU) ----
#define MON_CMD_SIZE 32
static char monCmd[MON_CMD_SIZE];
static int  monCmdLen = 0;

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
// GC9A01A raw SPI driver
// ================================================================
static const SPISettings kTftSPI(24000000, MSBFIRST, SPI_MODE0);

static inline void tftCmd(uint8_t cmd) {
  digitalWrite(TFT_DC, LOW); digitalWrite(TFT_CS, LOW);
  SPI.transfer(cmd);
  digitalWrite(TFT_CS, HIGH);
}
static inline void tftData8(uint8_t d) {
  digitalWrite(TFT_DC, HIGH); digitalWrite(TFT_CS, LOW);
  SPI.transfer(d);
  digitalWrite(TFT_CS, HIGH);
}
static inline void tftData16(uint16_t d) {
  digitalWrite(TFT_DC, HIGH); digitalWrite(TFT_CS, LOW);
  SPI.transfer(d >> 8); SPI.transfer(d & 0xFF);
  digitalWrite(TFT_CS, HIGH);
}
static void tftWriteCmd(uint8_t cmd, const uint8_t* d, uint8_t len) {
  tftCmd(cmd);
  for (uint8_t i = 0; i < len; i++) tftData8(d[i]);
}
static void tftSetAddrWindow(uint16_t x0, uint16_t y0, uint16_t x1, uint16_t y1) {
  tftCmd(GC9A01_CASET); tftData16(x0); tftData16(x1);
  tftCmd(GC9A01_RASET); tftData16(y0); tftData16(y1);
  tftCmd(GC9A01_RAMWR);
}
static void tftFillRect(uint16_t x, uint16_t y, uint16_t w, uint16_t h, uint16_t color) {
  if (x >= DISP_SIZE || y >= DISP_SIZE) return;
  if (x + w > DISP_SIZE) w = DISP_SIZE - x;
  if (y + h > DISP_SIZE) h = DISP_SIZE - y;
  SPI.beginTransaction(kTftSPI);
  tftSetAddrWindow(x, y, x+w-1, y+h-1);
  uint8_t hi = color >> 8, lo = color & 0xFF;
  uint32_t n = (uint32_t)w * h;
  digitalWrite(TFT_DC, HIGH); digitalWrite(TFT_CS, LOW);
  for (uint32_t i = 0; i < n; i++) { SPI.transfer(hi); SPI.transfer(lo); }
  digitalWrite(TFT_CS, HIGH);
  SPI.endTransaction();
}
static void tftFillScreen(uint16_t c) { tftFillRect(0, 0, DISP_SIZE, DISP_SIZE, c); }

static void tftInit() {
  pinMode(TFT_CS, OUTPUT); pinMode(TFT_DC, OUTPUT); pinMode(TFT_RST, OUTPUT);
  digitalWrite(TFT_CS, HIGH); digitalWrite(TFT_DC, HIGH);
  digitalWrite(TFT_RST, HIGH); delay(10);
  digitalWrite(TFT_RST, LOW);  delay(10);
  digitalWrite(TFT_RST, HIGH); delay(120);
  SPI.begin();
  SPI.beginTransaction(kTftSPI);
  tftCmd(0xEF);
  { uint8_t d[]={0x14}; tftWriteCmd(0xEB,d,1); }
  tftCmd(0xFE); tftCmd(0xEF);
  { uint8_t d[]={0x14}; tftWriteCmd(0xEB,d,1); }
  { uint8_t d[]={0x14}; tftWriteCmd(0x84,d,1); }
  { uint8_t d[]={0x14}; tftWriteCmd(0x85,d,1); }
  { uint8_t d[]={0x14}; tftWriteCmd(0x86,d,1); }
  { uint8_t d[]={0x14}; tftWriteCmd(0x87,d,1); }
  { uint8_t d[]={0x0A}; tftWriteCmd(0x88,d,1); }
  { uint8_t d[]={0x21}; tftWriteCmd(0x89,d,1); }
  { uint8_t d[]={0x08}; tftWriteCmd(0x8A,d,1); }
  { uint8_t d[]={0x80}; tftWriteCmd(0x8B,d,1); }
  { uint8_t d[]={0x01}; tftWriteCmd(0x8C,d,1); }
  { uint8_t d[]={0x01}; tftWriteCmd(0x8D,d,1); }
  { uint8_t d[]={0xFF}; tftWriteCmd(0x8E,d,1); }
  { uint8_t d[]={0xFF}; tftWriteCmd(0x8F,d,1); }
  { uint8_t d[]={0x00,0x20}; tftWriteCmd(0xB6,d,2); }
  { uint8_t d[]={0x08}; tftWriteCmd(GC9A01_MADCTL,d,1); }
  { uint8_t d[]={0x05}; tftWriteCmd(GC9A01_COLMOD,d,1); }
  { uint8_t d[]={0x08,0x08,0x08,0x08}; tftWriteCmd(0x90,d,4); }
  { uint8_t d[]={0x06}; tftWriteCmd(0xBD,d,1); }
  { uint8_t d[]={0x00}; tftWriteCmd(0xBC,d,1); }
  { uint8_t d[]={0x60,0x01,0x04}; tftWriteCmd(0xFF,d,3); }
  { uint8_t d[]={0x13}; tftWriteCmd(0xC3,d,1); }
  { uint8_t d[]={0x13}; tftWriteCmd(0xC4,d,1); }
  { uint8_t d[]={0x22}; tftWriteCmd(0xC9,d,1); }
  { uint8_t d[]={0x11}; tftWriteCmd(0xBE,d,1); }
  { uint8_t d[]={0x10,0x0E}; tftWriteCmd(0xE1,d,2); }
  { uint8_t d[]={0x21,0x0C}; tftWriteCmd(0xDF,d,2); }
  { uint8_t d[]={0x45,0x09,0x08,0x08,0x26,0x2A}; tftWriteCmd(0xF0,d,6); }
  { uint8_t d[]={0x43,0x70,0x72,0x36,0x37,0x6F}; tftWriteCmd(0xF1,d,6); }
  { uint8_t d[]={0x45,0x09,0x08,0x08,0x26,0x2A}; tftWriteCmd(0xF2,d,6); }
  { uint8_t d[]={0x43,0x70,0x72,0x36,0x37,0x6F}; tftWriteCmd(0xF3,d,6); }
  { uint8_t d[]={0x1B,0x0B}; tftWriteCmd(0xED,d,2); }
  { uint8_t d[]={0x77}; tftWriteCmd(0xAE,d,1); }
  { uint8_t d[]={0x63}; tftWriteCmd(0xCD,d,1); }
  { uint8_t d[]={0x07,0x07,0x04,0x0E,0x0F,0x09,0x07,0x08,0x03}; tftWriteCmd(0x70,d,9); }
  { uint8_t d[]={0x34}; tftWriteCmd(0xE8,d,1); }
  { uint8_t d[]={0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x20,0x20}; tftWriteCmd(0x62,d,14); }
  { uint8_t d[]={0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x20,0x20}; tftWriteCmd(0x63,d,14); }
  { uint8_t d[]={0x33,0x33,0x33,0x33,0x33,0x33,0x33,0x33,0x33,0x33}; tftWriteCmd(0x64,d,10); }
  { uint8_t d[]={0x00,0x00,0x00,0x00,0x00,0x00,0x00}; tftWriteCmd(0x66,d,7); }
  { uint8_t d[]={0x00,0x00,0x00,0x00,0x00,0x00,0x00}; tftWriteCmd(0x67,d,7); }
  { uint8_t d[]={0x72,0x06}; tftWriteCmd(0x74,d,2); }
  { uint8_t d[]={0x80}; tftWriteCmd(0x35,d,1); }
  // Note: no 0x21 (INVON) — display polarity is normal
  tftCmd(GC9A01_SLPOUT); delay(120);
  tftCmd(GC9A01_DISPON);
  delay(20);
  SPI.endTransaction();
}

// ================================================================
// AHT20
// ================================================================
static bool ahtInit() {
  Wire.begin(); delay(40);
  Wire.beginTransmission(AHT20_ADDR); Wire.write(0x71);
  if (Wire.endTransmission() != 0) return false;
  Wire.requestFrom((uint8_t)AHT20_ADDR, (uint8_t)1);
  if (!Wire.available()) return false;
  uint8_t status = Wire.read();
  if (!(status & 0x08)) {
    Wire.beginTransmission(AHT20_ADDR); Wire.write(0xBE); Wire.write(0x08); Wire.write(0x00); Wire.endTransmission(); delay(10);
  }
  return true;
}
static bool ahtMeasure(float &temp, float &hum) {
  Wire.beginTransmission(AHT20_ADDR); Wire.write(0xAC); Wire.write(0x33); Wire.write(0x00);
  if (Wire.endTransmission() != 0) return false;
  delay(80);
  Wire.requestFrom((uint8_t)AHT20_ADDR, (uint8_t)7);
  if (Wire.available() < 7) return false;
  uint8_t d[7]; for (int i = 0; i < 7; i++) d[i] = Wire.read();
  if (d[0] & 0x80) return false;
  uint32_t rH = ((uint32_t)d[1] << 12) | ((uint32_t)d[2] << 4) | (d[3] >> 4);
  uint32_t rT = (((uint32_t)d[3] & 0x0F) << 16) | ((uint32_t)d[4] << 8) | d[5];
  hum  = (float)rH / 1048576.0f * 100.0f;
  temp = (float)rT / 1048576.0f * 200.0f - 50.0f;
  return true;
}

// ================================================================
// Emoticon text renderer
//
// 5x7 bitmap font (column-major, LSB = top row).
// Only the characters needed for :)  :(  :|  are included.
// ================================================================

// Each entry: 5 column bytes for a 5x7 glyph
static const uint8_t GLYPH_COLON[5]  = {0x00, 0x36, 0x36, 0x00, 0x00}; // :
static const uint8_t GLYPH_RPAREN[5] = {0x00, 0x41, 0x22, 0x14, 0x08}; // )
static const uint8_t GLYPH_LPAREN[5] = {0x00, 0x08, 0x14, 0x22, 0x41}; // (
static const uint8_t GLYPH_PIPE[5]   = {0x00, 0x00, 0x7F, 0x00, 0x00}; // |

static const uint8_t* charGlyph(char c) {
  switch (c) {
    case ':': return GLYPH_COLON;
    case ')': return GLYPH_RPAREN;
    case '(': return GLYPH_LPAREN;
    case '|': return GLYPH_PIPE;
    default:  return nullptr;
  }
}

// Draw one character at pixel (x, y), each font pixel blown up to scale x scale
static void tftDrawChar(int16_t x, int16_t y, char c, uint8_t scale, uint16_t color) {
  const uint8_t* g = charGlyph(c);
  if (!g) return;
  for (uint8_t col = 0; col < 5; col++) {
    uint8_t bits = g[col];
    for (uint8_t row = 0; row < 7; row++) {
      if (bits & (1 << row)) {
        tftFillRect(x + col * scale, y + row * scale, scale, scale, color);
      }
    }
  }
}

// Draw a string. Returns total pixel width drawn.
// Character cell: 5 cols + 1 gap = 6 units wide at given scale
static int16_t tftDrawString(int16_t x, int16_t y, const char* str, uint8_t scale, uint16_t color) {
  int16_t cx = x;
  while (*str) {
    tftDrawChar(cx, y, *str, scale, color);
    cx += 6 * scale;
    str++;
  }
  return cx - x;
}

// Width of a string in pixels at given scale
static int16_t strPixelW(const char* str, uint8_t scale) {
  int16_t n = 0;
  while (*str++) n++;
  return n > 0 ? n * 6 * scale - scale : 0; // last char has no trailing gap
}

// Draw an emoticon centred on the screen
static void showEmoticon(const char* text, uint16_t fg, uint16_t bg) {
  tftFillScreen(bg);
  const uint8_t scale = 18;          // each font pixel = 18x18 screen pixels
  int16_t w = strPixelW(text, scale);
  int16_t h = 7 * scale;
  int16_t x = (DISP_SIZE - w) / 2;
  int16_t y = (DISP_SIZE - h) / 2;
  tftDrawString(x, y, text, scale, fg);
}

// ================================================================
// Monitor command parser (Linux -> MCU)
// ================================================================
static void handleMonitorCmd(const char* cmd) {
  if      (strncmp(cmd, "EMOJI:H", 7) == 0) showEmoticon(":)", COLOR_WHITE, COLOR_BLACK);
  else if (strncmp(cmd, "EMOJI:S", 7) == 0) showEmoticon(":(", COLOR_WHITE, COLOR_BLACK);
  else if (strncmp(cmd, "EMOJI:N", 7) == 0) showEmoticon(":|", COLOR_WHITE, COLOR_BLACK);
  else if (strncmp(cmd, "CLEAR",   5) == 0) tftFillScreen(COLOR_BLACK);
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

// ================================================================
// Setup & Loop
// ================================================================
void setup() {
  Bridge.begin();
  Monitor.begin();
  delay(200);

  pinMode(BTN_PIN, INPUT_PULLUP);
  analogReadResolution(12);

  tftInit();
  // Solid white fill — if the display works you will see a white screen
  tftFillScreen(COLOR_WHITE);
  delay(500);
  // Then go dark and show the idle "ready" emoticon
  showEmoticon(":)", COLOR_YELLOW, COLOR_BLACK);

  ahtReady = ahtInit();
  if (!ahtReady) Monitor.println("ERR:AHT20_NOT_FOUND");

  nextSampleUs = micros();
  Monitor.println("READY");
}

void loop() {
  // ---- Audio at 8 kHz via Bridge.notify("audio") ----
  uint32_t now = micros();
  if ((int32_t)(now - nextSampleUs) >= 0) {
    nextSampleUs += US_PER_SAMPLE;
    int16_t s = voiceFilter(analogRead(A0));
    audioBuf[audioBufIdx++] = (int8_t)(s >> 8);

    if (audioBufIdx >= AUDIO_BUFSIZE) {
      audioBufIdx = 0;
      MsgPack::arr_t<int8_t> pkt;
      for (int i = 0; i < AUDIO_BUFSIZE; i++) pkt.push_back(audioBuf[i]);
      Bridge.notify("audio", pkt);
    }
  }

  // ---- Monitor commands from Linux ----
  pollMonitorCommands();

  // ---- Button ----
  bool btnState = (digitalRead(BTN_PIN) == LOW);
  unsigned long nowMs = millis();
  if (btnState != lastBtnState && (nowMs - lastDebounce) > DEBOUNCE_MS) {
    lastDebounce = nowMs;
    lastBtnState = btnState;
    if (btnState) Monitor.println("MIC:START"); else Monitor.println("MIC:STOP");
  }

  // ---- Sensors every 2s ----
  if (ahtReady && (nowMs - lastSensorTime >= SENSOR_INTERVAL_MS)) {
    lastSensorTime = nowMs;
    float temp, hum;
    if (ahtMeasure(temp, hum)) {
      Monitor.print("TEMP:"); Monitor.println(temp, 1);
      Monitor.print("HUM:");  Monitor.println(hum, 1);
    }
  }
}
