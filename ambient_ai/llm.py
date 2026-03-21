"""
llm.py - Local LLM inference with llama-cpp-python.

If llama_cpp or the model file is unavailable, falls back to a lightweight
keyword-based mapper so the pipeline still runs instead of crashing.
"""

import os
import re

import config

try:
    from llama_cpp import Llama
except ImportError:
    Llama = None

_model = None


def _model_available() -> bool:
    return Llama is not None and os.path.exists(config.LLM_MODEL_PATH)


def _get_model():
    global _model
    if not _model_available():
        raise RuntimeError("llama_cpp unavailable or model path missing")
    if _model is None:
        print(f"[LLM] Loading model from {config.LLM_MODEL_PATH} ...")
        _model = Llama(
            model_path=config.LLM_MODEL_PATH,
            n_ctx=config.LLM_CONTEXT_LENGTH,
            n_threads=config.LLM_THREADS,
            n_gpu_layers=config.LLM_GPU_LAYERS,
            verbose=False,
        )
        print("[LLM] Model loaded.")
    return _model


def unload_model():
    global _model
    _model = None


def _flatten_messages(messages) -> str:
    chunks = []
    for msg in messages or []:
        if isinstance(msg, dict):
            chunks.append(str(msg.get("content", "")))
        else:
            chunks.append(str(msg))
    return "\n".join(chunks).lower()


def _heuristic_word(messages) -> str:
    text = _flatten_messages(messages)

    # Sensor hints
    m_temp = re.search(r"temperature[^0-9-]*(-?\d+(?:\.\d+)?)", text)
    if m_temp:
        try:
            t = float(m_temp.group(1))
            if t >= 30.0:
                return "hot"
            if t <= 15.0:
                return "cold"
        except ValueError:
            pass

    m_hum = re.search(r"humidity[^0-9-]*(-?\d+(?:\.\d+)?)", text)
    if m_hum:
        try:
            h = float(m_hum.group(1))
            if h >= 70.0:
                return "humid"
        except ValueError:
            pass

    # Transcript hints
    rules = [
        ("happy glad great awesome excited", "happy"),
        ("sad upset down depressed", "sad"),
        ("angry mad annoyed", "angry"),
        ("tired sleepy exhausted", "tired"),
        ("love heart", "love"),
        ("joke funny laugh", "laugh"),
        ("wow amazing surprised", "wow"),
        ("confused unsure", "confused"),
        ("cold freezing chilly", "cold"),
        ("hot warm burning", "hot"),
    ]
    for words, out in rules:
        if any(w in text for w in words.split()):
            return out

    return "ok"


def generate(prompt, max_tokens=None):
    """Generate text from a plain prompt string."""
    if max_tokens is None:
        max_tokens = config.LLM_MAX_TOKENS

    if not _model_available():
        print("[LLM] Falling back to heuristic mode (generate).")
        return _heuristic_word([{"role": "user", "content": prompt}])

    model = _get_model()
    output = model(
        prompt,
        max_tokens=max_tokens,
        stop=["<|endoftext|>", "<|im_end|>"],
        echo=False,
    )
    return output["choices"][0]["text"].strip()


def chat(messages, max_tokens=None):
    """Chat-style generation from role/content messages."""
    if max_tokens is None:
        max_tokens = config.LLM_MAX_TOKENS

    if not _model_available():
        print("[LLM] Falling back to heuristic mode (chat).")
        return _heuristic_word(messages)

    model = _get_model()
    output = model.create_chat_completion(
        messages=messages,
        max_tokens=max_tokens,
    )
    return output["choices"][0]["message"]["content"].strip()
