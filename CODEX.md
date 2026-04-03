# CODEX

## Current Session Context

This section supersedes older notes below when they conflict.

- The live firmware target is still the `Waveshare ESP32-S3-DEV-KIT-N32R16V-M` using Arduino target `esp32:esp32:esp32s3`.
- Current hotspot defaults are:
  - Wi-Fi SSID: `Tim Apple iPhone`
  - Wi-Fi password: `thesameasyours`
- Device settings are persisted in ESP32 `Preferences` and can override compile-time defaults unless code explicitly migrates or forces them. This includes:
  - Wi-Fi SSID/password
  - Deepgram/OpenAI keys
  - model settings
  - `systemPrompt`
- The button is on `GPIO2` and is wired as `INPUT_PULLUP`.
  - idle = `HIGH`
  - pressed = `LOW`
  - current interaction is hold-to-speak: press starts mic capture, release stops capture and runs Deepgram -> OpenAI.
- The mic is an `INMP441` on:
  - `WS -> GPIO4`
  - `SCK -> GPIO5`
  - `SD -> GPIO6`
- The mic path was made stable again by moving away from fragile runtime buffer allocation.
  - audio now uses a static PSRAM-backed buffer reserved at boot
  - earlier GUI work increased memory pressure and caused `Mic buffer alloc failed`
- The microphone should stay idle except during hold-to-speak or explicit caption commands. It should not be probed continuously during boot/self-test.
- Current I2C devices are on:
  - `SDA -> GPIO38`
  - `SCL -> GPIO39`
  - `DRV2605L` detected at `0x5A`
  - `MPU6050` detected at `0x68`
- If `SCAN` reports `SDA=LOW SCL=LOW`, treat that as a wiring or electrical bus problem, not an address problem.
- The `DRV2605L` is controlled over I2C. Its `IN` pin is not required for the current firmware mode.
- The attached vibration motor is a 2-wire ERM motor, not an LRA.
- The IMU has been verified working over serial. The haptic driver is detected over I2C, but physical motor vibration has been inconsistent and should still be validated with `BUZZ`.
- The display was temporarily changed to a chat-style GUI, but that was rolled back after regressions. Current display behavior is the older fixed layout with:
  - `ROCK` header
  - `WiFi:` / `POT:` row
  - `USER` section
  - `AI` section
- `POT` refers to the potentiometer on `GPIO8`. It controls reply-length budget in the normal text-reply path.
- A serial `TEST:` command exists to exercise the OpenAI/display path without the microphone.
- Serial helpers worth remembering:
  - `HELP`
  - `STATUS`
  - `PROMPT`
  - `PROMPT DEFAULT`
  - `TEST:<message>`
  - `BUZZ`
  - `SCAN`
  - `SENSORS`
- `arduino-cli monitor` has been unreliable on this board at times. `screen /dev/cu.usbmodem... 115200` is often a more reliable fallback.
- USB serial ports seen during this session included:
  - `/dev/cu.usbmodem1423101`
  - `/dev/cu.usbmodem1424101`
- Recent prompt work focused on getting OpenAI replies to be a single emoticon / ASCII emoticon. If future behavior seems inconsistent, inspect the active prompt and the reply post-processing path before assuming the model is ignoring instructions.

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
