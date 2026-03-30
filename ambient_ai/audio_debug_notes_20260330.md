# Audio Debug Notes (2026-03-30)

This note captures the current MCU mic debug state on the Arduino UNO Q after the latest solder rework and software pinmux verification pass.

## What Was Attempted

- Switched the MCU-side mic path to SAI1 Block B I2S using:
  - `PB3` for `SCK`
  - `PA4` for `WS`
  - `PC3` for `SD`
- Added and used Linux-side diagnostics in `ambient_ai/button_capture_test.py` and `ambient_ai/main.py` to:
  - parse mixed monitor text plus binary audio frames,
  - save raw and normalized WAV files,
  - save JSON metadata,
  - run Whisper on the normalized WAV for quick validation.
- Reworked the capture loop in `ROCK/ROCK.ino` around `i2s_read(...)`, slab-backed RX, decimation from `16000` to `8000`, and monitor lifecycle logging.
- Added runtime register dumps in `ROCK/ROCK.ino` for:
  - `SAI1_B` state,
  - `PB3`,
  - `PA4`,
  - `PC3`,
  - `PE3`.

## Successes

- SSH access, password auth, and remote flashing were stable.
- Linux-side monitor transport on `127.0.0.1:7500` remained readable throughout testing.
- The diagnostics pipeline consistently produced:
  - raw WAV,
  - normalized WAV,
  - metadata JSON,
  - Whisper output.
- A real software mismatch was found and fixed outside the repo in the installed/dev Zephyr core:
  - generated sketch artifacts were already targeting `PB3 / PA4 / PC3`,
  - packaged base firmware/loader state had still been targeting `PE3`.
- After rebuilding `ArduinoCore-zephyr`, syncing the installed package, reflashing the base firmware, and reflashing the sketch, runtime GPIO dumps confirmed the MCU was actually configured for the intended path:
  - `PB3` -> alternate function mode, `AF3`
  - `PA4` -> alternate function mode, `AF3`
  - `PC3` -> alternate function mode, `AF3`
  - `PE3` -> inactive for this path

## Failures / Current Result

- The MCU still does not return valid audio samples from the microphone.
- Repeated monitor logs still showed the same failure pattern after the pinmux/loader fix:
  - `SAI:START_OK`
  - repeated `SAI:READ_ERR ... SR:0x0`
  - `MIC:SAMPLES:0`
  - `MIC:READ_OK:0`
  - `MIC:READ_ERR:-11`
  - `MIC:STOP`
- Latest confirmed diagnostic capture:
  - `ambient_ai/diagnostics/button_capture_20260330_175124_meta.json`
- That metadata still reports:
  - `mcu_reported_samples: 0`
  - `mcu_read_err: -11`
  - `peak: 0`
  - `rms: 0.0`
  - `silent_fallback: true`

## Current Conclusion

The stale loader / stale pinmux explanation is now closed. The repo and runtime were brought into agreement on the `PC3` receive path, and runtime register dumps confirmed that the MCU was actually listening on `PC3`.

Because the mic still remains silent after that fix, the remaining issue is most likely hardware-path related:

- the INMP441 `SD` line is not actually reaching MCU `PC3`,
- `JSPI MOSI / PC3` is not the practical usable SAI data path on this board in the current wiring setup,
- or the mic/data side remains electrically dead despite the clock and frame configuration.

## Recommended Next Steps

- Verify continuity from the INMP441 `SD` wire to the actual MCU-side `PC3` destination.
- Probe `SCK`, `WS`, and `SD` with a logic analyzer or scope during capture start.
- A/B the `SD` wire onto the older `PE3` path or another known SAI-capable input and rerun the same diagnostics immediately.
- If fast working audio is more important than continuing MCU-side pin debug, move capture to the Linux side instead.
