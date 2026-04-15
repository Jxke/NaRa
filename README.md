# GlyphEngine

This branch is now a clean Netlify-ready frontend plus a local bridge that runs your ComfyUI workflow headlessly on your own machine.

## What This Actually Does

Netlify cannot run ComfyUI with your local GPU, LoRAs, and existing Windows install directly.
So this project is split into two parts:

- `site/`: the public frontend Netlify hosts
- `netlify/functions/`: a Netlify serverless proxy that forwards generation requests
- `worker/`: the local bridge you run on your own computer next to ComfyUI

Flow:

1. A user opens your Netlify URL.
2. They enter a prompt.
3. Netlify forwards that request to your public bridge URL.
4. The bridge patches your `GLYPHENGINE_Qwen_LoRA.json` workflow and submits it to local ComfyUI.
5. ComfyUI generates the image on your machine.
6. The bridge fetches the output image from ComfyUI and returns it to Netlify as a data URL.
7. The browser displays the result.

## Branch Scope

This `glyphengine` branch has been repurposed away from the old ROCK firmware project so it can merge back into `main` cleanly as a self-contained app.

## Files

- `site/index.html`: public UI
- `site/app.js`: prompt submission and result rendering
- `site/styles.css`: frontend styling
- `netlify/functions/generate.mjs`: proxy from Netlify to your local bridge
- `netlify/functions/health.mjs`: public health check
- `worker/server.mjs`: local authenticated bridge
- `worker/lib/workflow.mjs`: workflow patching and ComfyUI prompt conversion
- `.env.example`: required environment variables
- `CODEX.md`: persistent session context for this branch

## Local Setup

1. Install dependencies:

```powershell
npm install
```

2. Copy `.env.example` into `.env` if needed and update values.

Important values for your current setup:

- `COMFY_WORKFLOW_PATH=C:\Users\Jake\Documents\Art Tech\ComfyUI\user\default\workflows\GLYPHENGINE_Qwen_LoRA.json`
- `COMFY_POSITIVE_PROMPT_NODE_ID=9`
- `COMFY_NEGATIVE_PROMPT_NODE_ID=10`
- `COMFY_SAMPLER_NODE_ID=8`
- `COMFY_LATENT_NODE_ID=16`
- `COMFY_SAVE_IMAGE_NODE_ID=20`

3. Start ComfyUI.

Two options:

- Run it yourself.
- Or set `COMFY_AUTOSTART=true` so the bridge launches `main.py` for you.

If you are using the ComfyUI desktop app on this machine, the actual core entrypoint is:

- `C:\Users\Jake\AppData\Local\Programs\ComfyUI\resources\ComfyUI\main.py`

4. Start the local bridge:

```powershell
npm run worker
```

5. Check the local bridge:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health

Note for the ComfyUI desktop app on this machine:

- the backend is currently listening on `127.0.0.1:8000`
- the bridge `.env` has been updated to use `COMFY_API_URL=http://127.0.0.1:8000`
```

## Exposing Your Computer Safely

Do not use raw port forwarding if you can avoid it.
The practical options are:

1. Cloudflare Tunnel
2. Tailscale Funnel
3. ngrok

Best default:

- use a tunnel to publish `http://127.0.0.1:8787`
- require `BRIDGE_TOKEN`
- keep ComfyUI itself bound to `127.0.0.1`

The public URL from that tunnel becomes:

- `COMFY_BRIDGE_URL` in Netlify

## Netlify Setup

Create a new Netlify site from this `glyphengine` branch.

Set these environment variables in Netlify:

- `COMFY_BRIDGE_URL`
- `COMFY_BRIDGE_TOKEN`

This project uses:

- publish directory: `site`
- functions directory: `netlify/functions`

Those are already defined in `netlify.toml`.

## API

### `POST /generate` on the local bridge

Request body:

```json
{
  "prompt": "naraglyph, monochrome advisory glyph, lonely at the top of a mountain",
  "negativePrompt": "text",
  "width": 256,
  "height": 256,
  "steps": 8,
  "cfg": 8,
  "seed": 359372081652883
}
```

The bridge:

- updates the positive prompt node
- optionally updates the negative prompt node
- updates sampler values
- updates latent size
- submits the job to ComfyUI
- returns generated images as `dataUrl`

## Verification

Workflow conversion check:

```powershell
npm run check
```

Bridge runtime:

```powershell
npm run worker
```

Then from another terminal:

```powershell
$headers = @{ Authorization = "Bearer YOUR_BRIDGE_TOKEN" }
$body = @{
  prompt = "naraglyph, monochrome advisory glyph, lunar warning sigil"
  negativePrompt = "text"
  width = 256
  height = 256
  steps = 8
  cfg = 8
} | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8787/generate -Method Post -Headers $headers -ContentType "application/json" -Body $body
```

## Limits

- Netlify is hosting the UI and proxy, not the GPU workload.
- Your computer must be on and running both the bridge and ComfyUI.
- Anyone with the public site can submit prompts unless you add frontend auth or rate limiting.
- The bridge currently serializes generation requests to avoid overlapping jobs on one local machine.

## Next Reasonable Hardening Steps

- add simple frontend auth
- add rate limiting at the bridge
- store outputs to object storage instead of returning base64
- add a prompt queue UI
- log job metadata and failures
