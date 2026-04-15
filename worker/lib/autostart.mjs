import { spawn } from "node:child_process";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function maybeAutostartComfy(config) {
  if (!config.comfyAutostart) {
    return null;
  }

  if (!config.comfyEntrypoint) {
    throw new Error("COMFY_AUTOSTART is enabled but COMFY_ENTRYPOINT is not set");
  }

  const child = spawn(
    config.comfyPythonExecutable,
    [
      config.comfyEntrypoint,
      "--listen",
      config.comfyListenHost,
      "--port",
      String(config.comfyPort)
    ],
    {
      cwd: config.comfyWorkingDir,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[comfyui] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[comfyui] ${chunk}`);
  });

  child.on("exit", (code) => {
    console.log(`ComfyUI process exited with code ${code}`);
  });

  await wait(3000);
  return child;
}
