# Ambient AI — Arduino ↔ Linux Communication Schema

## Overview

The Arduino UNO Q has two communication channels between MCU and Linux:

1. **Serial Monitor** — text lines via `Monitor.println()` (MCU) ↔ `mon/read` / `mon/write` RPC (Linux)
2. **Bridge RPC** — binary MessagePack-RPC via `Bridge.call()` / `Bridge.provide()` / `Bridge.notify()`

Both go through the **arduino-router** service (Unix socket at `/var/run/arduino-router.sock`).

---

## Arduino → Linux (Serial Monitor lines)

The Arduino sketch sends data as newline-terminated text lines via `Monitor.println()`.

### Sensor Data

Sent periodically (e.g. every 1–2 seconds):

```
TEMP:22.5
HUM:45.0
```

- `TEMP:` prefix, followed by temperature in Celsius as a float
- `HUM:` prefix, followed by relative humidity as a percentage float
- Each on its own line, terminated with `\r\n`

### Microphone Control Signals

Sent when the user presses/releases the talk button:

```
MIC:START
MIC:STOP
```

- `MIC:START` — user pressed the button, Linux should begin recording from USB mic
- `MIC:STOP` — user released the button, Linux should stop recording and process the audio

---

## Linux → Arduino (Bridge RPC)

Linux sends pixel art to the Arduino display via MessagePack-RPC over the router Unix socket.

### Show Emoji

RPC method: `show_emoji`

```
Argument: bytes — 3200 bytes of RGB565 pixel data (40×40 pixels, 2 bytes each, big-endian)
```

The Linux side:
1. Gets a one-word emotion/concept from the LLM (e.g. "happy", "cold", "curious")
2. Maps it to a Unicode emoji (e.g. 😊, 🥶, 🤔)
3. Renders the emoji to a 40×40 RGB565 bitmap using Pango/Cairo
4. Sends the raw pixel bytes via `show_emoji` RPC

RGB565 format: `(R[4:0] << 11) | (G[5:0] << 5) | B[4:0]`, big-endian uint16 per pixel, row-major order.

### Clear Emoji

RPC method: `clear_emoji`

```
No arguments — clears the emoji and returns to default display (e.g. googly eyes)
```

---

## Protocol Details

### Serial Monitor (text lines)

The Arduino sketch uses:
```cpp
Monitor.begin(115200);
Monitor.println("TEMP:22.5");
Monitor.println("HUM:45.0");
Monitor.println("MIC:START");
Monitor.println("MIC:STOP");
```

Linux reads these via MessagePack-RPC on the router socket:
```python
# MsgPack-RPC request: [type=0, msgid, "mon/read", [max_bytes]]
# Response: [type=1, msgid, error, data_bytes]
```

### Bridge RPC (binary)

The Arduino sketch registers handlers:
```cpp
Bridge.begin();
Bridge.provide("show_emoji", handleShowEmoji);   // receives RGB565 bytes
Bridge.provide("clear_emoji", handleClearEmoji);  // no args
```

Linux calls these via MessagePack-RPC on the router socket:
```python
# MsgPack-RPC request: [type=0, msgid, "show_emoji", [pixel_bytes]]
# Response: [type=1, msgid, error, result]
```

Socket path: `/var/run/arduino-router.sock` (Unix domain socket, SOCK_STREAM)

---

## Sequence Diagram

```
Arduino (MCU)                          Linux
    |                                    |
    |-- Monitor: "TEMP:22.5\r\n" -----→ |  (stored in context DB)
    |-- Monitor: "HUM:45.0\r\n" ------→ |  (stored in context DB)
    |                                    |
    |-- Monitor: "MIC:START\r\n" -----→ |  → start USB mic recording
    |                                    |  (user is speaking...)
    |-- Monitor: "MIC:STOP\r\n" ------→ |  → stop recording
    |                                    |  → Whisper STT
    |                                    |  → assemble context + prompt
    |                                    |  → LLM → one emotion word
    |                                    |  → map word → emoji
    |                                    |  → render emoji → RGB565
    | ←--- RPC: show_emoji(pixels) ---- |
    |  (display emoji on screen)         |
    |                                    |
    |  (after timeout)                   |
    | ←--- RPC: clear_emoji ----------- |
    |  (return to default display)       |
    |                                    |
```

---

## Constants

| Name | Value | Description |
|------|-------|-------------|
| Router socket | `/var/run/arduino-router.sock` | Unix domain socket path |
| Serial baud | 115200 | Monitor serial baud rate |
| Emoji size | 40×40 px | Display pixel dimensions |
| Pixel format | RGB565 big-endian | 2 bytes per pixel |
| Pixel data size | 3200 bytes | 40 × 40 × 2 |
| USB mic sample rate | 16000 Hz | Whisper expects 16kHz mono |
| Mic audio format | S16_LE, mono | 16-bit signed little-endian |
