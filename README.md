# ROCK

This branch now targets a `Waveshare ESP32-S3-DEV-KIT-N32R16V-M` and vendors the upstream `DAZI-AI` Arduino library directly into this repo.

The previous UNO Q / Debian-side ambient AI setup is obsolete here and has been replaced with a pure ESP32-S3 Arduino flow:

- `DAZI-AI/`
  DAZI voice-assistant library imported from `https://github.com/zenhall/DAZI-AI`
- `ROCK/ROCK.ino`
  Main sketch adapted for this board
- `scripts/flash.ps1`
  Arduino CLI build and upload helper

## Target Board

- Arduino FQBN base: `esp32:esp32:esp32s3`
- Flash/PSRAM profile used here: `FlashSize=32M`, `PartitionScheme=default_8MB`, `PSRAM=opi`
- Serial port detected during integration: `COM6`

## Wiring

This sketch assumes external I2S audio hardware:

- INMP441 microphone
  - `SCK -> GPIO5`
  - `WS -> GPIO4`
  - `SD -> GPIO6`
  - `L/R -> GND`
  - `VDD -> 3.3V`
  - `GND -> GND`
- MAX98357A speaker amp
  - `BCLK -> GPIO48`
  - `LRC -> GPIO45`
  - `DIN -> GPIO47`
  - `VIN -> 5V or board speaker supply`
  - `GND -> GND`
- Start/stop button
  - Uses onboard `BOOT` button on `GPIO0`

If your mic or speaker is wired to different pins, update the constants at the top of [ROCK.ino](/c:/Users/Jake/Documents/GitHub/ROCK/ROCK/ROCK.ino).

## Build

```powershell
./scripts/flash.ps1
```

## Upload

```powershell
./scripts/flash.ps1 -Upload
```

If your board is not on `COM6`, pass the correct port:

```powershell
./scripts/flash.ps1 -Upload -Port COM7
```

## Runtime Configuration

Secrets are not hardcoded. On first boot, open a serial monitor at `115200`, send one JSON line, then press `BOOT`.

Free mode example:

```json
{"wifi_ssid":"YOUR_WIFI","wifi_password":"YOUR_WIFI_PASSWORD","subscription":"free","asr_api_key":"YOUR_VOLCENGINE_ASR_KEY","asr_cluster":"volcengine_input_en","openai_apiKey":"YOUR_OPENAI_KEY","openai_apiBaseUrl":"https://api.openai.com","system_prompt":"You are a concise voice assistant."}
```

Pro mode example:

```json
{"wifi_ssid":"YOUR_WIFI","wifi_password":"YOUR_WIFI_PASSWORD","subscription":"pro","asr_api_key":"YOUR_VOLCENGINE_ASR_KEY","asr_cluster":"volcengine_input_en","openai_apiKey":"YOUR_OPENAI_KEY","openai_apiBaseUrl":"https://api.openai.com","system_prompt":"You are a concise voice assistant.","minimax_apiKey":"YOUR_MINIMAX_KEY","minimax_groupId":"YOUR_GROUP_ID","tts_voice_id":"female-tianmei","tts_speed":1.0,"tts_volume":1.0,"tts_model":"speech-2.6-hd","tts_audio_format":"mp3","tts_sample_rate":16000,"tts_bitrate":32000}
```

The sketch saves that config into `Preferences`, so you only need to resend it when you want to change credentials or prompts.

## Arduino CLI Dependencies

Installed during integration:

- `esp32:esp32`
- `ArduinoJson`
- `ArduinoWebsockets`
- `Seeed_Arduino_mbedtls`

## Current Status

- DAZI-AI imported into the repo
- Main ESP32-S3 sketch added
- Arduino CLI build/upload helper added
- Old README replaced
- `esp32-llm` removal attempted; only a stale locked build-log residue may remain if Windows still has the old directory open
