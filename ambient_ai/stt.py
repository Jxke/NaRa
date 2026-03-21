"""
stt.py — Speech-to-text module.

Records from USB mic on demand (between MIC:START and MIC:STOP signals),
then transcribes with Whisper.
"""

import io
import subprocess
import wave

from faster_whisper import WhisperModel

import config

_model = None


def _get_model():
    global _model
    if _model is None:
        print("[STT] Loading Whisper model...")
        _model = WhisperModel(
            config.WHISPER_MODEL, device="cpu", compute_type=config.WHISPER_COMPUTE_TYPE
        )
        print("[STT] Model loaded.")
    return _model


def _build_wav(raw_audio):
    """Wrap raw PCM bytes in a WAV container."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(config.SAMPLE_RATE)
        wf.writeframes(raw_audio)
    return buf.getvalue()


def start_recording():
    """Start recording from USB mic. Returns the arecord subprocess."""
    proc = subprocess.Popen(
        [
            "arecord", "-D", config.MIC_DEVICE,
            "-f", "S16_LE", "-r", str(config.SAMPLE_RATE),
            "-c", "1", "-t", "raw", "--buffer-size", "4096",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    print("[STT] Recording started.")
    return proc


def stop_and_transcribe(proc):
    """Stop recording and transcribe the captured audio.

    Args:
        proc: The arecord subprocess from start_recording().

    Returns:
        Transcribed text (str), or empty string if nothing useful.
    """
    proc.terminate()
    raw_audio = proc.stdout.read()
    proc.wait()
    print(f"[STT] Recording stopped. Got {len(raw_audio)} bytes.")

    if len(raw_audio) < config.SAMPLE_RATE * 2 * 0.3:  # less than 0.3s
        print("[STT] Too short, skipping.")
        return ""

    # Cap at MAX_RECORD_S
    max_bytes = config.MAX_RECORD_S * config.SAMPLE_RATE * 2
    if len(raw_audio) > max_bytes:
        raw_audio = raw_audio[:max_bytes]

    wav = _build_wav(raw_audio)
    model = _get_model()
    print("[STT] Transcribing...")
    segments, _ = model.transcribe(
        io.BytesIO(wav),
        language="en",
        beam_size=1,
        vad_filter=False,
        condition_on_previous_text=False,
        no_speech_threshold=1.0,
        temperature=0.6,
    )
    text = " ".join(s.text for s in segments).strip()
    return text


def transcribe_wav(wav_bytes: bytes) -> str:
    """Transcribe WAV bytes directly (used by MCU audio pipeline).

    Args:
        wav_bytes: WAV-formatted audio bytes (PCM_16, 8 kHz, mono).

    Returns:
        Transcribed text string, or empty string if nothing detected.
    """
    import io
    if len(wav_bytes) < 1000:
        return ""

    model = _get_model()
    print("[STT] Transcribing from VAD segment...")

    # Pass 1: force English and disable no-speech suppression.
    segments, _ = model.transcribe(
        io.BytesIO(wav_bytes),
        language="en",
        beam_size=1,
        vad_filter=False,
        condition_on_previous_text=False,
        no_speech_threshold=1.0,
        temperature=0.6,
    )
    text = " ".join(s.text for s in segments).strip()
    if text:
        return text

    # Pass 2 fallback: auto language in case language forcing rejects weak speech.
    segments, _ = model.transcribe(
        io.BytesIO(wav_bytes),
        beam_size=1,
        vad_filter=False,
        condition_on_previous_text=False,
        no_speech_threshold=1.0,
        temperature=0.6,
    )
    text = " ".join(s.text for s in segments).strip()
    return text
