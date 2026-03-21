"""
main.py -- Ambient AI assistant main loop.

Button-gated audio pipeline:
  D2 press  -> MCU sends MIC:START and begins Bridge.notify("audio", int8[128])
  D2 release-> MCU sends MIC:STOP, Linux transcribes captured samples with Whisper,
               runs local LLM, maps to emoji, displays for EMOJI_DISPLAY_S seconds.
"""

import io
import json
import logging
import threading
import time
import wave

import bridge
import config
import context
import db
import emoji_map
import llm
import stt
from arduino_client import ArduinoClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _int8_samples_to_wav(samples, sample_rate):
    """Convert signed int8 PCM samples to WAV bytes (mono PCM16 LE)."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for s in samples:
            v = int(s)
            if v > 127:
                v = 127
            elif v < -128:
                v = -128
            wf.writeframesraw(int(v << 8).to_bytes(2, "little", signed=True))
    return buf.getvalue()


def handle_query(transcription):
    """Run full pipeline: transcription -> LLM -> emoji on display."""
    print(f'[QUERY] "{transcription}"')

    t0 = time.time()
    messages = context.assemble_prompt(transcription)
    t_ctx = time.time() - t0

    t0 = time.time()
    response = llm.chat(messages)
    t_llm = time.time() - t0

    word = response.split()[0] if response.split() else "unknown"
    emoji = emoji_map.word_to_emoji(word)

    print(f"[LLM] {response!r} -> word={word!r} -> emoji={emoji}")
    print(f"[TIMING] context={t_ctx:.2f}s  llm={t_llm:.1f}s")

    bridge.send_emoji(emoji)

    snapshot_id = db.get_latest_snapshot_id()
    if snapshot_id:
        db.update_snapshot_response(snapshot_id, f"{word} {emoji}")

    time.sleep(config.EMOJI_DISPLAY_S)
    bridge.clear_emoji()

    return word, emoji


def main():
    print("=" * 50)
    print("  Ambient AI Assistant (button-gated MCU mic)")
    print("=" * 50)

    db.init_db()
    print("[INIT] Database ready.")

    # Serial monitor for sensor lines and MIC:START/MIC:STOP events.
    reader = bridge.SerialReader()
    print("[INIT] Serial reader ready.")

    lock = threading.Lock()
    recording = False
    recording_samples = []
    recording_started_at = 0.0
    max_samples = int(config.MAX_RECORD_S * config.MCU_SAMPLE_RATE)
    min_samples = int(config.MIN_BUTTON_RECORD_S * config.MCU_SAMPLE_RATE)

    def on_audio(topic, data):
        nonlocal recording, recording_samples
        if topic != "audio":
            return

        samples = data.get("samples", [])
        if not samples:
            return

        with lock:
            if not recording:
                return
            remaining = max_samples - len(recording_samples)
            if remaining <= 0:
                return
            if len(samples) <= remaining:
                recording_samples.extend(samples)
            else:
                recording_samples.extend(samples[:remaining])

    arduino = ArduinoClient(on_message=on_audio)
    arduino.start()
    print(f"[INIT] ArduinoClient connecting to {config.BRIDGE_HOST}:{config.BRIDGE_PORT}...")

    current_sensors = {}
    last_snapshot_time = 0.0

    print("[READY] Waiting for button press on D2...\n")

    try:
        while True:
            # Read sensor and control lines from serial monitor.
            for line in reader.read_lines():
                if line == "MIC:START":
                    with lock:
                        recording = True
                        recording_samples = []
                        recording_started_at = time.time()
                    print("[MIC] START (button pressed)")
                    continue

                if line == "MIC:STOP":
                    with lock:
                        if not recording:
                            captured = []
                            elapsed = 0.0
                        else:
                            recording = False
                            captured = recording_samples[:]
                            recording_samples = []
                            elapsed = time.time() - recording_started_at

                    if not captured:
                        print("[MIC] STOP (no captured audio)")
                        continue

                    print(f"[MIC] STOP after {elapsed:.2f}s, captured {len(captured)} samples")

                    if len(captured) < min_samples:
                        print("[MIC] Too short, skipping transcription.")
                        continue

                    wav_bytes = _int8_samples_to_wav(captured, config.MCU_SAMPLE_RATE)
                    transcription = stt.transcribe_wav(wav_bytes)

                    sensor_json = json.dumps(current_sensors) if current_sensors else None
                    db.insert_snapshot(sensor_json, transcription or None)

                    if transcription:
                        handle_query(transcription)
                    else:
                        print("[MIC] No speech recognised.")
                    continue

                parsed = bridge.parse_sensor_line(line)
                if parsed:
                    key, value = parsed
                    current_sensors[key] = value

            now = time.time()
            if current_sensors and (now - last_snapshot_time) >= config.SENSOR_SNAPSHOT_INTERVAL_S:
                db.insert_snapshot(json.dumps(current_sensors), None)
                last_snapshot_time = now
                context.run_summarization()

            time.sleep(config.SERIAL_POLL_INTERVAL_S)

    except KeyboardInterrupt:
        print("\n[EXIT] Shutting down.")


if __name__ == "__main__":
    main()
