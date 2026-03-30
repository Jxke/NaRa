"""
button_capture_test.py -- one-shot button capture diagnostic for MCU mic audio.

Flow:
  1) Read monitor bytes from arduino-router TCP monitor proxy (127.0.0.1:7500).
  2) Parse text lines and binary audio frames (0x01 0x80 + 128 int8 samples).
  3) Save raw + normalized WAV files in ambient_ai/diagnostics.
  4) Run Whisper on normalized WAV and save transcript in metadata.
"""

from __future__ import annotations

import io
import json
import math
import socket
import time
import wave
from datetime import datetime
from pathlib import Path

import config
import msgpack


FRAME_SYNC = bytes([0x01, 0x80])
FRAME_AUDIO = 128  # int8 samples

_MSG_ID = 0


def _next_msg_id() -> int:
    global _MSG_ID
    _MSG_ID += 1
    return _MSG_ID


def _rpc_call(method: str, params: list):
    """Call Arduino router MsgPack-RPC over Unix socket."""
    msg_id = _next_msg_id()
    payload = msgpack.packb([0, msg_id, method, params], use_bin_type=True)
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.settimeout(2)
    try:
        sock.connect(config.ROUTER_SOCKET_PATH)
        sock.sendall(payload)
        data = b""
        while True:
            chunk = sock.recv(8192)
            if not chunk:
                break
            data += chunk
            try:
                # response format: [1, msg_id, error, result]
                resp = msgpack.unpackb(
                    data,
                    raw=False,
                    max_array_len=2_147_483_647,
                    max_bin_len=2_147_483_647,
                )
                if resp[2] is not None:
                    return None, resp[2]
                return resp[3], None
            except (msgpack.exceptions.UnpackValueError, ValueError):
                continue
        return None, "empty response"
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)
    finally:
        sock.close()


def _clamp(v: int, lo: int, hi: int) -> int:
    if v < lo:
        return lo
    if v > hi:
        return hi
    return v


def _samples_to_raw_wav(samples: list[int], sample_rate: int) -> bytes:
    if not samples:
        return b""
    vals = [int(s) for s in samples]
    peak = max(abs(v) for v in vals)
    is_int8 = peak <= 128

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for s in vals:
            if is_int8:
                s = _clamp(s, -128, 127)
                pcm16 = int(s << 8)
            else:
                pcm16 = _clamp(s, -32768, 32767)
            wf.writeframesraw(int(pcm16).to_bytes(2, "little", signed=True))
    return buf.getvalue()


def _samples_to_normalized_wav(samples: list[int], sample_rate: int) -> tuple[bytes, float]:
    if not samples:
        return b"", 1.0

    vals = [int(s) for s in samples]
    peak = max(abs(v) for v in vals)
    is_int8 = peak <= 128

    mean = sum(vals) / float(len(vals))
    centered = [v - mean for v in vals]

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
                v = _clamp(v, -128, 127)
                pcm16 = int(v << 8)
            else:
                pcm16 = _clamp(v, -32768, 32767)
            wf.writeframesraw(int(pcm16).to_bytes(2, "little", signed=True))
    return buf.getvalue(), gain


def _estimate_rate(
    captured_samples: int,
    elapsed_s: float,
    mcu_reported_samples: int | None,
    mcu_elapsed_us: int | None,
) -> tuple[int, str]:
    effective_rate = config.MCU_SAMPLE_RATE
    source = "nominal"
    if mcu_reported_samples and mcu_elapsed_us and mcu_elapsed_us > 0:
        effective_rate = int(round(mcu_reported_samples * 1_000_000.0 / mcu_elapsed_us))
        effective_rate = max(3000, min(16000, effective_rate))
        source = "mcu_timing"
    elif elapsed_s > 0.20 and captured_samples > int(0.30 * config.MCU_SAMPLE_RATE):
        effective_rate = int(round(captured_samples / elapsed_s))
        effective_rate = max(3000, min(16000, effective_rate))
        source = "linux_elapsed"
    return effective_rate, source


def _extract_text_and_audio(buf: bytearray) -> tuple[list[str], list[int]]:
    """Parse mixed monitor stream payload."""
    lines: list[str] = []
    audio_samples: list[int] = []

    while True:
        idx = buf.find(FRAME_SYNC)
        if idx == -1:
            nl = buf.find(b"\n")
            if nl == -1:
                break
            line = bytes(buf[:nl]).decode("utf-8", errors="replace").strip()
            del buf[: nl + 1]
            if line:
                lines.append(line)
            continue

        if idx > 0:
            text_part = bytes(buf[:idx])
            del buf[:idx]
            for raw in text_part.split(b"\n"):
                line = raw.decode("utf-8", errors="replace").strip()
                if line:
                    lines.append(line)
            continue

        needed = len(FRAME_SYNC) + FRAME_AUDIO
        if len(buf) < needed:
            break
        raw = buf[len(FRAME_SYNC):needed]
        del buf[:needed]
        audio_samples.extend((b if b < 128 else b - 256) for b in raw)

    return lines, audio_samples


def run_once() -> int:
    stt_module = None
    stt_import_error = None
    try:
        import stt as stt_module  # lazy import for clearer startup errors
    except Exception as exc:  # noqa: BLE001
        stt_import_error = str(exc)

    diag_dir = Path(config.BASE_DIR) / "diagnostics"
    diag_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 58)
    print(" INMP441 Button Capture Test (router mon/read, single capture)")
    print("=" * 58)
    print("[INIT] Press and hold button on D3, speak, then release.\n")

    recording = False
    recording_started_at = 0.0
    recording_samples: list[int] = []
    max_samples = int(config.MAX_RECORD_S * config.MCU_SAMPLE_RATE)

    mcu_reported_samples: int | None = None
    mcu_elapsed_us: int | None = None
    mcu_overflow: int | None = None
    mcu_read_err: int | None = None

    parse_buf = bytearray()

    print(f"[INIT] Connecting monitor stream on {config.MONITOR_HOST}:{config.MONITOR_PORT}...")
    mon = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    mon.settimeout(2.0)
    mon.connect((config.MONITOR_HOST, config.MONITOR_PORT))
    mon.settimeout(0.2)
    print("[INIT] Monitor stream connected.")

    while True:
        try:
            chunk = mon.recv(4096)
            if not chunk:
                print("[MON] stream closed, reconnecting...")
                mon.close()
                mon = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                mon.settimeout(2.0)
                mon.connect((config.MONITOR_HOST, config.MONITOR_PORT))
                mon.settimeout(0.2)
                continue
        except socket.timeout:
            chunk = b""
        except OSError as exc:
            print(f"[MON] recv error: {exc}; reconnecting...")
            time.sleep(0.2)
            try:
                mon.close()
            except Exception:
                pass
            mon = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            mon.settimeout(2.0)
            mon.connect((config.MONITOR_HOST, config.MONITOR_PORT))
            mon.settimeout(0.2)
            continue

        if chunk:
            parse_buf.extend(chunk)
            lines, audio = _extract_text_and_audio(parse_buf)
        else:
            lines, audio = [], []

        if recording and audio:
            remaining = max_samples - len(recording_samples)
            if remaining > 0:
                if len(audio) <= remaining:
                    recording_samples.extend(audio)
                else:
                    recording_samples.extend(audio[:remaining])

        for line in lines:
            if line == "MIC:START":
                recording = True
                recording_started_at = time.time()
                recording_samples = []
                mcu_reported_samples = None
                mcu_elapsed_us = None
                mcu_overflow = None
                mcu_read_err = None
                print("[MIC] START")
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

            if line.startswith("MIC:READ_ERR:"):
                try:
                    mcu_read_err = int(line.split(":", 2)[2])
                except (TypeError, ValueError):
                    mcu_read_err = None
                continue

            if line == "MIC:STOP":
                if not recording and not recording_samples:
                    print("[MIC] STOP (no active recording)")
                    continue
                recording = False
                elapsed_s = time.time() - recording_started_at
                captured = recording_samples[:]
                recording_samples = []

                silent_fallback = False
                if not captured:
                    # Preserve diagnostics even when MCU emitted no audio frames.
                    fallback_s = (mcu_elapsed_us / 1_000_000.0) if (mcu_elapsed_us and mcu_elapsed_us > 0) else 1.0
                    fallback_n = max(1, int(round(config.MCU_SAMPLE_RATE * fallback_s)))
                    captured = [0] * fallback_n
                    silent_fallback = True

                if mcu_reported_samples and mcu_reported_samples > 0:
                    captured = captured[:mcu_reported_samples]

                peak = max(abs(int(s)) for s in captured)
                rms = math.sqrt(sum(int(s) * int(s) for s in captured) / max(1, len(captured)))
                abs_sorted = sorted(abs(int(s)) for s in captured)
                p95 = abs_sorted[int(0.95 * (len(abs_sorted) - 1))] if abs_sorted else 0
                clip_pct_int8 = 0.0
                if peak <= 128 and captured:
                    clipped = sum(1 for s in captured if abs(int(s)) >= 127)
                    clip_pct_int8 = 100.0 * clipped / float(len(captured))

                effective_rate, rate_source = _estimate_rate(
                    len(captured), elapsed_s, mcu_reported_samples, mcu_elapsed_us
                )

                raw_wav = _samples_to_raw_wav(captured, effective_rate)
                norm_wav, norm_gain = _samples_to_normalized_wav(captured, effective_rate)
                if stt_module is not None:
                    whisper_text = stt_module.transcribe_wav(norm_wav)
                else:
                    whisper_text = ""

                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                stem = f"button_capture_{ts}"
                raw_name = f"{stem}_raw.wav"
                norm_name = f"{stem}_norm.wav"
                meta_name = f"{stem}_meta.json"

                raw_path = diag_dir / raw_name
                norm_path = diag_dir / norm_name
                meta_path = diag_dir / meta_name

                raw_path.write_bytes(raw_wav)
                norm_path.write_bytes(norm_wav)

                meta = {
                    "sample_rate": effective_rate,
                    "nominal_rate": config.MCU_SAMPLE_RATE,
                    "sample_rate_source": rate_source,
                    "samples": len(captured),
                    "duration_s": (len(captured) / float(effective_rate)) if effective_rate > 0 else 0.0,
                    "capture_window_s": elapsed_s,
                    "mcu_reported_samples": mcu_reported_samples,
                    "mcu_elapsed_us": mcu_elapsed_us,
                    "mcu_overflow": mcu_overflow,
                    "mcu_read_err": mcu_read_err,
                    "peak": peak,
                    "p95": p95,
                    "rms": rms,
                    "clip_pct_int8": clip_pct_int8,
                    "normalization_gain": norm_gain,
                    "silent_fallback": silent_fallback,
                    "raw_wav": str(Path("diagnostics") / raw_name),
                    "normalized_wav": str(Path("diagnostics") / norm_name),
                    "whisper_text": whisper_text,
                }
                meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

                print(f"[MIC] STOP after {elapsed_s:.2f}s, captured {len(captured)} samples")
                print(
                    f"[MIC] Rate nominal={config.MCU_SAMPLE_RATE}Hz effective={effective_rate}Hz "
                    f"(source={rate_source} mcu_samples={mcu_reported_samples} mcu_elapsed_us={mcu_elapsed_us})"
                )
                print(f"[MIC] peak={peak} p95={p95} rms={rms:.1f} clip%={clip_pct_int8:.2f}")
                print(f"[SAVE] Raw WAV:  {raw_path}")
                print(f"[SAVE] Norm WAV: {norm_path}")
                print(f"[SAVE] Meta:     {meta_path}")
                if silent_fallback:
                    print("[MIC] NOTE: Saved silent fallback WAV (no MCU audio frames)")
                print(f"[WHISPER] {whisper_text!r}")
                if stt_module is None:
                    print(f"[WHISPER] skipped: import failed ({stt_import_error})")
                return 0

        time.sleep(config.SERIAL_POLL_INTERVAL_S)


if __name__ == "__main__":
    try:
        raise SystemExit(run_once())
    except KeyboardInterrupt:
        print("\n[EXIT] Cancelled.")
        raise SystemExit(130)
