"""
main.py — Main event loop for the ambient AI assistant.

Polls the Arduino serial monitor for sensor data and mic control signals.
On button press: records audio, transcribes, runs LLM, sends emoji to display.
Continuously stores sensor snapshots and runs context summarization.
"""

import json
import time

import config
import db
import stt
import llm
import bridge
import context
import emoji_map


def handle_query(transcription, sensor_data):
    """Process user speech through the full pipeline → emoji on display."""
    print(f'[QUERY] "{transcription}"')

    t0 = time.time()
    messages = context.assemble_prompt(transcription)
    t_ctx = time.time() - t0

    t0 = time.time()
    response = llm.chat(messages)
    t_llm = time.time() - t0

    # Extract the first word from LLM response
    word = response.split()[0] if response.split() else "unknown"
    emoji = emoji_map.word_to_emoji(word)

    print(f"[LLM] {response!r} → word={word!r} → emoji={emoji}")
    print(f"[TIMING] context={t_ctx:.2f}s  llm={t_llm:.1f}s")

    # Send emoji to Arduino display
    bridge.send_emoji(emoji)

    # Store in DB
    snapshot_id = db.get_latest_snapshot_id()
    if snapshot_id:
        db.update_snapshot_response(snapshot_id, f"{word} {emoji}")

    # Clear emoji after timeout
    time.sleep(config.EMOJI_DISPLAY_S)
    bridge.clear_emoji()

    return word, emoji


def main():
    print("=" * 50)
    print("  Ambient AI Assistant")
    print("=" * 50)

    db.init_db()
    print("[INIT] Database ready.")

    reader = bridge.SerialReader()
    print("[INIT] Serial reader ready.")

    # Track sensor state
    current_sensors = {}
    last_snapshot_time = 0
    recording_proc = None

    print("[READY] Listening for Arduino serial data...\n")

    try:
        while True:
            lines = reader.read_lines()

            for line in lines:
                # Parse sensor data
                parsed = bridge.parse_sensor_line(line)
                if parsed:
                    key, value = parsed
                    current_sensors[key] = value
                    continue

                # Mic control signals
                if line == "MIC:START":
                    print("[MIC] Button pressed — recording...")
                    recording_proc = stt.start_recording()
                    continue

                if line == "MIC:STOP" and recording_proc:
                    print("[MIC] Button released — processing...")

                    # Store a snapshot with the current sensor data + transcription
                    transcription = stt.stop_and_transcribe(recording_proc)
                    recording_proc = None

                    sensor_json = json.dumps(current_sensors) if current_sensors else None
                    db.insert_snapshot(sensor_json, transcription or None)

                    if transcription:
                        handle_query(transcription, current_sensors)
                    else:
                        print("[MIC] No speech detected.")
                    continue

            # Periodically store sensor snapshots (even without speech)
            now = time.time()
            if current_sensors and (now - last_snapshot_time) >= config.SENSOR_SNAPSHOT_INTERVAL_S:
                sensor_json = json.dumps(current_sensors)
                db.insert_snapshot(sensor_json, None)
                last_snapshot_time = now

                # Run summarization after storing
                context.run_summarization()

            # Poll interval
            time.sleep(config.SERIAL_POLL_INTERVAL_S)

    except KeyboardInterrupt:
        print("\n[EXIT] Shutting down.")
        if recording_proc:
            recording_proc.terminate()
            recording_proc.wait()


if __name__ == "__main__":
    main()
