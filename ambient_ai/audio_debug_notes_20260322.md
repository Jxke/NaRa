# Audio Debug Learnings (2026-03-22)

This file captures the key learnings from iterative button->mic->Whisper testing on UNO Q.

## Stable Baseline

- Stable display/IMU behavior was restored by flashing `ROCK/ROCK.ino` through `~/flash-eyes.sh`.
- Experimental MCU-side audio rewrites in both `sketch/sketch.ino` and `ROCK/ROCK.ino` caused intermittent freezes and/or blank display states, so they were rolled back.

## Observed Audio Bottleneck

- Multiple captures showed effective sample rates well below nominal 8 kHz while holding D2:
  - `button_capture_20260322_025252_meta.json`: `sample_rate=3645`, `nominal_rate=8000`, `samples=15488`, `capture_window_s=4.2495`.
- This rate collapse explains the "deep voice" and heavy distortion artifacts.
- Whisper output quality degrades significantly when effective rate drops this low.

## Linux-Side Improvements Kept

`ambient_ai/main.py` now:

- Parses MCU telemetry lines when available:
  - `MIC:SAMPLES`
  - `MIC:ELAPSED_US`
  - `MIC:OVERFLOW`
- Trims padded tail samples to `MIC:SAMPLES` when present.
- Computes effective sample rate dynamically:
  - Prefer MCU timing (`MIC:SAMPLES / MIC:ELAPSED_US`).
  - Fallback to Linux capture timing (`len(captured) / elapsed`) when MCU timing is missing.
- Uses the computed effective rate when constructing WAV bytes for Whisper.
- Adds pre-emphasis before normalization to improve consonant clarity in narrow-band captures.

## Current Conclusion

- The primary remaining issue is MCU-side capture throughput under the current stable firmware path.
- Display reliability and audio quality are coupled when MCU load is increased; safe next work should be incremental and isolated to audio timing/transport with immediate rollback points.
