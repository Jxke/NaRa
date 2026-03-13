# Ambient AI Assistant

## What this is

An on-device ambient AI assistant for the Arduino UNO Q platform (ARM64 Linux + MCU).
It continuously listens, observes sensor data, builds layered memory summaries, and
responds to spoken queries using only local compute — no cloud services.

## Target hardware

- Arduino UNO Q: ARM64 Linux (Debian 13), ~3.6 GB RAM, aarch64
- MCU communicates with Linux via Arduino Bridge protocol
- USB microphone for audio input
- USB speaker (PCM2902 codec) for audio output
- Sensors on MCU: temperature, humidity, etc.

## Architecture overview

### Data flow

1. Every 30 seconds, collect sensor data (via Bridge) and mic audio (via USB mic)
2. Audio → local Whisper STT → transcription
3. Sensor readings + transcriptions stored as temporary context in SQLite
4. Context layers compress upward over time (temp → hourly → daily → weekly)
5. On user query: assemble full prompt (system prompt + all context layers + question) → local LLM → TTS response
6. Assistant's own response is appended back into temporary context

### Context hierarchy

| Layer     | Inputs                          | Compression ratio        |
|-----------|---------------------------------|--------------------------|
| Temporary | Raw sensor + transcription      | 1 entry per 30s cycle    |
| Hourly    | 120 temporary entries           | 120:1 (= 1 hour)        |
| Daily     | 24 hourly entries               | 24:1 (= 1 day)          |
| Weekly    | 7 daily entries                 | 7:1 (= 1 week)          |

### Key components (to be built)

- `config.py` — Central configuration (exists)
- `db.py` — SQLite database schema and access layer
- `main.py` — Main loop: collection, summarization, query handling
- `stt.py` — Speech-to-text module (USB mic → Whisper transcription)
- `tts.py` — Text-to-speech output (espeak-ng or Piper)
- `llm.py` — Local LLM inference (quantized GGUF model)
- `bridge.py` — Arduino Bridge sensor communication
- `context.py` — Context hierarchy assembly and summarization
- `sketch/sketch.ino` — MCU firmware for sensor collection
- `system_prompt.txt` — User-configurable system prompt

## Tech stack

- Python 3.13
- SQLite (single-file database, stdlib `sqlite3`)
- faster-whisper 1.2.1 (Whisper base, int8, CPU)
- Local LLM: Qwen2-1.5B (GGUF Q4_K_M quantization, via llama-cpp-python)
- TTS: espeak-ng or Piper
- Audio capture: `arecord` (ALSA) via subprocess
- MCU-Linux IPC: Arduino Bridge protocol (Unix socket at `/tmp/bridge_socket`)

## Conventions

- All config values live in `config.py` — modules import from there, no hardcoded values
- Database is a single SQLite file at `config.DB_PATH`
- System prompt is a plain text file at `config.SYSTEM_PROMPT_PATH`
- Audio device identifiers use ALSA `plughw:` format
- Keep modules small and focused — this runs on constrained hardware
- Prefer simplicity over abstraction; avoid unnecessary dependencies
- All processing is local — no network/cloud API calls
