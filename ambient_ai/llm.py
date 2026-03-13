"""
llm.py — Local LLM inference using llama-cpp-python with a quantized GGUF model.
"""

from llama_cpp import Llama

import config

_model = None


def _get_model():
    global _model
    if _model is None:
        print("[LLM] Loading model...")
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


def generate(prompt, max_tokens=None):
    """Generate a response from the local LLM.

    Args:
        prompt: Full assembled prompt string.
        max_tokens: Max tokens to generate. Defaults to config.LLM_MAX_TOKENS.

    Returns:
        Generated text string.
    """
    if max_tokens is None:
        max_tokens = config.LLM_MAX_TOKENS

    model = _get_model()
    output = model(
        prompt,
        max_tokens=max_tokens,
        stop=["<|endoftext|>", "<|im_end|>"],
        echo=False,
    )
    return output["choices"][0]["text"].strip()


def chat(messages, max_tokens=None):
    """Chat-style generation using the model's chat template.

    Args:
        messages: List of dicts with 'role' and 'content' keys.
        max_tokens: Max tokens to generate.

    Returns:
        Generated text string.
    """
    if max_tokens is None:
        max_tokens = config.LLM_MAX_TOKENS

    model = _get_model()
    output = model.create_chat_completion(
        messages=messages,
        max_tokens=max_tokens,
    )
    return output["choices"][0]["message"]["content"].strip()
