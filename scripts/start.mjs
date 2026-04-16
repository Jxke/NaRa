import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const runtimeDir = path.resolve(".runtime");
const comfyStatePath = path.join(runtimeDir, "comfyui.json");
const workerStatePath = path.join(runtimeDir, "worker.json");
const tunnelStatePath = path.join(runtimeDir, "cloudflared.json");
const tunnelLogPath = path.join(runtimeDir, "cloudflared.log");

const comfyDesktopExecutable =
  process.env.COMFY_DESKTOP_EXECUTABLE ??
  "C:\\Users\\Jake\\AppData\\Local\\Programs\\ComfyUI\\ComfyUI.exe";

const cloudflaredExecutable =
  process.env.CLOUDFLARED_EXECUTABLE ??
  "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe";

const workerPort = Number.parseInt(process.env.PORT ?? "8787", 10);
const comfyApiUrl = process.env.COMFY_API_URL ?? "http://127.0.0.1:8000";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureRuntimeDir() {
  await fs.mkdir(runtimeDir, { recursive: true });
}

async function writeState(filePath, payload) {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
}

async function readState(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function isPidAlive(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function urlResponds(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await urlResponds(url)) {
      return true;
    }
    await wait(1000);
  }
  return false;
}

function spawnDetached(command, args, options = {}) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
    ...options
  });
  child.unref();
  return child;
}

async function startComfyUi() {
  if (await urlResponds(new URL("/system_stats", comfyApiUrl))) {
    console.log(`ComfyUI already available at ${comfyApiUrl}`);
    return;
  }

  const child = spawnDetached(comfyDesktopExecutable, [], {
    cwd: path.dirname(comfyDesktopExecutable)
  });
  await writeState(comfyStatePath, {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    executable: comfyDesktopExecutable
  });

  const ready = await waitForUrl(new URL("/system_stats", comfyApiUrl), 45000);
  if (!ready) {
    throw new Error(`ComfyUI did not become ready at ${comfyApiUrl}`);
  }

  console.log(`ComfyUI started at ${comfyApiUrl}`);
}

async function startWorker() {
  if (await urlResponds(`http://127.0.0.1:${workerPort}/health`)) {
    console.log(`Worker already available at http://127.0.0.1:${workerPort}`);
    return;
  }

  const nodeExecutable = process.execPath;
  const child = spawnDetached(
    nodeExecutable,
    ["--env-file=.env", "worker/server.mjs"],
    { cwd: path.resolve(".") }
  );

  await writeState(workerStatePath, {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    port: workerPort
  });

  const ready = await waitForUrl(`http://127.0.0.1:${workerPort}/health`, 15000);
  if (!ready) {
    throw new Error(`Worker did not become ready on port ${workerPort}`);
  }

  console.log(`Worker started at http://127.0.0.1:${workerPort}`);
}

async function startTunnel() {
  const currentState = await readState(tunnelStatePath);
  if (currentState?.pid && isPidAlive(currentState.pid) && currentState.url) {
    console.log(`Cloudflare tunnel already running at ${currentState.url}`);
    return;
  }

  await fs.rm(tunnelLogPath, { force: true });
  const child = spawnDetached(cloudflaredExecutable, [
    "tunnel",
    "--url",
    `http://127.0.0.1:${workerPort}`,
    "--logfile",
    tunnelLogPath
  ]);

  const baseState = {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    executable: cloudflaredExecutable,
    logfile: tunnelLogPath
  };
  await writeState(tunnelStatePath, baseState);

  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      const logText = await fs.readFile(tunnelLogPath, "utf8");
      const match = logText.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match) {
        const url = match[0];
        await writeState(tunnelStatePath, { ...baseState, url });
        console.log(`Cloudflare tunnel started at ${url}`);
        return;
      }
    } catch {
      // wait for logfile creation
    }
    await wait(1000);
  }

  throw new Error("Cloudflare tunnel started but no public URL was detected in time");
}

await ensureRuntimeDir();
await startComfyUi();
await startWorker();
await startTunnel();
