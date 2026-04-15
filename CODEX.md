# CODEX

## Current Session Context

- This branch was repurposed on `2026-04-15` from the old ROCK firmware project into a new `GlyphEngine` web app.
- The goal is a Netlify-hosted frontend that can trigger image generation on Jake's local Windows machine through a local bridge.
- Netlify is not expected to run ComfyUI itself. The GPU workload stays on the local machine.
- The selected architecture is:
  - Netlify static frontend in `site/`
  - Netlify proxy functions in `netlify/functions/`
  - local authenticated bridge in `worker/`
- The local bridge talks to ComfyUI over `http://127.0.0.1:8188` by default.
- The bridge is built around this existing workflow:
  - `C:\Users\Jake\Documents\Art Tech\ComfyUI\user\default\workflows\GLYPHENGINE_Qwen_LoRA.json`
- The workflow nodes observed during this session were:
  - positive prompt node: `9`
  - negative prompt node: `10`
  - sampler node: `8`
  - latent node: `16`
  - save image node: `20`
- The workflow includes these model assets in the local ComfyUI install:
  - `qwen_image_fp8_e4m3fn.safetensors`
  - `qwen_image_vae.safetensors`
  - `qwen_2.5_vl_7b_fp8_scaled.safetensors`
  - `nara_v1.safetensors`
- The bridge can optionally autostart ComfyUI through `main.py` if `COMFY_AUTOSTART=true`.
- Public exposure should be done through a tunnel such as Cloudflare Tunnel, Tailscale Funnel, or ngrok rather than direct port forwarding.
- Shared secret auth is enforced on `POST /generate` through `BRIDGE_TOKEN`.
- Netlify should be configured with:
  - `COMFY_BRIDGE_URL`
  - `COMFY_BRIDGE_TOKEN`

## Working Notes

- The old project directories were intentionally removed from this branch:
  - `build/`
  - `glyphs/`
  - `ROCK/`
  - old `scripts/`
  - `supabase/`
- New project files introduced in this session:
  - `package.json`
  - `netlify.toml`
  - `.env.example`
  - `worker/`
  - `netlify/functions/`
  - `site/`
  - new `README.md`
- A local `.env` template was also created in the workspace and is gitignored.
- The workflow conversion code currently supports the node types present in `GLYPHENGINE_Qwen_LoRA.json`, not arbitrary ComfyUI graphs.

## Operational Reminders

- Run `npm install` before anything else.
- Run `npm run check` to verify the workflow file can be parsed and converted.
- Run `npm run worker` to start the local bridge.
- Netlify should build from the `glyphengine` branch and use the settings from `netlify.toml`.
