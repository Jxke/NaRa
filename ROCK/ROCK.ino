#include <SPI.h>
#include <Adafruit_GFX.h>
#include "Adafruit_GC9A01A.h"
#include <Arduino_RouterBridge.h>
#include <zephyr/kernel.h>
#include <zephyr/drivers/i2s.h>
#include <string.h>

// ---------------- Display ----------------
#define TFT_SCK   13
#define TFT_MOSI  11
#define TFT_DC    10
#define TFT_CS     9
#define TFT_RST    8

Adafruit_GC9A01A display(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCK, TFT_RST);
bool displayReady = false;
bool screenPressed = false;

// ---------------- Button ----------------
#define BTN_PIN 3
bool btnRawPressed = false;
bool btnStablePressed = false;
unsigned long lastBtnEdgeMs = 0;
const unsigned long BTN_DEBOUNCE_MS = 30;
const bool AUTO_MIC_DIAG = true;  // capture without button
const unsigned long AUTO_START_DELAY_MS = 1500;
const unsigned long AUTO_RECORD_MS = 8000;
const unsigned long AUTO_REARM_MS = 2500;
const bool BYPASS_I2S_CTRL = false;
const bool BOOT_START_I2S = false;
const bool USE_SYSCALL_I2S_CTRL = false;
const bool I2S_CFG_NULL_SLAB = false;
const bool RUN_PRE_BRIDGE_PROBE = false;

// ---------------- INMP441 I2S ----------------
// INMP441 SCK -> D2 / PB3
// INMP441 WS  -> A0 / PA4
// INMP441 SD  -> JSPI MOSI / PC3

#define I2S_RAW_RATE         16000
#define SAMPLE_RATE          8000
#define DECIM_FACTOR            2
#define AUDIO_BUFSIZE         128
#define I2S_STEREO_PER_BLK    128
#define I2S_BLK_BYTES        (I2S_STEREO_PER_BLK * 2 * sizeof(int32_t))
#define I2S_SLAB_BLOCKS         6
#define I2S_GAIN                8

static char i2sSlabBuffer[I2S_BLK_BYTES * I2S_SLAB_BLOCKS] __aligned(4);
static struct k_mem_slab i2s_slab =
  Z_MEM_SLAB_INITIALIZER(i2s_slab, i2sSlabBuffer, I2S_BLK_BYTES, I2S_SLAB_BLOCKS);
static bool i2sSlabReady = false;

static const struct device *i2s_dev = nullptr;
static bool i2sOk = false;
static bool i2sRunning = false;
static bool i2sDtNodePresent = false;
static int i2sCfgErr = 0;
static int i2sStartErr = 0;
static int i2sReadyAtBoot = 0;
static int i2sInitRes = 0;
static int i2sInitialized = 0;
static int i2sDeviceInitCallRes = 0;
static int i2sDmaReadyAtBoot = -1;
static int i2sSelectedChannel = 0;

static int8_t audioBuf[AUDIO_BUFSIZE];
static int audioBufIdx = 0;
static uint32_t streamedSamples = 0;
static uint32_t overflowCount = 0;
static uint32_t captureStartUs = 0;
static int32_t decimSum = 0;
static uint8_t decimPhase = 0;
static unsigned long autoNextStartMs = 0;
static unsigned long autoStopAtMs = 0;
static int32_t i2sReadBlock[I2S_STEREO_PER_BLK * 2];
static int i2sLastReadErr = 0;
static uint32_t i2sReadOkBlocks = 0;
static bool monitorReady = false;
static unsigned long lastSaiDumpMs = 0;
static uint32_t preBridgeReadOk = 0;
static int preBridgeLastErr = 0;
static int preBridgeStartErr = 0;
static int preBridgeCfgErr = 0;

struct SaiRegs {
  volatile uint32_t CR1;
  volatile uint32_t CR2;
  volatile uint32_t FRCR;
  volatile uint32_t SLOTR;
  volatile uint32_t IMR;
  volatile uint32_t SR;
  volatile uint32_t CLRFR;
  volatile uint32_t DR;
};

struct GpioRegs {
  volatile uint32_t MODER;
  volatile uint32_t OTYPER;
  volatile uint32_t OSPEEDR;
  volatile uint32_t PUPDR;
  volatile uint32_t IDR;
  volatile uint32_t ODR;
  volatile uint32_t BSRR;
  volatile uint32_t LCKR;
  volatile uint32_t AFRL;
  volatile uint32_t AFRH;
  volatile uint32_t BRR;
};

static volatile SaiRegs *const kSai1B = reinterpret_cast<volatile SaiRegs *>(0x40015424UL);
static const uint32_t SAI_CR1_OUTDRIV = (1UL << 13);
static volatile GpioRegs *const kGpioA = reinterpret_cast<volatile GpioRegs *>(0x42020000UL);
static volatile GpioRegs *const kGpioB = reinterpret_cast<volatile GpioRegs *>(0x42020400UL);
static volatile GpioRegs *const kGpioC = reinterpret_cast<volatile GpioRegs *>(0x42020800UL);
static volatile GpioRegs *const kGpioE = reinterpret_cast<volatile GpioRegs *>(0x42021000UL);
static bool i2sReadErrPinsDumped = false;

static void dumpSaiRegs(const char *tag) {
  if (!monitorReady) return;
  Monitor.print("SAI:");
  Monitor.print(tag);
  Monitor.print(" CR1:0x");
  Monitor.print((uint32_t)kSai1B->CR1, HEX);
  Monitor.print(" FRCR:0x");
  Monitor.print((uint32_t)kSai1B->FRCR, HEX);
  Monitor.print(" SLOTR:0x");
  Monitor.print((uint32_t)kSai1B->SLOTR, HEX);
  Monitor.print(" SR:0x");
  Monitor.println((uint32_t)kSai1B->SR, HEX);
}

static void dumpGpioPin(const char *label, volatile GpioRegs *gpio, uint8_t pin) {
  if (!monitorReady) return;

  uint32_t shift = pin * 2U;
  uint32_t moder = gpio->MODER;
  uint32_t ospeedr = gpio->OSPEEDR;
  uint32_t pupdr = gpio->PUPDR;
  uint32_t afr = (pin < 8U) ? gpio->AFRL : gpio->AFRH;
  uint32_t afShift = (pin & 0x7U) * 4U;

  Monitor.print("GPIO:");
  Monitor.print(label);
  Monitor.print(" MOD:");
  Monitor.print((moder >> shift) & 0x3U);
  Monitor.print(" AF:");
  Monitor.print((afr >> afShift) & 0xFU);
  Monitor.print(" SPD:");
  Monitor.print((ospeedr >> shift) & 0x3U);
  Monitor.print(" PUPD:");
  Monitor.print((pupdr >> shift) & 0x3U);
  Monitor.print(" OTY:");
  Monitor.print((gpio->OTYPER >> pin) & 0x1U);
  Monitor.print(" IDR:");
  Monitor.print((gpio->IDR >> pin) & 0x1U);
  Monitor.print(" ODR:");
  Monitor.print((gpio->ODR >> pin) & 0x1U);
  Monitor.print(" MODER:0x");
  Monitor.print((uint32_t)moder, HEX);
  Monitor.print(" AFRL:0x");
  Monitor.print((uint32_t)gpio->AFRL, HEX);
  Monitor.print(" AFRH:0x");
  Monitor.println((uint32_t)gpio->AFRH, HEX);
}

static void dumpMicPinState(const char *tag) {
  if (!monitorReady) return;
  Monitor.print("GPIOSET:");
  Monitor.println(tag);
  dumpGpioPin("PB3", kGpioB, 3);
  dumpGpioPin("PA4", kGpioA, 4);
  dumpGpioPin("PC3", kGpioC, 3);
  dumpGpioPin("PE3", kGpioE, 3);
}

static void i2sBuildConfig(struct i2s_config *cfg) {
  memset(cfg, 0, sizeof(*cfg));
  cfg->word_size      = 32;
  cfg->channels       = 2;
  cfg->format         = I2S_FMT_DATA_FORMAT_I2S;
  cfg->options        = I2S_OPT_BIT_CLK_MASTER | I2S_OPT_FRAME_CLK_MASTER;
  cfg->frame_clk_freq = I2S_RAW_RATE;
  cfg->mem_slab       = I2S_CFG_NULL_SLAB ? nullptr : &i2s_slab;
  cfg->block_size     = I2S_BLK_BYTES;
  cfg->timeout        = 40;
}

static bool i2sConfigureRx() {
  struct i2s_config cfg;
  i2sBuildConfig(&cfg);

  if (BYPASS_I2S_CTRL) {
    i2sCfgErr = 0;
    i2sOk = true;
    if (monitorReady) Monitor.println("I2S:INIT:BYPASS");
    return true;
  }

  if (monitorReady) Monitor.println("I2S:INIT:CONFIGURE");
  i2sCfgErr = i2s_configure(i2s_dev, I2S_DIR_RX, &cfg);
  i2sOk = (i2sCfgErr == 0);
  if (monitorReady) {
    Monitor.print("I2S:INIT:CFG=");
    Monitor.println(i2sCfgErr);
  }
  return i2sOk;
}

static bool i2sStartWithRecovery() {
  if (!i2s_dev) return false;
  if (BYPASS_I2S_CTRL) {
    i2sStartErr = 0;
    i2sRunning = true;
    return true;
  }

  int dropErr = i2s_trigger(i2s_dev, I2S_DIR_RX, I2S_TRIGGER_DROP);
  if (monitorReady && dropErr != 0) {
    Monitor.print("I2S:TRIG:DROP=");
    Monitor.println(dropErr);
  }

  if (!i2sConfigureRx()) {
    i2sRunning = false;
    i2sStartErr = i2sCfgErr;
    return false;
  }

  i2sStartErr = i2s_trigger(i2s_dev, I2S_DIR_RX, I2S_TRIGGER_START);
  if (i2sStartErr == 0) {
    // Force SAI clock/data output drive on master RX path (helps INMP441 clocking).
    kSai1B->CR1 |= SAI_CR1_OUTDRIV;
    i2sRunning = true;
    dumpSaiRegs("START_OK");
    dumpMicPinState("START_OK");
    return true;
  }

  if (monitorReady) {
    Monitor.print("I2S:START:ERR=");
    Monitor.println(i2sStartErr);
  }
  dumpSaiRegs("START_ERR");
  dumpMicPinState("START_ERR");

  int deinitRes = device_deinit(i2s_dev);
  int initRes = device_init(i2s_dev);
  if (monitorReady) {
    Monitor.print("I2S:RECOV:DEINIT=");
    Monitor.println(deinitRes);
    Monitor.print("I2S:RECOV:INIT=");
    Monitor.println(initRes);
  }

  if (!i2sConfigureRx()) {
    i2sRunning = false;
    i2sStartErr = i2sCfgErr;
    return false;
  }

  dropErr = i2s_trigger(i2s_dev, I2S_DIR_RX, I2S_TRIGGER_DROP);
  if (monitorReady && dropErr != 0) {
    Monitor.print("I2S:RECOV:DROP=");
    Monitor.println(dropErr);
  }

  i2sStartErr = i2s_trigger(i2s_dev, I2S_DIR_RX, I2S_TRIGGER_START);
  if (monitorReady) {
    Monitor.print("I2S:RECOV:START=");
    Monitor.println(i2sStartErr);
  }
  if (i2sStartErr == 0) {
    kSai1B->CR1 |= SAI_CR1_OUTDRIV;
  }
  dumpSaiRegs("RECOV_START");
  dumpMicPinState("RECOV_START");
  i2sRunning = (i2sStartErr == 0);
  return i2sRunning;
}

static void i2sRecycleBlock(void *mem_block) {
  if (!mem_block) return;
  unsigned int key = irq_lock();
  *((char **)mem_block) = i2s_slab.free_list;
  i2s_slab.free_list = (char *)mem_block;
  if (i2s_slab.info.num_used > 0) {
    i2s_slab.info.num_used--;
  }
  irq_unlock(key);
}

static void i2sPrimeMemSlab() {
  char *base = i2s_slab.buffer;
  size_t blockSize = i2s_slab.info.block_size;
  uint32_t numBlocks = i2s_slab.info.num_blocks;

  if (!base || numBlocks == 0 || blockSize < sizeof(char *)) {
    i2sSlabReady = false;
    return;
  }

  // Zephyr slab allocator expects a single-linked free list stored in-place.
  for (uint32_t i = 0; (i + 1) < numBlocks; i++) {
    char *blk = base + (i * blockSize);
    char *next = base + ((i + 1) * blockSize);
    *((char **)blk) = next;
  }
  *((char **)(base + ((numBlocks - 1) * blockSize))) = nullptr;

  i2s_slab.free_list = base;
  i2s_slab.info.num_used = 0;
  i2sSlabReady = true;
}

// ---------------- Monitor ----------------
bool readyAnnounced = false;
bool micActive = false;
bool micDummyMode = false;
static unsigned long lastHeartbeatMs = 0;

static void ensureMonitorReady() {
  if (monitorReady) return;
  monitorReady = Monitor.begin();
  if (monitorReady && !readyAnnounced) {
    Monitor.println("READY");
    readyAnnounced = true;
  }
}

static void setScreenColor(bool pressed) {
  if (!displayReady) return;
  if (pressed == screenPressed) return;
  screenPressed = pressed;
  display.fillScreen(pressed ? GC9A01A_RED : GC9A01A_BLACK);
}

static void i2sInit() {
  if (monitorReady) Monitor.println("I2S:INIT:ENTER");
#if DT_NODE_EXISTS(DT_NODELABEL(i2s_sai1b))
  if (!i2sSlabReady || i2s_slab.free_list == nullptr) {
    if (monitorReady) Monitor.println("I2S:INIT:PRIME");
    i2sPrimeMemSlab();
  }
  if (!i2sSlabReady) {
    i2sCfgErr = -2002;
    i2sOk = false;
    if (monitorReady) Monitor.println("I2S:INIT:PRIME_FAIL");
    return;
  }

  if (monitorReady) Monitor.println("I2S:INIT:DT_OK");
  i2sDtNodePresent = true;
  i2s_dev = DEVICE_DT_GET(DT_NODELABEL(i2s_sai1b));
  i2sReadyAtBoot = (i2s_dev && device_is_ready(i2s_dev)) ? 1 : 0;
  if (!i2s_dev) {
    i2sCfgErr = -2003;
    i2sOk = false;
    if (monitorReady) Monitor.println("I2S:INIT:NO_DEV");
    return;
  }
#if DT_NODE_EXISTS(DT_NODELABEL(gpdma1))
  const struct device *dma_dev = DEVICE_DT_GET(DT_NODELABEL(gpdma1));
  i2sDmaReadyAtBoot = (dma_dev && device_is_ready(dma_dev)) ? 1 : 0;
  if (dma_dev && !i2sDmaReadyAtBoot) {
    int dmaInitRes = device_init(dma_dev);
    i2sDmaReadyAtBoot = device_is_ready(dma_dev) ? 1 : 0;
    if (monitorReady) {
      Monitor.print("I2S:INIT:DMA_INIT=");
      Monitor.println(dmaInitRes);
      Monitor.print("I2S:INIT:DMA_RDY=");
      Monitor.println(i2sDmaReadyAtBoot);
    }
  }
#else
  i2sDmaReadyAtBoot = -1;
#endif

  if (!i2sReadyAtBoot) {
    if (i2s_dev->state && i2s_dev->state->initialized && i2s_dev->state->init_res != 0) {
      int deinitRes = device_deinit(i2s_dev);
      if (monitorReady) {
        Monitor.print("I2S:INIT:DEV_DEINIT=");
        Monitor.println(deinitRes);
      }
    }
    i2sDeviceInitCallRes = device_init(i2s_dev);
    i2sReadyAtBoot = device_is_ready(i2s_dev) ? 1 : 0;
    if (monitorReady) {
      Monitor.print("I2S:INIT:DEV_INIT=");
      Monitor.println(i2sDeviceInitCallRes);
      Monitor.print("I2S:INIT:DEV_RDY=");
      Monitor.println(i2sReadyAtBoot);
    }
    if (!i2sReadyAtBoot && i2s_dev->ops.init) {
      int forcedInitRes = i2s_dev->ops.init(i2s_dev);
      if (i2s_dev->state) {
        i2s_dev->state->initialized = true;
        i2s_dev->state->init_res = (forcedInitRes < 0) ? (uint8_t)(-forcedInitRes) : (uint8_t)forcedInitRes;
      }
      i2sReadyAtBoot = device_is_ready(i2s_dev) ? 1 : 0;
      if (monitorReady) {
        Monitor.print("I2S:INIT:DEV_FORCE=");
        Monitor.println(forcedInitRes);
        Monitor.print("I2S:INIT:DEV_FORCE_RDY=");
        Monitor.println(i2sReadyAtBoot);
      }
    }
    if (!i2sReadyAtBoot) {
      if (i2s_dev->state) {
        i2sInitRes = i2s_dev->state->init_res;
        i2sInitialized = i2s_dev->state->initialized ? 1 : 0;
      }
      i2sCfgErr = -2004;
      i2sOk = false;
      if (monitorReady) Monitor.println("I2S:INIT:DEV_NOT_READY");
      return;
    }
  }
  if (i2s_dev && i2s_dev->state) {
    i2sInitRes = i2s_dev->state->init_res;
    i2sInitialized = i2s_dev->state->initialized ? 1 : 0;
  } else {
    i2sInitRes = -9999;
    i2sInitialized = 0;
  }

  i2sConfigureRx();
#else
  i2sDtNodePresent = false;
  i2sCfgErr = -2001;
  i2sOk = false;
  if (monitorReady) Monitor.println("I2S:INIT:NO_DT");
#endif
}

static bool i2sEnsureRunning() {
  if (!i2sOk) i2sInit();
  if (!i2sOk) return false;
  if (i2sRunning) return true;
  return i2sStartWithRecovery();
}

static void i2sStopIfRunning() {
  if (!i2sRunning) return;
  if (!BYPASS_I2S_CTRL && i2s_dev) {
    int dropErr = i2s_trigger(i2s_dev, I2S_DIR_RX, I2S_TRIGGER_DROP);
    if (monitorReady && dropErr != 0) {
      Monitor.print("I2S:STOP:DROP=");
      Monitor.println(dropErr);
    }
  }
  i2sRunning = false;
}

static void runPreBridgeI2SProbe() {
  preBridgeReadOk = 0;
  preBridgeLastErr = 0;
  preBridgeStartErr = 0;
  preBridgeCfgErr = 0;

  i2sInit();
  preBridgeCfgErr = i2sCfgErr;
  if (!i2sEnsureRunning()) {
    preBridgeStartErr = i2sStartErr;
    return;
  }
  preBridgeStartErr = i2sStartErr;

  uint32_t t0 = millis();
  while ((millis() - t0) < 1500) {
    void *mem_block = nullptr;
    size_t block_size = 0;
    int r = i2s_read(i2s_dev, &mem_block, &block_size);
    if (r == 0 && mem_block && block_size > 0) {
      preBridgeReadOk++;
      i2sRecycleBlock(mem_block);
    } else if (r != -EAGAIN && r != -EBUSY) {
      preBridgeLastErr = r;
    }
    k_yield();
  }
  // Keep I2S running between button captures to avoid fragile reconfigure cycles.
}

static void sendAudioPacket() {
  if (!monitorReady) return;
  static const uint8_t kSync[2] = {0x01, 0x80};
  Monitor.write(kSync, 2);
  Monitor.write((const uint8_t*)audioBuf, AUDIO_BUFSIZE);
  streamedSamples += AUDIO_BUFSIZE;
}

static void startMicCapture() {
  ensureMonitorReady();
  if (!monitorReady) return;
  Monitor.println("MIC:TRY");
  if (!i2sSlabReady || i2s_slab.free_list == nullptr) {
    i2sPrimeMemSlab();
  }
  if (!i2sEnsureRunning()) {
    micDummyMode = true;
    micActive = true;
    audioBufIdx = 0;
    streamedSamples = 0;
    overflowCount = 0;
    i2sReadOkBlocks = 0;
    i2sLastReadErr = i2sStartErr;
    i2sReadErrPinsDumped = false;
    decimSum = 0;
    decimPhase = 0;
    captureStartUs = micros();

    // Keep START/STOP framing so Linux diagnostics can always save a test WAV.
    Monitor.println("MIC:START");
    Monitor.print("ERR:I2S_UNAVAILABLE DT:");
    Monitor.print(i2sDtNodePresent ? 1 : 0);
    Monitor.print(" RDY:");
    Monitor.print(i2sReadyAtBoot);
    Monitor.print(" INI:");
    Monitor.print(i2sInitialized);
    Monitor.print(" RES:");
    Monitor.print(i2sInitRes);
    Monitor.print(" DINIT:");
    Monitor.print(i2sDeviceInitCallRes);
    Monitor.print(" DMA:");
    Monitor.print(i2sDmaReadyAtBoot);
    Monitor.print(" CFG:");
    Monitor.print(i2sCfgErr);
    Monitor.print(" START:");
    Monitor.println(i2sStartErr);
    return;
  }

  micDummyMode = false;
  micActive = true;
  audioBufIdx = 0;
  streamedSamples = 0;
  overflowCount = 0;
  i2sReadOkBlocks = 0;
  i2sLastReadErr = 0;
  i2sReadErrPinsDumped = false;
  decimSum = 0;
  decimPhase = 0;
  i2sSelectedChannel = 0;
  captureStartUs = micros();

  Monitor.println("MIC:START");
}

static void stopMicCapture() {
  if (audioBufIdx > 0) {
    for (int i = audioBufIdx; i < AUDIO_BUFSIZE; i++) audioBuf[i] = 0;
    sendAudioPacket();
    audioBufIdx = 0;
  }

  micActive = false;
  micDummyMode = false;
  // Keep I2S running between button captures to avoid fragile reconfigure cycles.

  ensureMonitorReady();
  if (monitorReady) {
    uint32_t elapsedUs = micros() - captureStartUs;
    dumpSaiRegs("STOP");
    dumpMicPinState("STOP");
    Monitor.print("MIC:SAMPLES:");
    Monitor.println((int)streamedSamples);
    Monitor.print("MIC:ELAPSED_US:");
    Monitor.println((int)elapsedUs);
    Monitor.print("MIC:OVERFLOW:");
    Monitor.println((int)overflowCount);
    Monitor.print("MIC:READ_OK:");
    Monitor.println((int)i2sReadOkBlocks);
    Monitor.print("MIC:READ_ERR:");
    Monitor.println(i2sLastReadErr);
    Monitor.println("MIC:STOP");
  }
}

static void sampleMicWhilePressed() {
  if (!micActive || !i2sOk || !i2sRunning) return;
  if (micDummyMode) return;

  auto norm24 = [](int32_t raw) -> int32_t {
    return (raw > 8388607 || raw < -8388608) ? (raw >> 8) : raw;
  };

  void *mem_block = nullptr;
  size_t block_size = 0;
  int r = i2s_read(i2s_dev, &mem_block, &block_size);
  if (r != 0) {
    i2sLastReadErr = r;
    if (r != -EAGAIN && r != -EBUSY) {
      overflowCount++;
    }
    if ((millis() - lastSaiDumpMs) >= 1000) {
      lastSaiDumpMs = millis();
      dumpSaiRegs("READ_ERR");
      if (!i2sReadErrPinsDumped) {
        dumpMicPinState("READ_ERR");
        i2sReadErrPinsDumped = true;
      }
    }
    return;
  }
  if (!mem_block || block_size == 0) {
    overflowCount++;
    return;
  }

  size_t copy_size = block_size;
  if (copy_size > sizeof(i2sReadBlock)) copy_size = sizeof(i2sReadBlock);
  memcpy(i2sReadBlock, mem_block, copy_size);
  i2sRecycleBlock(mem_block);

  int32_t *stereo = i2sReadBlock;
  int n_pairs = (int)(copy_size / (2 * sizeof(int32_t)));
  if (n_pairs <= 0) {
    overflowCount++;
    return;
  }

  if (i2sReadOkBlocks == 0) {
    uint64_t eL = 0;
    uint64_t eR = 0;
    for (int i = 0; i < n_pairs; i++) {
      int32_t l = norm24(stereo[i * 2]);
      int32_t rr = norm24(stereo[i * 2 + 1]);
      eL += (uint64_t)(l >= 0 ? l : -l);
      eR += (uint64_t)(rr >= 0 ? rr : -rr);
    }
    i2sSelectedChannel = (eR > (eL * 2)) ? 1 : 0;
    if (monitorReady) {
      Monitor.print("MIC:CH:");
      Monitor.println(i2sSelectedChannel);
    }
  }
  i2sReadOkBlocks++;

  for (int i = 0; i < n_pairs; i++) {
    int32_t raw = norm24(stereo[(i * 2) + i2sSelectedChannel]);

    decimSum += raw;
    decimPhase++;
    if (decimPhase < DECIM_FACTOR) continue;
    decimPhase = 0;

    int32_t avg = decimSum / DECIM_FACTOR;
    decimSum = 0;

    int32_t s = avg * I2S_GAIN;
    if (s >  8388607) s =  8388607;
    if (s < -8388608) s = -8388608;

    audioBuf[audioBufIdx++] = (int8_t)(s >> 16);

    if (audioBufIdx >= AUDIO_BUFSIZE) {
      sendAudioPacket();
      audioBufIdx = 0;
      k_yield();
    }
  }
}

static void handleButton() {
  if (AUTO_MIC_DIAG) return;

  bool rawPressed = (digitalRead(BTN_PIN) == LOW);  // active-low pullup
  unsigned long nowMs = millis();

  if (rawPressed != btnRawPressed) {
    btnRawPressed = rawPressed;
    lastBtnEdgeMs = nowMs;
  }
  if ((nowMs - lastBtnEdgeMs) < BTN_DEBOUNCE_MS) return;

  if (btnStablePressed != btnRawPressed) {
    btnStablePressed = btnRawPressed;
    setScreenColor(btnStablePressed);
    if (btnStablePressed && !micActive) startMicCapture();
    else if (!btnStablePressed && micActive) stopMicCapture();
  }
}

static void handleAutoMic() {
  if (!AUTO_MIC_DIAG) return;

  unsigned long nowMs = millis();
  if (!micActive) {
    if ((long)(nowMs - autoNextStartMs) >= 0) {
      if (monitorReady) Monitor.println("AUTO:TRY");
      startMicCapture();
      if (micActive) {
        setScreenColor(true);
        autoStopAtMs = nowMs + AUTO_RECORD_MS;
      } else {
        autoNextStartMs = nowMs + 500;
      }
    }
    return;
  }

  if ((long)(nowMs - autoStopAtMs) >= 0) {
    stopMicCapture();
    setScreenColor(false);
    autoNextStartMs = nowMs + AUTO_REARM_MS;
  }
}

void setup() {
  Serial.begin(115200);
  delay(20);
  Serial.println("SERIAL:BOOT");

  pinMode(BTN_PIN, INPUT_PULLUP);
  delay(2);

  btnRawPressed = (digitalRead(BTN_PIN) == LOW);
  btnStablePressed = btnRawPressed;
  screenPressed = !btnStablePressed;

  display.begin();
  display.setRotation(0);
  bool showPressed = AUTO_MIC_DIAG ? false : btnStablePressed;
  display.fillScreen(showPressed ? GC9A01A_RED : GC9A01A_BLACK);
  displayReady = true;
  screenPressed = showPressed;

  // Optional one-shot diagnostic to compare pre/post Bridge I2S behavior.
  if (RUN_PRE_BRIDGE_PROBE) {
    runPreBridgeI2SProbe();
  }

  ensureMonitorReady();
  if (monitorReady) {
    Monitor.println("BOOT:PRE_BRIDGE");
  }

  Bridge.begin();
  delay(20);

  ensureMonitorReady();
  if (monitorReady) {
    Monitor.println("BOOT:POST_BRIDGE");
    Monitor.print("PREBRIDGE:READ_OK:");
    Monitor.println((int)preBridgeReadOk);
    Monitor.print("PREBRIDGE:CFG:");
    Monitor.print(preBridgeCfgErr);
    Monitor.print(" START:");
    Monitor.print(preBridgeStartErr);
    Monitor.print(" LAST_ERR:");
    Monitor.println(preBridgeLastErr);
  }

  // Lazy-init I2S on first capture start to keep boot path minimal/stable.
  // i2sInit();

  if (BYPASS_I2S_CTRL) {
    if (BOOT_START_I2S && i2sOk) {
      i2s_trigger(i2s_dev, I2S_DIR_RX, I2S_TRIGGER_DROP);
      i2s_trigger(i2s_dev, I2S_DIR_RX, I2S_TRIGGER_PREPARE);
      i2sStartErr = i2s_trigger(i2s_dev, I2S_DIR_RX, I2S_TRIGGER_START);
      i2sRunning = (i2sStartErr == 0);
    } else {
      i2sRunning = true;
      i2sStartErr = 0;
    }
  }

  ensureMonitorReady();
  if (monitorReady) {
    Monitor.print("BOOT:I2S_DT:");
    Monitor.print(i2sDtNodePresent ? 1 : 0);
    Monitor.print(" RDY:");
    Monitor.print(i2sReadyAtBoot);
    Monitor.print(" INI:");
    Monitor.print(i2sInitialized);
    Monitor.print(" RES:");
    Monitor.print(i2sInitRes);
    Monitor.print(" DINIT:");
    Monitor.print(i2sDeviceInitCallRes);
    Monitor.print(" DMA:");
    Monitor.print(i2sDmaReadyAtBoot);
    Monitor.print(" CFG:");
    Monitor.println(i2sCfgErr);
    Monitor.print("BOOT:AUTO_MIC_DIAG:");
    Monitor.println(AUTO_MIC_DIAG ? 1 : 0);
    Monitor.print("BOOT:SLAB_BUF:0x");
    Monitor.println((uint32_t)(uintptr_t)i2s_slab.buffer, HEX);
    Monitor.print("BOOT:SLAB_FREE:0x");
    Monitor.println((uint32_t)(uintptr_t)i2s_slab.free_list, HEX);
    Monitor.print("BOOT:SLAB_BS:");
    Monitor.println((uint32_t)i2s_slab.info.block_size);
    Monitor.print("BOOT:SLAB_NB:");
    Monitor.println((uint32_t)i2s_slab.info.num_blocks);
  }

  if (AUTO_MIC_DIAG) {
    autoNextStartMs = millis() + AUTO_START_DELAY_MS;
  }
}

void loop() {
  ensureMonitorReady();
  handleButton();
  handleAutoMic();
  sampleMicWhilePressed();

  if (monitorReady && (millis() - lastHeartbeatMs) >= 1000) {
    lastHeartbeatMs = millis();
    Monitor.print("HB AUTO:");
    Monitor.print(AUTO_MIC_DIAG ? 1 : 0);
    Monitor.print(" MIC:");
    Monitor.print(micActive ? 1 : 0);
    Monitor.print(" CFG:");
    Monitor.print(i2sCfgErr);
    Monitor.print(" START:");
    Monitor.print(i2sStartErr);
    Monitor.print(" PBRD:");
    Monitor.print((int)preBridgeReadOk);
    Monitor.print(" PBCFG:");
    Monitor.print(preBridgeCfgErr);
    Monitor.print(" PBST:");
    Monitor.print(preBridgeStartErr);
    Monitor.print(" PBLERR:");
    Monitor.println(preBridgeLastErr);
  }
  static unsigned long lastSerialMs = 0;
  if ((millis() - lastSerialMs) >= 1000) {
    lastSerialMs = millis();
    Serial.println("SERIAL:TICK");
  }
}
