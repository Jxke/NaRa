"""monitor_audio_client.py -- reads binary audio frames and text from monitor proxy.

The MCU sketch sends frames via Monitor.write():
  Frame = 0x01 0x80 + 128 signed int8 samples @ 8 kHz

Text lines (TEMP:, HUM:, MIC:START, MIC:STOP) are on the same stream.
Both are demultiplexed and delivered via callbacks.
"""

import logging
import socket
import threading
import time

import config

FRAME_SYNC = bytes([0x01, 0x80])
FRAME_AUDIO = 128  # samples per frame


class MonitorAudioClient:
    """Thread-safe client for arduino-router monitor proxy on port 7500."""

    RECONNECT_DELAY = 2

    def __init__(self, on_audio=None, on_text=None):
        self._on_audio = on_audio
        self._on_text = on_text
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self):
        self._thread.start()

    def _connect(self):
        while True:
            try:
                conn = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                conn.connect((config.MONITOR_HOST, config.MONITOR_PORT))
                logging.info("[MonitorAudio] connected to monitor proxy")
                return conn
            except OSError as e:
                logging.warning(f"[MonitorAudio] not available ({e}), retrying...")
                time.sleep(self.RECONNECT_DELAY)

    def _handle(self, conn):
        buf = b""
        pkt_count = 0
        try:
            while True:
                chunk = conn.recv(4096)
                if not chunk:
                    break
                buf += chunk

                while True:
                    idx = buf.find(FRAME_SYNC)

                    if idx == -1:
                        if b"\n" in buf:
                            line, buf = buf.split(b"\n", 1)
                            self._emit_text(line)
                        else:
                            break
                    elif idx > 0:
                        text_part = buf[:idx]
                        buf = buf[idx:]
                        for line in text_part.split(b"\n"):
                            if line.strip():
                                self._emit_text(line)
                    else:
                        needed = len(FRAME_SYNC) + FRAME_AUDIO
                        if len(buf) < needed:
                            break

                        raw = list(buf[len(FRAME_SYNC):needed])
                        samples = [b if b < 128 else b - 256 for b in raw]
                        buf = buf[needed:]

                        pkt_count += 1
                        if pkt_count % 500 == 1:
                            logging.debug(f"[MonitorAudio] packet #{pkt_count}")
                        if self._on_audio:
                            self._on_audio(samples)
        except OSError as e:
            logging.warning(f"[MonitorAudio] connection lost: {e}")
        finally:
            conn.close()

    def _emit_text(self, raw: bytes):
        text = raw.decode("utf-8", errors="replace").strip()
        if text and self._on_text:
            self._on_text(text)

    def _run(self):
        while True:
            conn = self._connect()
            self._handle(conn)
            logging.info(f"[MonitorAudio] reconnecting in {self.RECONNECT_DELAY}s")
            time.sleep(self.RECONNECT_DELAY)
