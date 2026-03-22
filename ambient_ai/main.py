"""
main.py -- Ambient AI assistant main loop.

Button-gated audio pipeline:
  D2 press  -> MCU sends MIC:START and streams monitor binary audio frames (int8[128])
  D2 release-> MCU sends MIC:STOP, Linux transcribes captured samples with Whisper,
               runs local LLM, maps to emoji, displays for EMOJI_DISPLAY_S seconds.
"""

import io
import json
import logging
import math
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
from monitor_audio_client import MonitorAudioClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _samples_to_wav(samples, sample_rate):
    """Convert int8/int16 PCM samples to WAV bytes (mono PCM16 LE).

    Applies DC removal and robust p95 normalization so speech remains
    transcribable even when transient spikes are present.
    """
    if not samples:
        return b""

    vals = [int(s) for s in samples]
    peak = max(abs(v) for v in vals)
    is_int8 = peak <= 128

    # Remove capture DC offset before scaling.
    mean = sum(vals) / float(len(vals))
    centered = [v - mean for v in vals]

    # Pre-emphasis: boost high frequencies to restore consonants lost at 8 kHz.
    # y[n] = x[n] - 0.85*x[n-1]; fc ≈ 190 Hz so everything above that gets lifted.
    prev_v = 0.0
    emph = []
    for v in centered:
        emph.append(v - 0.85 * prev_v)
        prev_v = float(v)
    centered = emph

    abs_vals = sorted(abs(int(v)) for v in centered)
    p95 = abs_vals[int(0.95 * (len(abs_vals) - 1))] if abs_vals else 0

    if is_int8:
        target_p95 = 110.0
        gain = min(20.0, (target_p95 / p95)) if p95 > 0 else 1.0
        gate = 1
    else:
        target_p95 = 24000.0
        gain = min(8.0, (target_p95 / p95)) if p95 > 0 else 1.0
        gate = 150

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for s in centered:
            v = int(s * gain)
            if abs(v) <= gate:
                v = 0

            if is_int8:
                if v > 127:
                    v = 127
                elif v < -128:
                    v = -128
                pcm16 = int(v << 8)
            else:
                if v > 32767:
                    v = 32767
                elif v < -32768:
                    v = -32768
                pcm16 = int(v)

            wf.writeframesraw(pcm16.to_bytes(2, "little", signed=True))
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
    mcu_reported_samples = None
    mcu_elapsed_us = None
    mcu_overflow = None

    def on_audio(samples):
        nonlocal recording, recording_samples
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

    mon_audio = MonitorAudioClient(on_audio=on_audio)
    mon_audio.start()
    print(f"[INIT] MonitorAudioClient connecting to {config.MONITOR_HOST}:{config.MONITOR_PORT}...")

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
                        mcu_reported_samples = None
                        mcu_elapsed_us = None
                        mcu_overflow = None
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

                    if mcu_reported_samples and mcu_reported_samples > 0:
                        if len(captured) > mcu_reported_samples:
                            captured = captured[:mcu_reported_samples]
                        elif len(captured) < mcu_reported_samples:
                            print(
                                f"[MIC] Warning: captured {len(captured)} < mcu_reported_samples {mcu_reported_samples}"
                            )

                    print(f"[MIC] STOP after {elapsed:.2f}s, captured {len(captured)} samples")
                    peak = max(abs(int(s)) for s in captured)
                    rms = math.sqrt(sum(int(s) * int(s) for s in captured) / max(1, len(captured)))
                    abs_sorted = sorted(abs(int(s)) for s in captured)
                    p95 = abs_sorted[int(0.95 * (len(abs_sorted) - 1))] if abs_sorted else 0
                    print(f"[MIC] Sample peak={peak} p95={p95} rms={rms:.1f} ({'int8' if peak <= 128 else 'int16'})")
                    if mcu_overflow is not None:
                        print(f"[MIC] Overflow={mcu_overflow}")

                    if len(captured) < min_samples:
                        print("[MIC] Too short, skipping transcription.")
                        continue

                    effective_rate = config.MCU_SAMPLE_RATE
                    rate_source = "nominal"
                    if mcu_reported_samples and mcu_elapsed_us and mcu_elapsed_us > 0:
                        effective_rate = int(round(mcu_reported_samples * 1_000_000.0 / mcu_elapsed_us))
                        effective_rate = max(3000, min(16000, effective_rate))
                        rate_source = "mcu_timing"
                    elif elapsed > 0.20 and len(captured) >= min_samples:
                        effective_rate = int(round(len(captured) / elapsed))
                        effective_rate = max(3000, min(16000, effective_rate))
                        rate_source = "linux_elapsed"

                    print(
                        f"[MIC] Rate nominal={config.MCU_SAMPLE_RATE}Hz effective={effective_rate}Hz "
                        f"(source={rate_source} mcu_samples={mcu_reported_samples} mcu_elapsed_us={mcu_elapsed_us})"
                    )

                    wav_bytes = _samples_to_wav(captured, effective_rate)
                    transcription = stt.transcribe_wav(wav_bytes)

                    sensor_json = json.dumps(current_sensors) if current_sensors else None
                    db.insert_snapshot(sensor_json, transcription or None)

                    if transcription:
                        handle_query(transcription)
                    else:
                        print("[MIC] No speech recognised.")
                    continue

                if line.startswith("MIC:SAMPLES:"):
                    try:
                        mcu_reported_samples = int(line.split(":", 2)[2])
                    except (TypeError, ValueError):
                        mcu_reported_samples = None
                    continue

                if line.startswith("MIC:ELAPSED_US:"):
                    try:
                        mcu_elapsed_us = int(line.split(":", 2)[2])
                    except (TypeError, ValueError):
                        mcu_elapsed_us = None
                    continue

                if line.startswith("MIC:OVERFLOW:"):
                    try:
                        mcu_overflow = int(line.split(":", 2)[2])
                    except (TypeError, ValueError):
                        mcu_overflow = None
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
