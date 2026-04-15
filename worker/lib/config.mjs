import path from "node:path";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalInt(name, fallback) {
  const value = process.env[name];
  return value ? Number.parseInt(value, 10) : fallback;
}

function optionalBool(name, fallback = false) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

export function loadConfig() {
  const comfyApiUrl = new URL(process.env.COMFY_API_URL ?? "http://127.0.0.1:8188");
  const comfyEntrypoint = process.env.COMFY_ENTRYPOINT
    ? path.resolve(process.env.COMFY_ENTRYPOINT)
    : null;
  const comfyWorkingDir = process.env.COMFY_WORKING_DIR
    ? path.resolve(process.env.COMFY_WORKING_DIR)
    : comfyEntrypoint
      ? path.dirname(comfyEntrypoint)
      : process.cwd();

  return {
    port: optionalInt("PORT", 8787),
    bridgeToken: required("BRIDGE_TOKEN"),
    comfyApiUrl,
    workflowPath: path.resolve(required("COMFY_WORKFLOW_PATH")),
    promptPrefix: process.env.COMFY_PROMPT_PREFIX ?? "",
    positivePromptNodeId: optionalInt("COMFY_POSITIVE_PROMPT_NODE_ID", 9),
    negativePromptNodeId: optionalInt("COMFY_NEGATIVE_PROMPT_NODE_ID", 10),
    samplerNodeId: optionalInt("COMFY_SAMPLER_NODE_ID", 8),
    latentNodeId: optionalInt("COMFY_LATENT_NODE_ID", 16),
    saveImageNodeId: optionalInt("COMFY_SAVE_IMAGE_NODE_ID", 20),
    filenamePrefix: process.env.COMFY_FILENAME_PREFIX ?? "glyphengine",
    outputWidth: optionalInt("COMFY_OUTPUT_WIDTH", 128),
    outputHeight: optionalInt("COMFY_OUTPUT_HEIGHT", 128),
    comfyAutostart: optionalBool("COMFY_AUTOSTART", false),
    comfyPythonExecutable: process.env.COMFY_PYTHON_EXECUTABLE ?? "python",
    comfyEntrypoint,
    comfyWorkingDir,
    comfyListenHost: process.env.COMFY_LISTEN_HOST ?? "127.0.0.1",
    comfyPort: optionalInt("COMFY_PORT", comfyApiUrl.port ? Number.parseInt(comfyApiUrl.port, 10) : 8188)
  };
}
