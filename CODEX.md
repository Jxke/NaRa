# CODEX

## Purpose

This repo was repurposed from an older Arduino UNO Q / Debian-side project into a pure ESP32-S3 firmware project for a `Waveshare ESP32-S3-DEV-KIT-N32R16V-M`.

Current architecture:

- push-to-talk input on ESP32-S3
- INMP441 microphone capture
- Deepgram for speech-to-text
- OpenAI for text response generation
- no TTS in the current design
- Waveshare 1.54" e-paper display for captions and status
- DRV2605L for haptic feedback
- MPU6050 on shared I2C bus

## Hardware Context

Board:

- `Waveshare ESP32-S3-DEV-KIT-N32R16V-M`
- Arduino target: `esp32:esp32:esp32s3`
- build profile used:
  - `FlashSize=32M`
  - `PartitionScheme=default_8MB`
  - `PSRAM=opi`
  - `USBMode=hwcdc`
  - `CDCOnBoot=cdc`

Pin mapping:

- INMP441
  - `WS -> GPIO4`
  - `SCK -> GPIO5`
  - `SD -> GPIO6`
- Waveshare 1.54" e-paper V2
  - `DIN -> GPIO11`
  - `CLK -> GPIO12`
  - `CS -> GPIO10`
  - `DC -> GPIO13`
  - `RST -> GPIO14`
  - `BUSY -> GPIO9`
- DRV2605L + MPU6050 shared I2C
  - `SDA -> GPIO38`
  - `SCL -> GPIO39`
- Momentary button
  - `GPIO2`
- Potentiometer
  - `GPIO8`

## Decisions Made

- The original DAZI-AI import was used only as an intermediate reference and was later removed from the repo.
- ByteDance ASR was replaced conceptually with Deepgram.
- TTS was removed by user request.
- Push-to-talk was chosen over continuous conversation.
- The e-paper display is used for low-frequency UI only:
  - status
  - captions
  - short assistant replies
- A serial `TEST:` path was added so OpenAI/display behavior can be tested without a microphone.

## Credentials Context

Credentials are provisioned over serial and stored in `Preferences`.

Values supplied during this session:

- Wi-Fi SSID: `Towards The Sun`
- Wi-Fi password: `gsdgsdgsd`
- Deepgram API key: provided by user and provisioned
- OpenAI API key: provided by user and provisioned

These credentials should not be duplicated in committed source files. They are intended to live only in device `Preferences`.

## Operational Notes

- Flash helper: [scripts/flash.ps1](/c:/Users/Jake/Documents/GitHub/ROCK/scripts/flash.ps1)
- Provisioning helper: [scripts/provision.ps1](/c:/Users/Jake/Documents/GitHub/ROCK/scripts/provision.ps1)
- Main firmware: [ROCK.ino](/c:/Users/Jake/Documents/GitHub/ROCK/ROCK/ROCK.ino)

Useful serial commands at `115200`:

- `HELP`
- `STATUS`
- `TEST:<message>`

Example:

```text
TEST:Say hello from the OpenAI test path
```

## Verified During Session

- e-paper display working
- firmware compiles cleanly with Arduino CLI
- firmware uploaded successfully to the board
- serial `TEST:` path works per user report

## Git Context

- working branch: `dazi-build`
- remote: `origin https://github.com/Jxke/ROCK.git`
