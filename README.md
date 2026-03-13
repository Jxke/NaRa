# ROCK

Arduino sketches for the Arduino UNO Q, developed and deployed over WiFi using `arduino-cli`.

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
├── Eyes/               ← main sketch
│   └── Eyes.ino
└── Sensor test/        ← test sketches
    ├── Sensor test.ino     AHT20 temperature & humidity reader
    ├── AHT20Test/          AHT20 standalone test
    ├── Blink/              Basic LED blink
    └── Test/               Display wiring verification (red screen)
```

## Sketches

### Eyes (main)
Animated googly eyes on the GC9A01 circular display, driven by the MPU-6050 IMU. Tilt the board to move the pupils. Part of the Ambient AI system — communicates with the Debian side via the Arduino Router Bridge.

**Libraries:** Adafruit GC9A01A, Adafruit GFX, Adafruit MPU6050, Adafruit AHTX0, Adafruit Unified Sensor, Arduino_RouterBridge, MsgPack

**How it works:**
- Accelerometer X/Y axes are smoothed with an exponential moving average (α=0.6) to simulate googly eye physics
- Each eye is rendered into a 111×111 pixel RAM framebuffer and pushed to the display in a single `drawRGBBitmap` call, eliminating scan line artifacts
- Only redraws when the pupil position changes by ≥1 pixel

**Ambient AI integration:**
- `TEMP:<val>` and `HUM:<val>` lines sent via `Monitor` every second
- Button on D2 (active low): hold to send `MIC:START`, release to send `MIC:STOP`
- `show_emoji(bytes)` RPC: receives 40×40 RGB565 pixel data from Debian, renders it in the pupils (centred, IMU frozen) for 10 seconds
- `clear_emoji()` RPC: returns to normal googly eyes

### Sensor test/
- **Sensor test.ino** — reads AHT20 temp & humidity, prints over Serial every 2s
- **AHT20Test** — standalone AHT20 sanity check
- **Blink** — basic LED blink, used to verify board is running
- **Test** — red screen with "HELLO", used to verify display wiring

## Uploading

The board is named `rock` and connects over WiFi at `172.20.10.5` or via USB.

### Over WiFi
```bash
REMOTEOCD=~/Library/Arduino15/packages/arduino/tools/remoteocd/0.0.4-rc.4/remoteocd
VARIANT=~/Library/Arduino15/packages/arduino/hardware/zephyr/0.53.1/variants/arduino_uno_q_stm32u585xx

arduino-cli compile --fqbn arduino:zephyr:unoq --build-path /tmp/build <sketch_path>

"$REMOTEOCD" upload \
  -a 172.20.10.5 \
  --password "12345678" \
  -f "$VARIANT/flash_sketch.cfg" \
  /tmp/build/<Sketch>.ino.elf-zsk.bin
```

### Over USB
```bash
REMOTEOCD=~/Library/Arduino15/packages/arduino/tools/remoteocd/0.0.4-rc.4/remoteocd
ADB=~/Library/Arduino15/packages/arduino/tools/adb/32.0.0/adb
VARIANT=~/Library/Arduino15/packages/arduino/hardware/zephyr/0.53.1/variants/arduino_uno_q_stm32u585xx

arduino-cli compile --fqbn arduino:zephyr:unoq --build-path /tmp/build <sketch_path>

"$REMOTEOCD" upload \
  --adb-path "$ADB" \
  -s "693293613" \
  -f "$VARIANT/flash_sketch.cfg" \
  /tmp/build/<Sketch>.ino.elf-zsk.bin
```

> **Note:** Always upload the `.elf-zsk.bin` file (not `.bin`) — this is the correct binary format for Zephyr's dynamic link mode on the UNO Q.

## Board Info

- **FQBN:** `arduino:zephyr:unoq`
- **Core:** `arduino:zephyr` v0.53.1
- **Serial number:** `693293613`
- **Network hostname:** `rock.local`
