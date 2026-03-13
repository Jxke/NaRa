#!/usr/bin/env python3
"""
Send an emoji to the Arduino UNO Q display via the Router Bridge.

Renders any emoji using Pango + Cairo (Noto Color Emoji font), converts to
40x40 RGB565, and sends to the Arduino via the Router Bridge Unix socket RPC.

Usage:
    python3 send_emoji.py "😊"    # Display an emoji
    python3 send_emoji.py clear   # Clear emoji, return to googly eyes

Requirements (Debian side — already installed):
    python3-gi python3-gi-cairo gir1.2-pango-1.0
    python3-pil python3-msgpack python3-numpy
    fonts-noto-color-emoji
"""

import sys
import socket
import struct
import msgpack
import numpy as np
import cairo
import gi

gi.require_version("Pango", "1.0")
gi.require_version("PangoCairo", "1.0")
from gi.repository import Pango, PangoCairo
from PIL import Image

EMOJI_SIZE  = 40  # Must match EMOJI_SIZE in Eyes.ino
BRIDGE_SOCK = "/var/run/arduino-router.sock"
MSG_ID      = 1


def emoji_to_rgb565(emoji_char, size=EMOJI_SIZE):
    """Render any emoji to a flat bytes object of RGB565 pixels (row-major)."""
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
    ctx     = cairo.Context(surface)

    # White background
    ctx.set_source_rgb(1, 1, 1)
    ctx.paint()

    layout = PangoCairo.create_layout(ctx)
    layout.set_text(emoji_char, -1)
    layout.set_font_description(Pango.FontDescription(f"Noto Color Emoji {int(size * 0.7)}"))

    # Centre glyph
    w, h = layout.get_pixel_size()
    ctx.translate((size - w) / 2, (size - h) / 2)
    PangoCairo.show_layout(ctx, layout)

    # Cairo ARGB32 → PIL RGBA → RGB
    buf  = surface.get_data()
    img  = Image.frombuffer("RGBA", (size, size), bytes(buf), "raw", "BGRA", 0, 1)
    rgb  = np.array(img.convert("RGB"), dtype=np.uint16)

    r      = rgb[:, :, 0] >> 3
    g      = rgb[:, :, 1] >> 2
    b      = rgb[:, :, 2] >> 3
    rgb565 = ((r << 11) | (g << 5) | b).flatten()

    # Big-endian uint16 to match display byte order
    return struct.pack(f">{len(rgb565)}H", *rgb565)


def send_rpc(method, *args):
    """Send a MessagePack-RPC request via the Router Bridge Unix socket."""
    payload = msgpack.packb([0, MSG_ID, method, list(args)], use_bin_type=True)
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.connect(BRIDGE_SOCK)
    sock.settimeout(5)
    try:
        sock.sendall(payload)
        response = sock.recv(4096)
        if response:
            resp = msgpack.unpackb(response, raw=False)
            if resp[0] == 1 and resp[2] is None:
                return True
            print(f"RPC error: {resp[2]}", file=sys.stderr)
            return False
    finally:
        sock.close()
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    arg = sys.argv[1]

    if arg == "clear":
        send_rpc("clear_emoji")
        print("Cleared — googly eyes restored")
    else:
        pixels = emoji_to_rgb565(arg)
        print(f"Rendered {arg} → {len(pixels)} bytes, sending…")
        if send_rpc("show_emoji", pixels):
            print("Done")
