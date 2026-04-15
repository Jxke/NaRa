import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./lib/config.mjs";
import { maybeAutostartComfy } from "./lib/autostart.mjs";
import { ensureComfyReady, fetchImagesAsDataUrls, queuePrompt, waitForPrompt } from "./lib/comfy.mjs";
import { buildPromptGraph, loadWorkflow, summarizeWorkflow } from "./lib/workflow.mjs";

const config = loadConfig();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(__dirname, "../site");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(siteDir));

let comfyProcess = null;
let requestChain = Promise.resolve();

function isLoopbackAddress(address) {
  return address === "::1" || address === "::ffff:127.0.0.1" || address === "127.0.0.1";
}

function requireAuth(req, res, next) {
  if (isLoopbackAddress(req.ip) || isLoopbackAddress(req.socket.remoteAddress)) {
    return next();
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (token !== config.bridgeToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
  res.status(204).end();
});

app.get("/health", async (_req, res) => {
  try {
    const workflow = await loadWorkflow(config.workflowPath);
    const comfy = await ensureComfyReady(config.comfyApiUrl);
    res.json({
      ok: true,
      workflow: summarizeWorkflow(workflow),
      comfy,
      autostart: config.comfyAutostart,
      comfyProcessRunning: Boolean(comfyProcess && !comfyProcess.killed)
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/generate", requireAuth, async (req, res) => {
  const { prompt } = req.body ?? {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "A non-empty `prompt` string is required." });
  }

  requestChain = requestChain.catch(() => null).then(async () => {
    const workflow = await loadWorkflow(config.workflowPath);
    const promptGraph = buildPromptGraph(workflow, config, req.body);
    await ensureComfyReady(config.comfyApiUrl);
    const queued = await queuePrompt(config.comfyApiUrl, promptGraph);
    const images = await waitForPrompt(config.comfyApiUrl, queued.prompt_id, config.saveImageNodeId);
    const hydratedImages = await fetchImagesAsDataUrls(config.comfyApiUrl, images, {
      outputWidth: config.outputWidth,
      outputHeight: config.outputHeight
    });

    return {
      ok: true,
      promptId: queued.prompt_id,
      images: hydratedImages,
      request: {
        prompt,
        fullPrompt: promptGraph[String(config.positivePromptNodeId)]?.inputs?.text ?? prompt,
        negativePrompt: req.body.negativePrompt ?? null,
        width: req.body.width ?? null,
        height: req.body.height ?? null,
        steps: req.body.steps ?? null,
        cfg: req.body.cfg ?? null,
        seed: req.body.seed ?? null
      }
    };
  });

  try {
    const result = await requestChain;
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

async function start() {
  comfyProcess = await maybeAutostartComfy(config);

  app.listen(config.port, () => {
    console.log(`GlyphEngine bridge listening on http://127.0.0.1:${config.port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
