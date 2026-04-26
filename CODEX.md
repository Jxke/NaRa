# CODEX

## Current Session Context

This section supersedes older notes below when they conflict.

- The active device firmware is the Nara UI flow in [ROCK.ino](/Users/carolinehana/ROCK/ROCK/ROCK.ino), and it is currently enabled with `ENABLE_NARA_UI_TEST = true`.
- The Nara path is no longer a fake sample-only demo. It is the live consult path that:
  - records from the device mic
  - runs Deepgram STT
  - calls the Supabase `/consult` function
  - renders a companion word plus 3 bitmap glyphs on the e-paper output screen
- Current Nara controls assume:
  - record button on `GPIO2`
  - select button on `GPIO1`
  - back button on `GPIO7`
  - rotary encoder `CLK` on `GPIO8`
  - rotary encoder `DT` on `GPIO3`
- Current Nara screen flow:
  - logo-only splash using [nara_logo.h](/Users/carolinehana/ROCK/ROCK/nara_logo.h)
  - idle
  - listening
  - processing
  - output
  - menu
  - lexicon
  - history
  - settings
  - detail
- Current Nara visual behavior:
  - splash shows only the Nara logo, no header/footer chrome
  - the old `ROCK` status layout should not appear during the Nara record/consult flow
  - the output screen shows bitmap glyphs only, not raw glyph IDs
- A local browser prototype for the Nara device UI exists at [nara_ui_state_machine.html](/Users/carolinehana/ROCK/nara_ui_state_machine.html).
  - it was used as a staging surface before firmware changes
  - supporting NaRa design assets were added under [public/fonts/pp/PPMondwest-Regular.otf](/Users/carolinehana/ROCK/public/fonts/pp/PPMondwest-Regular.otf), [public/fonts/pp/PPNeueBit-Bold.otf](/Users/carolinehana/ROCK/public/fonts/pp/PPNeueBit-Bold.otf), and [public/nara/logomark.svg](/Users/carolinehana/ROCK/public/nara/logomark.svg)

- The live firmware target is still the `Waveshare ESP32-S3-DEV-KIT-N32R16V-M` using Arduino target `esp32:esp32:esp32s3`.
- Current hotspot defaults are:
  - Wi-Fi SSID: `caroline`
  - Wi-Fi password: `caroline#1`
- Device settings are persisted in ESP32 `Preferences` and can override compile-time defaults unless code explicitly migrates or forces them. This includes:
  - Wi-Fi SSID/password
  - Deepgram key
  - Supabase URL
  - Supabase anon key
  - device API key
  - optional OpenAI key for legacy test paths
  - model settings
  - `systemPrompt`
- The button is on `GPIO2` and is wired as `INPUT_PULLUP`.
  - idle = `HIGH`
  - pressed = `LOW`
  - current interaction is hold-to-speak inside the Nara flow: press starts mic capture, release stops capture and runs Deepgram -> Supabase consult
- Nara controls:
  - encoder `CLK -> GPIO8`
  - encoder `DT -> GPIO3`
  - select `GPIO1`
  - back `GPIO7`
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
- The active consult path uses the Supabase-backed glyph pipeline when `USE_MADDI_PIPELINE = true`.
  - firmware posts recorded WAV audio to `/consult`
  - firmware also posts ambient captures to `/ingest-audio`
  - both requests now send `Authorization`, `apikey`, and `X-Device-Key`
  - the backend returns exactly 3 glyph IDs plus 1 companion word
  - firmware stores those in `consultGlyphIds[3]` and `consultWord`
  - the final e-ink consult screen renders bitmap glyphs plus the companion word
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
  - `/dev/cu.usbmodem21101`
- Recent prompt work focused on getting OpenAI replies to be a single emoticon / ASCII emoticon. If future behavior seems inconsistent, inspect the active prompt and the reply post-processing path before assuming the model is ignoring instructions.
- Backend glyph selection now uses a two-stage prompt flow in [index.ts](/Users/carolinehana/ROCK/supabase/functions/consult/index.ts):
  - `REASONER_SYSTEM_PROMPT` extracts the human situation with emphasis on emotional state, core tension, and directional pull
  - `PICKER_SYSTEM_PROMPT` selects 3 glyphs as a meaningful trio and derives the final word from the combined meaning of their reflective prompts
- The glyph schema has moved from `stories` to `prompt_questions`, and `labels` were removed.
- The live Supabase project `tsblsjjlrjnllsqyusmb` was updated in-session:
  - migrations `00007` and `00008` were applied
  - `consult` was redeployed
  - `seed.sql` was pushed so `public.glyphs` now matches the local 42-glyph inventory
- The current glyph dataset is 43 glyphs, seeded from [seed.sql](/Users/carolinehana/ROCK/supabase/seed.sql).
- Firmware bitmap assets for consult glyphs are generated into [consult_glyph_bitmaps.h](/Users/carolinehana/ROCK/ROCK/consult_glyph_bitmaps.h) from `glyphs/*.bmp` using [generate_consult_glyph_header.js](/Users/carolinehana/ROCK/scripts/generate_consult_glyph_header.js).
- Local visual reference for the consult result screen lives at [consult_preview.html](/Users/carolinehana/ROCK/consult_preview.html).
- Visible product naming on the consult result screen is now `NARA`, but some internal identifiers and comments still use historical `Maddi` names. Treat those as implementation legacy unless a broader rename is intentionally requested.

## Purpose

This repo was repurposed from an older Arduino UNO Q / Debian-side project into a pure ESP32-S3 firmware project for a `Waveshare ESP32-S3-DEV-KIT-N32R16V-M`.

Current architecture:

- push-to-talk input on ESP32-S3
- INMP441 microphone capture
- Deepgram for speech-to-text
- Supabase Edge Functions for consultation and ambient ingest
- optional OpenAI path retained only for legacy serial test mode
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
- Rotary encoder DT
  - `GPIO3`
- Rotary encoder CLK
  - `GPIO8`
- Select button
  - `GPIO1`
- Back button
  - `GPIO7`

## Decisions Made

- The original DAZI-AI import was used only as an intermediate reference and was later removed from the repo.
- ByteDance ASR was replaced conceptually with Deepgram.
- TTS was removed by user request.
- Push-to-talk was chosen over continuous conversation.
- The e-paper display is used for low-frequency UI only:
  - status
  - captions
  - short assistant replies
  - post-reply glyph gallery screens
  - consult result screen with 3 bitmap glyphs + companion word
- A serial `TEST:` path was added so OpenAI/display behavior can be tested without a microphone.

## Credentials Context

Credentials are provisioned over serial and stored in `Preferences`.

Values supplied during this session:

- Wi-Fi SSID: `caroline`
- Wi-Fi password: `caroline#1`
- Deepgram API key: provided by user and provisioned
- OpenAI API key: provided by user and provisioned

These credentials should not be duplicated in committed source files. They are intended to live only in device `Preferences`.

## Operational Notes

- Flash helper: [scripts/flash.ps1](/Users/carolinehana/ROCK/scripts/flash.ps1)
- Provisioning helper: [scripts/provision.ps1](/Users/carolinehana/ROCK/scripts/provision.ps1)
- Bitmap conversion helper: [scripts/convert_to_8bit_bmp.swift](/Users/carolinehana/ROCK/scripts/convert_to_8bit_bmp.swift)
- Consult glyph header generator: [scripts/generate_consult_glyph_header.js](/Users/carolinehana/ROCK/scripts/generate_consult_glyph_header.js)
- Main firmware: [ROCK.ino](/Users/carolinehana/ROCK/ROCK/ROCK.ino)
- Consult glyph bitmap header: [consult_glyph_bitmaps.h](/Users/carolinehana/ROCK/ROCK/consult_glyph_bitmaps.h)
- Consult preview: [consult_preview.html](/Users/carolinehana/ROCK/consult_preview.html)

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
- Wi-Fi verified connected to `caroline`
- Nara UI flow compiled, flashed, and iterated in-session
- Supabase consult backend scaffolding, seed data, migrations, and tests are in repo
- consult result preview exists locally in browser form
- consult bitmap rendering path is implemented in firmware source

## Git Context

- current active branch after later session work: `nara_demo`
- remote: `origin https://github.com/Jxke/ROCK.git`
