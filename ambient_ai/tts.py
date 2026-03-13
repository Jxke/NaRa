"""
tts.py — Text-to-speech output via espeak-ng or Piper.
"""

import subprocess

import config


def speak(text):
    """Speak text aloud through the USB speaker."""
    if not text:
        return

    if config.TTS_ENGINE == "piper":
        _speak_piper(text)
    else:
        _speak_espeak(text)


def _speak_espeak(text):
    try:
        subprocess.run(
            ["espeak-ng", "--stdout", text],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=True,
        )
        # Pipe through aplay to use the configured speaker
        proc_espeak = subprocess.Popen(
            ["espeak-ng", "--stdout", text],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
        subprocess.run(
            ["aplay", "-D", config.SPEAKER_DEVICE],
            stdin=proc_espeak.stdout,
            stderr=subprocess.DEVNULL,
        )
        proc_espeak.wait()
    except FileNotFoundError:
        print("[TTS] espeak-ng not found. Install with: sudo apt install espeak-ng")


def _speak_piper(text):
    try:
        proc_piper = subprocess.Popen(
            [
                "piper",
                "--model", config.PIPER_MODEL_PATH,
                "--output-raw",
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
        proc_aplay = subprocess.Popen(
            [
                "aplay", "-D", config.SPEAKER_DEVICE,
                "-f", "S16_LE", "-r", "22050", "-c", "1",
            ],
            stdin=proc_piper.stdout,
            stderr=subprocess.DEVNULL,
        )
        proc_piper.stdin.write(text.encode())
        proc_piper.stdin.close()
        proc_aplay.wait()
        proc_piper.wait()
    except FileNotFoundError:
        print("[TTS] piper not found.")
