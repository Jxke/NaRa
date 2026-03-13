"""
emoji_map.py — Maps LLM emotion words to Unicode emoji characters.
"""

WORD_TO_EMOJI = {
    # Positive
    "happy": "😊",
    "joy": "😄",
    "love": "❤️",
    "laugh": "😂",
    "smile": "😊",
    "excited": "🤩",
    "cool": "😎",
    "party": "🥳",
    "peace": "✌️",
    "thumbsup": "👍",
    "star": "⭐",
    "fire": "🔥",
    "sparkle": "✨",
    "sun": "☀️",
    "rainbow": "🌈",
    "clap": "👏",
    "hug": "🤗",
    "wink": "😉",
    "grateful": "🙏",
    "proud": "😤",
    # Negative
    "sad": "😢",
    "cry": "😭",
    "angry": "😠",
    "fear": "😨",
    "scared": "😱",
    "sick": "🤒",
    "tired": "😴",
    "bored": "😑",
    "confused": "😕",
    "worried": "😟",
    "disappointed": "😞",
    "frustrated": "😤",
    # Weather / environment
    "hot": "🥵",
    "cold": "🥶",
    "warm": "😌",
    "rain": "🌧️",
    "snow": "❄️",
    "wind": "💨",
    "cloud": "☁️",
    "humid": "💧",
    "dry": "🏜️",
    # Neutral / other
    "think": "🤔",
    "curious": "🧐",
    "surprised": "😮",
    "wow": "😲",
    "ok": "👌",
    "yes": "✅",
    "no": "❌",
    "wave": "👋",
    "sleep": "😴",
    "eat": "🍽️",
    "drink": "🥤",
    "music": "🎵",
    "question": "❓",
    "idea": "💡",
    "heart": "💖",
    "robot": "🤖",
    "unknown": "🤷",
}

# Also accept emoji directly from LLM
_ALL_EMOJI_CHARS = set(WORD_TO_EMOJI.values())


def word_to_emoji(word):
    """Convert an LLM output word to an emoji character.

    Accepts either a known word (e.g. "happy") or an emoji character directly.
    Falls back to 🤷 if unrecognized.
    """
    word = word.strip().lower().rstrip(".,!?")

    # If the LLM returned an emoji directly
    if any(ord(c) > 0x1F00 for c in word):
        return word

    return WORD_TO_EMOJI.get(word, "🤷")
