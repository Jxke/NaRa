"""arduino_client.py — connects to bridge_shim Unix socket and feeds audio to VADBatcher."""

import logging
import socket
import threading
import time

import msgpack

DEFAULT_SOCK = '/home/arduino/ArduinoApps/bridge-shim/audio.sock'


class ArduinoClient:
    """Receives MsgPack-RPC notifications from bridge_shim Unix socket."""

    RECONNECT_DELAY = 3

    def __init__(self, sock_path: str = DEFAULT_SOCK, on_message=None):
        self.sock_path = sock_path
        self._on_message = on_message
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self):
        self._thread.start()

    def _connect(self) -> socket.socket:
        while True:
            try:
                conn = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                conn.connect(self.sock_path)
                logging.info(f'[ArduinoClient] connected to {self.sock_path}')
                return conn
            except OSError as e:
                logging.warning(f'[ArduinoClient] bridge_shim not available ({e}), '
                                f'retrying in {self.RECONNECT_DELAY}s')
                time.sleep(self.RECONNECT_DELAY)

    def _handle(self, conn: socket.socket):
        unpacker = msgpack.Unpacker(raw=False)
        try:
            while True:
                data = conn.recv(4096)
                if not data:
                    break
                unpacker.feed(data)
                for msg in unpacker:
                    self._process(msg)
        except OSError as e:
            logging.warning(f'[ArduinoClient] connection lost: {e}')
        finally:
            conn.close()

    def _process(self, msg):
        if not isinstance(msg, (list, tuple)) or len(msg) < 3 or msg[0] != 2:
            return
        topic, payload = msg[1], msg[2]
        if topic == 'audio' and self._on_message:
            self._on_message('audio', {'samples': payload})

    def _run(self):
        while True:
            conn = self._connect()
            self._handle(conn)
            logging.info(f'[ArduinoClient] reconnecting in {self.RECONNECT_DELAY}s')
            time.sleep(self.RECONNECT_DELAY)
