"""
config.py ? Central configuration for the ambient AI assistant.
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Database ---
DB_PATH = os.path.join(BASE_DIR, "assistant.db")

# --- System Prompt ---
SYSTEM_PROMPT_PATH = os.path.join(BASE_DIR, "system_prompt.txt")

# --- Audio / STT ---
MIC_DEVICE = "plughw:0,0"
SAMPLE_RATE = 16000
MCU_SAMPLE_RATE = 8000
WHISPER_MODEL = "tiny"
WHISPER_COMPUTE_TYPE = "int8"
MAX_RECORD_S = 15  # max seconds per button press
MIN_BUTTON_RECORD_S = 0.30

# --- Local LLM ---
# Prefer model in this repo; fall back to /home/arduino/ambient_ai if present.
_DEFAULT_LLM = os.path.join(BASE_DIR, "models", "llm", "qwen2-0_5b-instruct-q4_k_m.gguf")
_FALLBACK_LLM = os.path.expanduser("~/ambient_ai/models/llm/qwen2-0_5b-instruct-q4_k_m.gguf")

LLM_MODEL_PATH = os.environ.get(
    "ROCK_LLM_MODEL_PATH",
    _DEFAULT_LLM if os.path.exists(_DEFAULT_LLM) else _FALLBACK_LLM,
)

LLM_CONTEXT_LENGTH = 512
LLM_MAX_TOKENS = 10  # only need one word/emoji
LLM_THREADS = 4
LLM_GPU_LAYERS = 0  # CPU only

# --- Context Hierarchy ---
SENSOR_SNAPSHOT_INTERVAL_S = 30  # store a sensor snapshot every 30s
TEMP_ENTRIES_PER_HOURLY = 120    # 120 * 30s = 1 hour
HOURLY_ENTRIES_PER_DAILY = 24
DAILY_ENTRIES_PER_WEEKLY = 7
LLM_SUMMARIZE_MAX_TOKENS = 256  # more tokens for summaries

# --- Router Bridge ---
ROUTER_SOCKET_PATH = "/var/run/arduino-router.sock"
SERIAL_POLL_INTERVAL_S = 0.05  # 50ms poll rate for mon/read

# --- Monitor TCP stream (serial monitor proxy) ---
MONITOR_HOST = "127.0.0.1"
MONITOR_PORT = 7500

# --- Emoji ---
EMOJI_SIZE = 40  # 40x40 px display
EMOJI_DISPLAY_S = 10  # seconds to show emoji before clearing

# --- Bridge shim (audio relay) ---
BRIDGE_HOST = "127.0.0.1"
BRIDGE_PORT = 7000
