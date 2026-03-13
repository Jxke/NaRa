"""
context.py — Context hierarchy assembly and summarization.

Handles compressing snapshots → hourly → daily → weekly summaries,
and assembling the full prompt for query answering.
"""

import json
import time
from datetime import datetime

import config
import db
import llm


def _format_snapshot(row):
    ts = datetime.fromtimestamp(row["timestamp"]).strftime("%H:%M:%S")
    parts = [f"[{ts}]"]

    if row["sensor_data"]:
        try:
            sensors = json.loads(row["sensor_data"])
            parts.append(f"Sensors: {sensors}")
        except json.JSONDecodeError:
            parts.append(f"Sensors: {row['sensor_data']}")

    if row["transcription"]:
        parts.append(f"Said: \"{row['transcription']}\"")

    if row["assistant_response"]:
        parts.append(f"Responded: {row['assistant_response']}")

    return " | ".join(parts)


def _summarize(text, instruction):
    """Use the LLM to compress text into a summary."""
    messages = [
        {"role": "system", "content": instruction},
        {"role": "user", "content": text},
    ]
    return llm.chat(messages, max_tokens=config.LLM_SUMMARIZE_MAX_TOKENS)


def get_temporary_context():
    """Get the most recent snapshots as temporary context."""
    rows = db.get_recent_snapshots(5)
    if not rows:
        return ""
    lines = [_format_snapshot(r) for r in rows]
    return "Recent activity:\n" + "\n".join(lines)


def maybe_summarize_hourly():
    """Check if we have enough snapshots to create an hourly summary."""
    hourly_entries = db.get_recent_hourly(1)
    last_hourly_ts = hourly_entries[0]["timestamp"] if hourly_entries else 0

    snapshots = db.get_snapshots_since(last_hourly_ts)
    if len(snapshots) < config.TEMP_ENTRIES_PER_HOURLY:
        return

    lines = [_format_snapshot(r) for r in snapshots[:config.TEMP_ENTRIES_PER_HOURLY]]
    text = "\n".join(lines)

    summary = _summarize(
        text,
        "Summarize the following hour of sensor readings and interactions "
        "into a concise paragraph. Note any significant events, trends, or anomalies.",
    )
    db.insert_hourly(summary)
    print("[CONTEXT] Created hourly summary.")


def maybe_summarize_daily():
    """Check if we have enough hourly summaries to create a daily summary."""
    daily_entries = db.get_recent_daily(1)
    last_daily_ts = daily_entries[0]["timestamp"] if daily_entries else 0

    hourly_entries = db.get_recent_hourly(config.HOURLY_ENTRIES_PER_DAILY)
    recent = [h for h in hourly_entries if h["timestamp"] > last_daily_ts]

    if len(recent) < config.HOURLY_ENTRIES_PER_DAILY:
        return

    text = "\n\n".join(
        f"Hour {i+1}: {h['summary']}" for i, h in enumerate(recent)
    )

    summary = _summarize(
        text,
        "Summarize the following 24 hourly summaries into a concise daily overview. "
        "Highlight key events, patterns, and anything notable.",
    )
    db.insert_daily(summary)
    print("[CONTEXT] Created daily summary.")


def maybe_summarize_weekly():
    """Check if we have enough daily summaries to create a weekly summary."""
    weekly_entries = db.get_recent_weekly(1)
    last_weekly_ts = weekly_entries[0]["timestamp"] if weekly_entries else 0

    daily_entries = db.get_recent_daily(config.DAILY_ENTRIES_PER_WEEKLY)
    recent = [d for d in daily_entries if d["timestamp"] > last_weekly_ts]

    if len(recent) < config.DAILY_ENTRIES_PER_WEEKLY:
        return

    text = "\n\n".join(
        f"Day {i+1}: {d['summary']}" for i, d in enumerate(recent)
    )

    summary = _summarize(
        text,
        "Summarize the following 7 daily summaries into a concise weekly overview. "
        "Highlight major trends, recurring patterns, and significant events.",
    )
    db.insert_weekly(summary)
    print("[CONTEXT] Created weekly summary.")


def run_summarization():
    """Run all summarization checks."""
    maybe_summarize_hourly()
    maybe_summarize_daily()
    maybe_summarize_weekly()


def assemble_prompt(user_question):
    """Assemble the full prompt for answering a user query.

    Order: system prompt → weekly → daily → hourly → temporary → question.
    """
    parts = []

    # System prompt
    try:
        with open(config.SYSTEM_PROMPT_PATH) as f:
            system_prompt = f.read().strip()
    except FileNotFoundError:
        system_prompt = "Respond with exactly one emotion word."

    # Weekly context
    weekly = db.get_recent_weekly(1)
    if weekly:
        parts.append(f"Weekly overview:\n{weekly[0]['summary']}")

    # Daily context
    daily = db.get_recent_daily(1)
    if daily:
        parts.append(f"Today's overview:\n{daily[0]['summary']}")

    # Hourly context
    hourly = db.get_recent_hourly(1)
    if hourly:
        parts.append(f"This hour:\n{hourly[0]['summary']}")

    # Temporary context
    temp = get_temporary_context()
    if temp:
        parts.append(temp)

    context_block = "\n\n".join(parts)

    messages = [
        {"role": "system", "content": system_prompt},
    ]
    if context_block:
        messages.append({"role": "user", "content": f"Context:\n\n{context_block}"})
        messages.append({"role": "assistant", "content": "Understood."})

    messages.append({"role": "user", "content": user_question})

    return messages
