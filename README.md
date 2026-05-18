# Nara

<p align="center">
  <img src="ROCK/nara_logo.png" alt="Nara logo" width="180" />
</p>

Nara is a handheld computational artifact for reflective consultation. It combines a physical ESP32-S3 device, a low-refresh e-paper interface, speech transcription, a tiered context memory, and a constrained symbolic glyph pipeline. Instead of returning conversational prose, Nara translates a spoken prompt into a small visual response: three bitmap glyphs and one companion word.

The project explores how computation can operate as a design medium rather than only a representation tool. The system does not simply display generated content. It stages a full interaction loop across sensing, context formation, symbolic reasoning, visual selection, embedded rendering, and physical feedback.

## What It Does

1. The user holds a physical button and speaks into the device.
2. The ESP32-S3 records a WAV buffer from an INMP441 microphone.
3. The device sends the recording to a Supabase Edge Function.
4. Deepgram transcribes the audio.
5. The backend fetches recent and compressed user context from a tiered memory model.
6. A reasoner model analyzes the user situation without selecting glyphs directly.
7. A second model selects exactly three valid glyphs and one short companion word from the live glyph inventory.
8. The backend validates, repairs, records, and returns the consultation result.
9. The device renders bitmap glyphs on a Waveshare 1.54 inch e-paper display.

## Design Focus

Nara treats digital media as a situated symbolic system. The important computational work is not only model inference, but the coordination between physical input, deliberate context capture, memory compression, constrained symbol selection, and embedded display.

The system is intentionally not a continuous listener. Only button-press speech is used to build rolling user context. Ambient/background audio is excluded from the live Supabase memory pipeline. This makes context an explicit interaction material: the user's remembered history is built from moments they choose to submit.

## Architecture

```text
handheld device
  button + microphone
  ESP32-S3 firmware
  e-paper glyph interface
        |
        v
speech-to-text
  Deepgram transcription
        |
        v
Supabase Edge Functions
  /consult
  /compress-hourly
  /compress-weekly
        |
        v
tiered user context
  T1: recent user prompts
  T2: daily summaries
  T3: weekly patterns
  T4: long-lived themes
        |
        v
glyph consultation
  reasoner model
  constrained glyph picker
  validation + fallback
        |
        v
embedded output
  3 glyph bitmaps
  1 companion word
```

Core files:

- [ROCK/ROCK.ino](ROCK/ROCK.ino): ESP32-S3 firmware, recording flow, UI state machine, e-paper rendering, and consultation client
- [supabase/functions/consult/index.ts](supabase/functions/consult/index.ts): live consultation pipeline
- [supabase/functions/compress-hourly/index.ts](supabase/functions/compress-hourly/index.ts): T1 to T2 context compression
- [supabase/functions/compress-weekly/index.ts](supabase/functions/compress-weekly/index.ts): higher-level pattern compression
- [supabase/seed.sql](supabase/seed.sql): seeded glyph inventory and prompt metadata
- [scripts/generate_consult_glyph_header.js](scripts/generate_consult_glyph_header.js): glyph bitmap header generator
- [ROCK/consult_glyph_bitmaps.h](ROCK/consult_glyph_bitmaps.h): firmware-ready packed glyph bitmaps

## Dynamic User Context

Nara's context system is built as a memory hierarchy rather than a single transcript log.

- `tier_1_signals`: raw, recent button-press user prompts
- `tier_2_daily`: daily summaries of recent interaction topics, emotional arcs, and key moments
- `tier_3_weekly`: recurring topics, emotional patterns, and decision trends
- `tier_4_themes`: longer-lived themes with strength scores and reinforcement timestamps

The `/consult` function gathers context from all tiers in parallel, formats it into a compact context block, and passes it into the reasoner model. This lets the current spoken prompt be interpreted against recent utterances, daily summaries, weekly patterns, and persistent themes.

The context model is prompt-only by design. In the current live path, `/consult` stores user speech as `speaker_label = "user_prompt"`, `/compress-hourly` only summarizes those prompt rows, and ambient/background audio is not persisted into Supabase. This keeps the system's memory tied to intentional use.

## Glyph Generation Pipeline

Nara's output is generated through a constrained symbolic pipeline rather than direct free-form image generation.

The glyph library is a seeded inventory of 43 symbolic entries. Each glyph has:

- a stable text ID
- tags
- interpretations
- reflective prompt questions
- selectability metadata
- bitmap assets for embedded display

The consultation pipeline separates interpretation from selection:

1. **Context fetch** gathers recent signals, daily context, weekly patterns, long-term themes, the glyph inventory, and recent glyph history.
2. **Deep reasoner** analyzes the user's situation, focusing on emotional state, core tension, and directional pull.
3. **Glyph picker** receives the analysis plus the valid glyph inventory and selects a meaningful trio.
4. **Recent history guidance** downranks overused or repeated glyphs so the system does not mechanically return the same symbols.
5. **Validation** requires exactly three unique selectable glyph IDs and a companion word under the configured length limit.
6. **Repair and fallback** normalize legacy aliases, remove invalid IDs, retry malformed model outputs, and fall back to valid inventory choices if needed.
7. **Storage** records the transcript, selected glyph IDs, word, reasoning, and latency.
8. **Firmware rendering** maps returned IDs to packed bitmap arrays in program memory and draws them on the e-paper display.

This creates a narrow but expressive output grammar. The model can interpret and compose, but it cannot invent arbitrary symbols outside the designed visual system.

## Embedded Interface

The device UI is organized around a small state machine:

- logo splash
- idle
- listening
- processing
- output
- menu
- lexicon
- history
- settings
- glyph detail

The output screen renders glyphs as bitmaps, not raw IDs. A browser prototype for the UI state machine is available at [nara_ui_state_machine.html](nara_ui_state_machine.html), and a result preview tool is available at [consult_preview.html](consult_preview.html).

## Hardware

Target board:

- Waveshare `ESP32-S3-DEV-KIT-N32R16V-M`
- Arduino FQBN base: `esp32:esp32:esp32s3`
- Flash/PSRAM profile: `FlashSize=32M`, `PartitionScheme=default_8MB`, `PSRAM=opi`

Inputs and outputs:

- INMP441 microphone for push-to-talk capture
- Waveshare 1.54 inch e-paper V2 display
- DRV2605L haptic driver
- MPU6050 IMU
- momentary record button
- rotary encoder
- select and back buttons

Pin mapping is defined in [ROCK/ROCK.ino](ROCK/ROCK.ino). Current wiring:

| Component | Pin |
| --- | --- |
| INMP441 WS | GPIO4 |
| INMP441 SCK | GPIO5 |
| INMP441 SD | GPIO6 |
| E-paper DIN | GPIO11 |
| E-paper CLK | GPIO12 |
| E-paper CS | GPIO10 |
| E-paper DC | GPIO13 |
| E-paper RST | GPIO14 |
| E-paper BUSY | GPIO9 |
| I2C SDA | GPIO38 |
| I2C SCL | GPIO39 |
| Record button | GPIO2 |
| Encoder CLK | GPIO8 |
| Encoder DT | GPIO3 |
| Select button | GPIO1 |
| Back button | GPIO7 |

## Build And Upload

Compile with Arduino CLI:

```bash
arduino-cli compile --fqbn esp32:esp32:esp32s3 ROCK
```

Upload to a connected board:

```bash
arduino-cli upload -p /dev/cu.usbmodemXXXX --fqbn esp32:esp32:esp32s3 ROCK
```

On Windows, the helper script can compile and upload:

```powershell
./scripts/flash.ps1 -Upload -Port COM9
```

List available boards:

```bash
arduino-cli board list
```

## Runtime Configuration

Secrets are provisioned over serial and stored in ESP32 `Preferences`.

Required for the live Nara pipeline:

- Wi-Fi credentials
- Deepgram API key
- Supabase URL
- Supabase anon key
- device API key

Optional legacy test paths can also use OpenAI configuration values, but the primary live path is `Deepgram -> Supabase /consult -> e-paper glyph output`.

Provisioning helper:

```powershell
./scripts/provision.ps1 -Port COM9 -WifiSsid "YOUR_WIFI" -WifiPassword "YOUR_WIFI_PASSWORD" -DeepgramApiKey "YOUR_DEEPGRAM_KEY" -SupabaseUrl "YOUR_SUPABASE_URL" -SupabaseAnonKey "YOUR_SUPABASE_ANON_KEY" -DeviceApiKey "YOUR_DEVICE_API_KEY"
```

## Serial Diagnostics

Open a serial monitor at `115200` baud:

```bash
arduino-cli monitor -p /dev/cu.usbmodemXXXX -c baudrate=115200
```

Useful commands:

- `HELP`
- `STATUS`
- `SCAN`
- `SENSORS`
- `BUZZ`
- `PROMPT`
- `PROMPT DEFAULT`
- `TEST:<message>`

`TEST:<message>` exercises the retained legacy display path without microphone capture. The primary Nara interaction remains hold-to-speak through the live consultation pipeline.

## Dependencies

Arduino libraries used by the firmware:

- `esp32:esp32`
- `ArduinoJson`
- `ArduinoWebsockets`
- `Seeed_Arduino_mbedtls`
- `GxEPD2`
- `Adafruit DRV2605 Library`
- `Adafruit MPU6050`
- `Adafruit Unified Sensor`

Backend services:

- Supabase database, auth, RLS, cron, and Edge Functions
- Deepgram speech-to-text
- LLM provider configured through the shared Edge Function client

## Repository Map

```text
ROCK/
  ROCK.ino                    firmware and Nara UI flow
  consult_glyph_bitmaps.h     generated embedded glyph assets
  nara_logo.png               source logo image
  nara_logo.h                 generated e-paper logo bitmap

glyphs/
  *.png                       glyph source previews
  *.bmp                       8-bit glyph inputs for firmware packing

scripts/
  flash.ps1                   Arduino CLI build/upload helper
  provision.ps1               serial provisioning helper
  generate_consult_glyph_header.js
  generate_logo_header.swift
  convert_to_8bit_bmp.swift

supabase/
  migrations/                 schema, RLS, device keys, glyph metadata
  functions/                  consultation and compression functions
  seed.sql                    glyph inventory seed data

browser_extension/
  prototype browser intervention surface
```
