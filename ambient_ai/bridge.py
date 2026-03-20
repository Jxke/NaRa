"""
bridge.py — Arduino Router Bridge communication.

Reads serial monitor lines from the MCU via TCP port 7500 (monitor proxy)
and sends emoji pixel data back via MessagePack-RPC over the router Unix socket.
"""

import socket
import struct
import threading
import time

import msgpack
import numpy as np
import cairo
import gi

gi.require_version("Pango", "1.0")
gi.require_version("PangoCairo", "1.0")
from gi.repository import Pango, PangoCairo
from PIL import Image

import config

_msg_id_lock = threading.Lock()
_msg_id = 0


def _next_msg_id():
    global _msg_id
    with _msg_id_lock:
        _msg_id += 1
        return _msg_id


def _rpc_call(method, params):
    """Send a single MsgPack-RPC request and return the result."""
    msg_id = _next_msg_id()
    payload = msgpack.packb([0, msg_id, method, params], use_bin_type=True)
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.settimeout(5)
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
                resp = msgpack.unpackb(data, raw=False, max_array_len=2147483647, max_bin_len=2147483647)
                # resp = [1, msg_id, error, result]
                if resp[2] is not None:
                    print(f"[BRIDGE] RPC error on {method}: {resp[2]}")
                    return None
                return resp[3]
            except (msgpack.exceptions.UnpackValueError, ValueError):
                continue  # incomplete message, keep reading
        return None
    except (socket.error, OSError) as e:
        print(f"[BRIDGE] RPC call {method} failed: {e}")
        return None
    finally:
        sock.close()


# --- Serial Monitor Reading via TCP port 7500 ---

MONITOR_HOST = "127.0.0.1"
MONITOR_PORT = 7500
_FRAME_SYNC = b"\x01\x80"
_FRAME_AUDIO_LEN = 128  # bytes per audio frame after the 2-byte sync


class SerialReader:
    """Reads text lines from the Arduino monitor stream on TCP port 7500.

    The stream contains both binary audio frames (0x01 0x80 + 128 bytes)
    and text lines (TEMP:, HUM:, MIC:START, MIC:STOP). We parse out the
    text lines and discard the binary audio data.
    """

    def __init__(self):
        self._sock = None
        self._buf = b""
        self._connect()

    def _connect(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)
            s.connect((MONITOR_HOST, MONITOR_PORT))
            s.setblocking(False)
            self._sock = s
            print(f"[BRIDGE] Connected to monitor on {MONITOR_HOST}:{MONITOR_PORT}")
        except OSError as e:
            print(f"[BRIDGE] Monitor connect failed: {e}")
            self._sock = None

    def _recv(self):
        if self._sock is None:
            self._connect()
            return
        try:
            chunk = self._sock.recv(4096)
            if chunk:
                self._buf += chunk
        except BlockingIOError:
            pass
        except OSError:
            self._sock.close()
            self._sock = None

    def _skip_audio_frames(self):
        """Remove any leading binary audio frames from the buffer."""
        total = 2 + _FRAME_AUDIO_LEN
        while len(self._buf) >= 2 and self._buf[:2] == _FRAME_SYNC:
            if len(self._buf) < total:
                break  # wait for full frame
            self._buf = self._buf[total:]

    def read_lines(self):
        """Return any complete text lines received since last call."""
        self._recv()
        self._skip_audio_frames()
        lines = []
        sep = b"\n"
        while sep in self._buf:
            self._skip_audio_frames()
            if sep not in self._buf:
                break
            line, self._buf = self._buf.split(sep, 1)
            text = line.decode("utf-8", errors="replace").strip()
            if text:
                lines.append(text)
        return lines


def parse_sensor_line(line):
    """Parse a TEMP: or HUM: line. Returns (key, value) or None."""
    if line.startswith("TEMP:"):
        try:
            return ("temperature", float(line[5:]))
        except ValueError:
            return None
    elif line.startswith("HUM:"):
        try:
            return ("humidity", float(line[4:]))
        except ValueError:
            return None
    return None


# --- Emoji Rendering & Sending ---

def emoji_to_rgb565(emoji_char):
    """Render an emoji to 40x40 RGB565 big-endian bytes."""
    size = config.EMOJI_SIZE
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
    ctx = cairo.Context(surface)

    ctx.set_source_rgb(1, 1, 1)
    ctx.paint()

    layout = PangoCairo.create_layout(ctx)
    layout.set_text(emoji_char, -1)
    layout.set_font_description(Pango.FontDescription(f"Noto Color Emoji {int(size * 0.7)}"))

    w, h = layout.get_pixel_size()
    ctx.translate((size - w) / 2, (size - h) / 2)
    PangoCairo.show_layout(ctx, layout)

    buf = surface.get_data()
    img = Image.frombuffer("RGBA", (size, size), bytes(buf), "raw", "BGRA", 0, 1)
    rgb = np.array(img.convert("RGB"), dtype=np.uint16)

    r = rgb[:, :, 0] >> 3
    g = rgb[:, :, 1] >> 2
    b = rgb[:, :, 2] >> 3
    rgb565 = ((r << 11) | (g << 5) | b).flatten()

    return struct.pack(f">{len(rgb565)}H", *rgb565)


# Emoji → sentiment code mapping for Monitor text command
_HAPPY_EMOJIS = set('😀😃😄😁😆😊🙂😎🥳🤩😍🥰😇🤗😂🤣')
_SAD_EMOJIS   = set('😢😭😞😔😟😕🙁☹️😣😖😫😩😰😨😥😓')

def _emoji_to_sentiment(emoji_char):
    """Return H (happy), S (sad), or N (neutral) for a given emoji."""
    if emoji_char in _HAPPY_EMOJIS:
        return 'H'
    if emoji_char in _SAD_EMOJIS:
        return 'S'
    return 'N'

def send_emoji(emoji_char):
    """Send an emoji sentiment command to the Arduino display via Monitor."""
    code = _emoji_to_sentiment(emoji_char)
    write_monitor(f'EMOJI:{code}')
    print(f'[BRIDGE] Sent emoji {emoji_char} → EMOJI:{code}')
    return True


def clear_emoji():
    """Clear the emoji display (return to googly eyes)."""
    write_monitor('CLEAR')
    print('[BRIDGE] Cleared emoji')


def write_monitor(text):
    """Write a string to the serial monitor (Linux → Arduino)."""
    data = (text + "\r\n").encode()
    _rpc_call("mon/write", [data])
