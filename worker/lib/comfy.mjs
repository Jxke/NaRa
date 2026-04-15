import { randomUUID } from "node:crypto";
import sharp from "sharp";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildViewUrl(baseUrl, image) {
  const url = new URL("/view", baseUrl);
  url.searchParams.set("filename", image.filename);
  url.searchParams.set("subfolder", image.subfolder ?? "");
  url.searchParams.set("type", image.type ?? "output");
  return url;
}

function encodeBmpFromRgba(rgbaBuffer, width, height) {
  const headerSize = 14;
  const dibSize = 40;
  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel;
  const pixelArraySize = rowSize * height;
  const fileSize = headerSize + dibSize + pixelArraySize;
  const buffer = Buffer.alloc(fileSize);

  buffer.write("BM", 0, "ascii");
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(headerSize + dibSize, 10);

  buffer.writeUInt32LE(dibSize, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(32, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  buffer.writeUInt32LE(0, 46);
  buffer.writeUInt32LE(0, 50);

  let offset = headerSize + dibSize;
  for (let y = height - 1; y >= 0; y -= 1) {
    const rowStart = y * rowSize;
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = rowStart + x * bytesPerPixel;
      buffer[offset] = rgbaBuffer[sourceOffset + 2];
      buffer[offset + 1] = rgbaBuffer[sourceOffset + 1];
      buffer[offset + 2] = rgbaBuffer[sourceOffset];
      buffer[offset + 3] = rgbaBuffer[sourceOffset + 3];
      offset += bytesPerPixel;
    }
  }

  return buffer;
}

export async function ensureComfyReady(baseUrl) {
  const response = await fetch(new URL("/system_stats", baseUrl));
  if (!response.ok) {
    throw new Error(`ComfyUI health check failed with status ${response.status}`);
  }
  return response.json();
}

export async function queuePrompt(baseUrl, promptGraph) {
  const response = await fetch(new URL("/prompt", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      client_id: randomUUID(),
      prompt: promptGraph
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ComfyUI rejected the prompt: ${response.status} ${text}`);
  }

  return response.json();
}

export async function waitForPrompt(baseUrl, promptId, saveImageNodeId, timeoutMs = 300000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const response = await fetch(new URL(`/history/${promptId}`, baseUrl));
    if (!response.ok) {
      throw new Error(`Failed to fetch ComfyUI history for prompt ${promptId}`);
    }

    const history = await response.json();
    const entry = history[promptId];
    if (entry?.status?.status_str === "error") {
      throw new Error(`ComfyUI reported an error for prompt ${promptId}`);
    }

    const outputs = entry?.outputs?.[String(saveImageNodeId)];
    if (outputs?.images?.length) {
      return outputs.images;
    }

    await wait(1500);
  }

  throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}`);
}

export async function fetchImagesAsDataUrls(baseUrl, images, options = {}) {
  const outputWidth = options.outputWidth ?? 128;
  const outputHeight = options.outputHeight ?? 128;
  const results = [];

  for (const image of images) {
    const response = await fetch(buildViewUrl(baseUrl, image));
    if (!response.ok) {
      throw new Error(`Failed to fetch generated image ${image.filename}`);
    }

    const sourceBuffer = Buffer.from(await response.arrayBuffer());
    const rgbaBuffer = await sharp(sourceBuffer)
      .resize(outputWidth, outputHeight, {
        fit: "fill",
        kernel: sharp.kernel.nearest
      })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const bmpBuffer = encodeBmpFromRgba(rgbaBuffer, outputWidth, outputHeight);
    const base64 = bmpBuffer.toString("base64");

    results.push({
      ...image,
      contentType: "image/bmp",
      width: outputWidth,
      height: outputHeight,
      dataUrl: `data:image/bmp;base64,${base64}`
    });
  }

  return results;
}
