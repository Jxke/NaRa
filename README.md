# ESP32-LLM on Waveshare ESP32-S3-DEV-KIT-N32R16V-M

Runs a 260K parameter Llama2-based language model directly on the ESP32-S3.
Forked from [DaveBben/esp32-llm](https://github.com/DaveBben/esp32-llm) with hardware config updated for the N32R16V-M board.

## Hardware

| Component | Details |
|-----------|---------|
| Board | Waveshare ESP32-S3-DEV-KIT-N32R16V-M |
| Flash | 32MB QSPI |
| PSRAM | 16MB Octal SPI |
| Display | SSD1306 OLED 128×64 (I2C) |
| I2C SCL | GPIO 9 |
| I2C SDA | GPIO 8 |

## Model

- **Architecture:** Llama2 transformer (260K parameters)
- **Dataset:** TinyStories
- **Inference speed:** ~19 tokens/sec at 240 MHz
- **Model file:** `data/stories260K.bin` (~1MB)
- **Tokenizer:** `data/tok512.bin` (512-token vocabulary)

## Project Structure

```
esp32-llm/
├── main/
│   ├── llama.h          OLED llama bitmap graphic
│   ├── llm.h            LLM structures and API
│   ├── llm.c            Transformer inference engine (dual-core, SIMD)
│   └── main.c           Entry point: display, SPIFFS, model load, generation
├── data/
│   ├── stories260K.bin  Model checkpoint
│   └── tok512.bin       Tokenizer
├── partitions.csv       Custom partition table (1MB app + 2MB SPIFFS)
├── sdkconfig            Board config (32MB flash, 16MB octal PSRAM, 240MHz)
└── Kconfig.projbuild    I2C pin configuration
```

## Prerequisites

- [ESP-IDF v5.3](https://github.com/espressif/esp-idf) installed at `~/esp/esp-idf`
- SSD1306 OLED display wired to I2C pins (SCL=9, SDA=8)
- USB cable connected to board (COM6)

## Build & Flash

```bash
# Load ESP-IDF environment (run from Windows CMD, not Git Bash)
cd C:\Users\Jake\esp\esp-idf
export.bat

# Navigate to project
cd C:\Users\Jake\Documents\GitHub\ROCK\esp32-llm

# Set target
idf.py set-target esp32s3

# Build
idf.py build

# Flash + upload SPIFFS data partition
idf.py -p COM6 flash

# Monitor serial output
idf.py -p COM6 monitor
```

## Board-Specific Config Changes

Compared to the original repo, the following `sdkconfig` values were updated for the N32R16V-M:

| Setting | Original | This board |
|---------|----------|------------|
| Flash size | 4MB | 32MB |
| PSRAM mode | Quad | Octal |

## Notes

- The model and tokenizer must be in the SPIFFS `data/` partition. `idf.py flash` handles this automatically via the `SPIFFS_IMAGE_FLASH_IN_PROJECT` directive in `CMakeLists.txt`.
- I2C pins can be changed via `idf.py menuconfig` → Component config → I2C Configuration.
- Generated text appears on the OLED display. Serial monitor also shows output + tokens/sec.
