# ROCK

Arduino UNO Q project — animated display, IMU-driven googly eyes, and an Ambient AI voice assistant running on the Debian side.

## Hardware

| Component | Interface | Pins |
|-----------|-----------|------|
| GC9A01 Round Display (240×240) | SPI | SCK=13, MOSI=11, DC=10, CS=9, RST=8 |
| MPU-6050 IMU | I2C | SDA, SCL |
| AHT20 Temp/Humidity Sensor | I2C | SDA, SCL |
| Talk Button | GPIO | D2 (active low, internal pull-up) |

## Structure

```
ROCK/
├── ROCK/                   ← main Arduino sketch
│   └── ROCK.ino
├── ambient_ai/             ← Debian-side Python pipeline
│   ├── main.py                 Entry point
│   ├── stt.py                  Speech-to-text (Whisper)
│   ├── llm.py                  LLM inference
│   ├── tts.py                  Text-to-speech
│   ├── context.py              Context assembly
│   ├── db.py                   Sensor/context database
│   ├── emoji_map.py            Emotion → emoji mapping
│   ├── send_emoji.py           Send emoji to display via Bridge RPC
│   ├── system_prompt.txt       LLM system prompt
│   └── schema.md               Arduino ↔ Linux communication schema
└── Sensor test/            ← test sketches
    ├── Sensor test.ino         AHT20 temperature & humidity reader
    ├── AHT20Test/              AHT20 standalone test
    ├── Blink/                  Basic LED blink
    └── Test/                   Display wiring verification (red screen)
```

## Arduino Sketch (ROCK.ino)

Animated googly eyes on the GC9A01 circular display, driven by the MPU-6050 IMU. Tilt the board to move the pupils. Communicates with the Debian side via the Arduino Router Bridge.

**Libraries:** Adafruit GC9A01A, Adafruit GFX, Adafruit MPU6050, Adafruit AHTX0, Adafruit Unified Sensor, Arduino_RouterBridge, MsgPack

**How it works:**
- Accelerometer axes smoothed with exponential moving average (α=0.6) to simulate googly eye physics
- IMU bias auto-calibrated at startup — pupils centre correctly regardless of board mounting angle
- Each eye rendered into a 111×111 pixel RAM framebuffer and pushed via single `drawRGBBitmap` call, eliminating scan line artifacts

**Ambient AI integration:**
- `TEMP:<val>` and `HUM:<val>` sent via `Monitor` every second
- Button on D2 (active low): hold → `MIC:START`, release → `MIC:STOP`
- `show_emoji(bytes)` RPC: receives 40×40 RGB565 bitmap, renders in pupils (IMU frozen) for 10 seconds
- `clear_emoji()` RPC: returns to googly eyes

## Ambient AI Pipeline (ambient_ai/)

Runs on the Arduino UNO Q's Debian side. Listens for `MIC:START`/`MIC:STOP` from the MCU, records audio, transcribes with Whisper, queries an LLM, and sends an emoji response back to the display.

See [`ambient_ai/schema.md`](ambient_ai/schema.md) for the full Arduino ↔ Linux communication spec.

## Uploading the Sketch

The board connects over WiFi or USB. The sketch is also auto-flashed on boot via `eyes-sketch.service` on the Debian side.

### From Debian side (on-board)
```bash
cd /home/arduino/ROCK && git pull
systemctl start eyes-sketch
```

### Over WiFi (from Mac)
```bash
REMOTEOCD=~/Library/Arduino15/packages/arduino/tools/remoteocd/0.0.4-rc.4/remoteocd
VARIANT=~/Library/Arduino15/packages/arduino/hardware/zephyr/0.53.1/variants/arduino_uno_q_stm32u585xx

arduino-cli compile --fqbn arduino:zephyr:unoq --build-path /tmp/build ROCK/

"$REMOTEOCD" upload \
  -a <board-ip> \
  --password "12345678" \
  -f "$VARIANT/flash_sketch.cfg" \
  /tmp/build/ROCK.ino.elf-zsk.bin
```

### Over USB (from Mac)
```bash
REMOTEOCD=~/Library/Arduino15/packages/arduino/tools/remoteocd/0.0.4-rc.4/remoteocd
ADB=~/Library/Arduino15/packages/arduino/tools/adb/32.0.0/adb
VARIANT=~/Library/Arduino15/packages/arduino/hardware/zephyr/0.53.1/variants/arduino_uno_q_stm32u585xx

arduino-cli compile --fqbn arduino:zephyr:unoq --build-path /tmp/build ROCK/

"$REMOTEOCD" upload \
  --adb-path "$ADB" \
  -s "693293613" \
  -f "$VARIANT/flash_sketch.cfg" \
  /tmp/build/ROCK.ino.elf-zsk.bin
```

> **Note:** Always upload the `.elf-zsk.bin` file (not `.bin`) — this is the correct binary format for Zephyr's dynamic link mode on the UNO Q.

## Board Info

- **FQBN:** `arduino:zephyr:unoq`
- **Core:** `arduino:zephyr` v0.53.1
- **Serial number:** `693293613`
- **Network hostname:** `rock.local`
- **Debian repo:** `/home/arduino/ROCK/` → `git@github.com:Jxke/ROCK.git`
