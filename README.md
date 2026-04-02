# ROCK

This branch now targets a `Waveshare ESP32-S3-DEV-KIT-N32R16V-M` running a push-to-talk assistant:

- INMP441 microphone -> Deepgram STT
- OpenAI text reply
- Waveshare 1.54" e-paper captions/status
- DRV2605L and MPU6050 on shared I2C

The old UNO Q / Debian-side flow is obsolete here.
The temporary `DAZI-AI` import used during early integration has been removed; the active firmware is self-contained in this repo.

## Target Board

- Arduino FQBN base: `esp32:esp32:esp32s3`
- Flash/PSRAM profile used here: `FlashSize=32M`, `PartitionScheme=default_8MB`, `PSRAM=opi`
- Board enumerated as `COM9` during the latest flash, but Windows may assign a different COM port after reconnects

## Wiring

- INMP441 microphone
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

If any wiring changes, update the pin constants at the top of [ROCK.ino](/c:/Users/Jake/Documents/GitHub/ROCK/ROCK/ROCK.ino).

## Build

```powershell
./scripts/flash.ps1
```

## Upload

```powershell
./scripts/flash.ps1 -Upload
```

If your board is not on `COM9`, pass the correct port:

```powershell
./scripts/flash.ps1 -Upload -Port COM10
```

## Runtime Configuration

Secrets are provisioned over serial and stored in `Preferences`.

Manual JSON format:

```json
{"wifi_ssid":"YOUR_WIFI","wifi_password":"YOUR_WIFI_PASSWORD","deepgram_api_key":"YOUR_DEEPGRAM_KEY","deepgram_model":"nova-2-general","deepgram_language":"en-US","openai_apiKey":"YOUR_OPENAI_KEY","openai_apiBaseUrl":"https://api.openai.com","openai_model":"gpt-4.1-nano","system_prompt":"You are a concise embedded assistant."}
```

Helper script:

```powershell
./scripts/provision.ps1 -Port COM9 -WifiSsid "YOUR_WIFI" -WifiPassword "YOUR_WIFI_PASSWORD" -DeepgramApiKey "YOUR_DEEPGRAM_KEY" -OpenAIApiKey "YOUR_OPENAI_KEY"
```

Use the push button on `GPIO2` for press-and-hold recording. The potentiometer on `GPIO8` scales the reply length target.

## Serial Test Mode

The firmware includes a serial-injected transcript path so the OpenAI/display pipeline can be tested without the microphone.

Open a terminal on the active board port at `115200`:

```powershell
arduino-cli monitor -p COM9 -c baudrate=115200
```

Available commands:

- `HELP`
- `STATUS`
- `TEST:<message>`

Example:

```text
TEST:Say hello from the OpenAI test path
```

This skips the microphone and Deepgram STT step, then runs the normal OpenAI request and e-paper rendering flow.

## Arduino CLI Dependencies

Installed during integration:

- `esp32:esp32`
- `ArduinoJson`
- `ArduinoWebsockets`
- `Seeed_Arduino_mbedtls`
- `GxEPD2`
- `Adafruit DRV2605 Library`
- `Adafruit MPU6050`
- `Adafruit Unified Sensor`

## Current Status

- Main ESP32-S3 sketch now uses Deepgram + OpenAI text only
- E-paper caption UI added
- Arduino CLI build/upload helper added
- Serial provisioning helper added
- Serial `TEST:` mode added for non-mic pipeline checks
