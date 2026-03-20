#!/usr/bin/env python3
"""Bridge shim — forwards Bridge.notify("audio") events to a Unix socket.

Runs as an arduino app. The ambient_ai pipeline connects to the Unix socket
at /app/audio.sock (which maps to /home/arduino/ArduinoApps/bridge-shim/audio.sock
on the host) and receives MsgPack-RPC notifications:

  [2, "audio", [0, -3, 5, ...]]  — signed 8-bit PCM samples @ 8000 Hz
"""

import os
import socket
import threading

import msgpack
from arduino.app_utils import App, Bridge

SOCK_PATH = os.environ.get("BRIDGE_SOCK", "/app/audio.sock")

_clients = []
_lock = threading.Lock()


def _broadcast(topic: str, payload):
    msg = msgpack.packb([2, topic, payload])
    with _lock:
        dead = []
        for client in _clients:
            try:
                client.sendall(msg)
            except OSError:
                dead.append(client)
        for c in dead:
            _clients.remove(c)
            try:
                c.close()
            except Exception:
                pass


def _on_audio(samples):
    _broadcast("audio", samples)


Bridge.provide("audio", _on_audio)


def _serve():
    if os.path.exists(SOCK_PATH):
        os.unlink(SOCK_PATH)
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    server.bind(SOCK_PATH)
    os.chmod(SOCK_PATH, 0o666)
    server.listen(5)
    print(f"[bridge_shim] listening on {SOCK_PATH}", flush=True)
    while True:
        try:
            client, _ = server.accept()
            print("[bridge_shim] pipeline connected", flush=True)
            with _lock:
                _clients.append(client)
        except Exception as e:
            print(f"[bridge_shim] accept error: {e}", flush=True)


threading.Thread(target=_serve, daemon=True).start()
App.run()
