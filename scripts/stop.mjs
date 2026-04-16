import fs from "node:fs/promises";
import path from "node:path";

const runtimeDir = path.resolve(".runtime");
const stateFiles = [
  path.join(runtimeDir, "cloudflared.json"),
  path.join(runtimeDir, "worker.json"),
  path.join(runtimeDir, "comfyui.json")
];

async function readState(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function stopPid(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid);
    return true;
  } catch {
    return false;
  }
}

for (const filePath of stateFiles) {
  const state = await readState(filePath);
  if (state?.pid) {
    const stopped = stopPid(state.pid);
    console.log(stopped ? `Stopped PID ${state.pid}` : `PID ${state.pid} was not running`);
  }
  await fs.rm(filePath, { force: true });
}

await fs.rm(path.join(runtimeDir, "cloudflared.log"), { force: true });
