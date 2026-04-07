# ROCK

This branch now targets a `Waveshare ESP32-S3-DEV-KIT-N32R16V-M` running a push-to-talk assistant:

- INMP441 microphone -> Deepgram STT
- OpenAI text reply
- Waveshare 1.54" e-paper captions/status plus a post-reply glyph gallery
- DRV2605L and MPU6050 on shared I2C

The old UNO Q / Debian-side flow is obsolete here.
The temporary `DAZI-AI` import used during early integration has been removed; the active firmware is self-contained in this repo.

## Target Board

- Arduino FQBN base: `esp32:esp32:esp32s3`
- Flash/PSRAM profile used here: `FlashSize=32M`, `PartitionScheme=default_8MB`, `PSRAM=opi`
- Board ports are host-specific and may change after reconnects.
  - Windows example: `COM9`
  - macOS examples seen during this session: `/dev/cu.usbmodem1423101`, `/dev/cu.usbmodem1424101`

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
  - configured as `INPUT_PULLUP`
  - idle = `HIGH`, pressed = `LOW`
- Potentiometer
  - `GPIO8`

If any wiring changes, update the pin constants at the top of `ROCK/ROCK.ino`.

## Build

```powershell
./scripts/flash.ps1
```

Arduino CLI equivalent:

```bash
arduino-cli compile --fqbn esp32:esp32:esp32s3 ROCK
```

## Upload

```powershell
./scripts/flash.ps1 -Upload
```

If your board is not on `COM9`, pass the correct port:

```powershell
./scripts/flash.ps1 -Upload -Port COM10
```

Arduino CLI equivalents:

```bash
arduino-cli upload -p /dev/cu.usbmodem1424101 --fqbn esp32:esp32:esp32s3 ROCK
```

```bash
arduino-cli board list
```

## Runtime Configuration

Secrets are provisioned over serial and stored in `Preferences`.

`Preferences` is the ESP32 persistent key-value store used for:

- Wi-Fi SSID/password
- Deepgram/OpenAI keys
- model settings
- `systemPrompt`

The sketch now boots with these Wi-Fi defaults unless you override them over serial:

- `wifi_ssid`: `caroline`
- `wifi_password`: `caroline#1`

Manual JSON format:

```json
{"wifi_ssid":"caroline","wifi_password":"caroline#1","deepgram_api_key":"YOUR_DEEPGRAM_KEY","deepgram_model":"nova-2-general","deepgram_language":"en-US","openai_apiKey":"YOUR_OPENAI_KEY","openai_apiBaseUrl":"https://api.openai.com","openai_model":"gpt-4.1-nano","system_prompt":"You are a guide to all questions of life. Reply with exactly one ASCII emoticon and no other text. Do not use Unicode emoji. Use plain ASCII like :) :( :D :P ;) :| <3 T_T -_- ._."}
```

Helper script:

```powershell
./scripts/provision.ps1 -Port COM9 -WifiSsid "YOUR_WIFI" -WifiPassword "YOUR_WIFI_PASSWORD" -DeepgramApiKey "YOUR_DEEPGRAM_KEY" -OpenAIApiKey "YOUR_OPENAI_KEY"
```

Use the push button on `GPIO2` for press-and-hold recording. The potentiometer on `GPIO8` scales the reply length target.

Current interaction model:

- hold `GPIO2` button to record
- release the button to stop recording
- firmware then runs `Deepgram -> OpenAI`
- the e-paper first displays the transcript in `USER` and the reply in `AI`
- after a successful reply, the screen enters a button-driven gallery:
  - first view: centered `TREE` at `128x128`
  - press 1: centered `BUTTERFLY` at `128x128`
  - press 2: centered `FLOWER` at `128x128`
  - press 3: 3-glyph `64x64` collage with centered `SELF-MASTERY`
  - press 4: returns to the normal `READY` screen so the next press can record again

## Serial Test Mode

The firmware includes a serial-injected transcript path so the OpenAI/display pipeline can be tested without the microphone.

Open a terminal on the active board port at `115200`:

```powershell
arduino-cli monitor -p COM9 -c baudrate=115200
```

macOS example:

```bash
arduino-cli monitor -p /dev/cu.usbmodem1424101 -c baudrate=115200
```

If `arduino-cli monitor` is unreliable on this USB CDC port, `screen` is often more stable:

```bash
screen /dev/cu.usbmodem1424101 115200
```

Available commands:

- `HELP`
- `STATUS`
- `PROMPT`
- `PROMPT DEFAULT`
- `BUZZ[:n]`
- `SCAN`
- `SENSORS`
- `MONITOR ON`
- `MONITOR OFF`
- `CAPTION`
- `CAPTION ON`
- `CAPTION OFF`
- `MIC LEFT`
- `MIC RIGHT`
- `TEST:<message>`

Example:

```text
TEST:Say hello from the OpenAI test path
```

This skips the microphone and Deepgram STT step, then runs the normal OpenAI request and e-paper rendering flow.
It also enters the same post-reply glyph gallery sequence that button-based recordings use.

Notes:

- `PROMPT` prints the stored and effective system prompt.
- `PROMPT DEFAULT` resets the stored prompt back to the firmware default.
- `BUZZ` triggers the DRV2605L haptic effect test.
- `SCAN` scans the I2C bus and reports idle line state.
- `SENSORS` and `MONITOR ON` are for button, potentiometer, and MPU6050 checks.
- the microphone should stay idle except during hold-to-speak or explicit caption commands
- the current firmware forces an ASCII-emoticon-style OpenAI reply mode

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

- Main ESP32-S3 sketch uses `INMP441 -> Deepgram STT -> OpenAI reply`
- E-paper uses the older fixed layout for live interaction:
  - `ROCK` header
  - `WiFi:` / `POT:` row
  - `USER`
  - `AI`
- After a successful reply, the button cycles a glyph gallery:
  - `TREE` `128x128`
  - `BUTTERFLY` `128x128`
  - `FLOWER` `128x128`
  - `TREE + BUTTERFLY + FLOWER` at `64x64` with centered `SELF-MASTERY`
- Arduino CLI build/upload helper added
- Serial provisioning helper added
- Swift helper added for converting JPG inputs into `128x128` 8-bit BMPs
- Serial `TEST:` mode added for non-mic pipeline checks
- Boot-time and live serial hardware diagnostics added
- `DRV2605L` is detected over I2C, but physical motor vibration still needs hardware validation with `BUZZ`
- `MPU6050` has been verified working over serial
