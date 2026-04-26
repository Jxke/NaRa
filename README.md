# ROCK

This repo targets a `Waveshare ESP32-S3-DEV-KIT-N32R16V-M` running the Nara handheld consultation flow:

- INMP441 microphone capture
- Deepgram STT
- Supabase Edge Functions for glyph consultation and ambient context ingest
- Waveshare 1.54" e-paper Nara UI
- DRV2605L haptics and MPU6050 on shared I2C

The old UNO Q / Debian-side flow is obsolete here.

This repo is wired for the hosted Supabase project `tsblsjjlrjnllsqyusmb` by default. Running `supabase start` locally is optional and not required for normal firmware provisioning or hosted edge-function testing.

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
- Rotary encoder
  - `CLK -> GPIO8`
  - `DT -> GPIO3`
- Select button
  - `GPIO1`
- Back button
  - `GPIO7`

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
- Deepgram key
- Supabase URL / anon key / device API key
- optional OpenAI key for legacy test paths
- model settings
- `systemPrompt`

The sketch now boots with these Wi-Fi defaults unless you override them over serial:

- `wifi_ssid`: `caroline`
- `wifi_password`: `caroline#1`

Manual JSON format:

```json
{"wifi_ssid":"caroline","wifi_password":"caroline#1","deepgram_api_key":"YOUR_DEEPGRAM_KEY","deepgram_model":"nova-2-general","deepgram_language":"en-US","supabase_url":"https://tsblsjjlrjnllsqyusmb.supabase.co","supabase_anon_key":"YOUR_SUPABASE_ANON_KEY","device_api_key":"YOUR_DEVICE_API_KEY","openai_apiKey":"YOUR_OPENAI_KEY","openai_apiBaseUrl":"https://api.openai.com","openai_model":"gpt-4.1-nano","system_prompt":"You are a guide to all questions of life. Reply with exactly one ASCII emoticon and no other text. Do not use Unicode emoji. Use plain ASCII like :) :( :D :P ;) :| <3 T_T -_- ._."}
```

Helper script:

```powershell
./scripts/provision.ps1 -Port COM9 -WifiSsid "YOUR_WIFI" -WifiPassword "YOUR_WIFI_PASSWORD" -DeepgramApiKey "YOUR_DEEPGRAM_KEY" -SupabaseUrl "https://tsblsjjlrjnllsqyusmb.supabase.co" -SupabaseAnonKey "YOUR_SUPABASE_ANON_KEY" -DeviceApiKey "YOUR_DEVICE_API_KEY"
```

For the current Nara pipeline, the minimum cloud config is `Deepgram + Supabase URL + Supabase anon key + device API key`.
`OpenAI` remains optional and is only needed for the legacy direct reply path.

Use the push button on `GPIO2` for press-and-hold recording. The encoder on `GPIO8` / `GPIO3` moves through Nara UI selections and output focus.

Current interaction model:

- boot to a logo-only Nara splash
- enter the Nara idle screen
- hold `GPIO2` to record
- release `GPIO2` to stop recording
- firmware runs `Deepgram -> Supabase /consult`
- the e-paper shows Nara listening and processing screens
- the output screen shows 3 bitmap glyphs plus a companion word returned by the live consult pipeline
- ambient context capture also posts audio to `/ingest-audio` when enabled

## Serial Test Mode

The firmware still includes a serial-injected transcript path for the legacy OpenAI/display flow, but the main live path is the Nara consult pipeline.

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

Notes:

- `PROMPT` prints the stored and effective system prompt.
- `PROMPT DEFAULT` resets the stored prompt back to the firmware default.
- `BUZZ` triggers the DRV2605L haptic effect test.
- `SCAN` scans the I2C bus and reports idle line state.
- `SENSORS` and `MONITOR ON` are for button, encoder, and MPU6050 checks.
- the microphone should stay idle except during hold-to-speak or explicit caption commands
- the current firmware keeps the older ASCII-emoticon OpenAI prompt path only for legacy test mode

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

- Main ESP32-S3 sketch uses the Nara UI flow with:
  - logo-only splash
  - idle
  - listening
  - processing
  - bitmap glyph output
- Live consult requests send:
  - `Authorization: Bearer <SUPABASE_ANON_KEY>`
  - `apikey: <SUPABASE_ANON_KEY>`
  - `X-Device-Key: <device key>`
- Live Supabase project `tsblsjjlrjnllsqyusmb` now has:
  - current glyph migrations applied
  - current `seed.sql` glyph inventory applied
  - updated `consult` function deployed
- The device output view renders bitmap glyphs from [consult_glyph_bitmaps.h](/Users/carolinehana/ROCK/ROCK/consult_glyph_bitmaps.h) that match the seeded 43-glyph inventory, including a system-only `error` glyph excluded from normal reflection picks
- Arduino CLI build/upload helper added
- Serial provisioning helper added
- Swift helper added for converting JPG inputs into `128x128` 8-bit BMPs
- Serial `TEST:` mode retained for non-mic legacy OpenAI checks
- Boot-time and live serial hardware diagnostics added
- `DRV2605L` is detected over I2C, but physical motor vibration still needs hardware validation with `BUZZ`
- `MPU6050` has been verified working over serial
