"""
main.py — Ambient AI assistant main loop.

Audio pipeline:
  MCU (analog mic → Bridge.notify("audio"))
    → bridge_shim (arduino app, TCP :7000)
    → ArduinoClient (this process)
    → VADBatcher (VAD-gated speech segmentation)
    → Whisper STT
    → Local LLM
    → emoji sent back to MCU display

Sensor data from Bridge serial monitor is still read via mon/read RPC.
"""

import json
import logging
import time

import config
import db
import stt
import llm
import bridge
import context
import emoji_map
from arduino_client import ArduinoClient
from vad_batcher import VADBatcher

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(message)s")


def handle_query(transcription, sensor_data):
    """Run full pipeline: transcription → LLM → emoji on display."""
    print(f'[QUERY] "{transcription}"')

    t0 = time.time()
    messages = context.assemble_prompt(transcription)
    t_ctx = time.time() - t0

    t0 = time.time()
    response = llm.chat(messages)
    t_llm = time.time() - t0

    word  = response.split()[0] if response.split() else "unknown"
    emoji = emoji_map.word_to_emoji(word)

    print(f"[LLM] {response!r} → word={word!r} → emoji={emoji}")
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
    print("  Ambient AI Assistant (MCU mic pipeline)")
    print("=" * 50)

    db.init_db()
    print("[INIT] Database ready.")

    # Serial monitor for sensor data
    reader = bridge.SerialReader()
    print("[INIT] Serial reader ready.")

    # VAD audio pipeline
    vad = VADBatcher()

    def on_audio(topic, data):
        if topic == "audio":
            vad.feed(data.get("samples", []))

    arduino = ArduinoClient(
        on_message=on_audio,
    )
    arduino.start()
    print(f"[INIT] ArduinoClient connecting to {config.BRIDGE_HOST}:{config.BRIDGE_PORT}...")

    current_sensors = {}
    last_snapshot_time = 0

    print("[READY] Listening for speech...\n")

    try:
        while True:
            # Read sensor data from serial monitor
            for line in reader.read_lines():
                parsed = bridge.parse_sensor_line(line)
                if parsed:
                    key, value = parsed
                    current_sensors[key] = value

            # Check for completed speech segment
            segment = vad.get_segment()
            if segment:
                normalized_wav, _ = segment
                print("[MIC] Speech detected — transcribing...")

                transcription = stt.transcribe_wav(normalized_wav)

                sensor_json = json.dumps(current_sensors) if current_sensors else None
                db.insert_snapshot(sensor_json, transcription or None)

                if transcription:
                    handle_query(transcription, current_sensors)
                else:
                    print("[MIC] No speech recognised.")

            # Periodic sensor snapshots
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
