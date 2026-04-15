const form = document.getElementById("generate-form");
const statusNode = document.getElementById("status");
const resultsNode = document.getElementById("results");
const submitButton = document.getElementById("submit-button");
const healthButton = document.getElementById("health-button");
const apiBase = window.location.port === "8787" ? "" : "/api";

function setStatus(message) {
  statusNode.textContent = message;
}

function numericValue(field) {
  return field.value === "" ? undefined : Number(field.value);
}

function renderImages(images) {
  resultsNode.innerHTML = "";

  for (const image of images) {
    const article = document.createElement("article");
    article.className = "result-card";

    const canvas = document.createElement("canvas");
    canvas.width = image.width ?? 128;
    canvas.height = image.height ?? 128;
    canvas.className = "bitmap-canvas";

    const download = document.createElement("a");
    download.href = image.dataUrl;
    download.download = image.filename.replace(/\.[^.]+$/, "") + ".bmp";
    download.textContent = `Download ${download.download}`;

    const meta = document.createElement("p");
    meta.className = "bitmap-meta";
    meta.textContent = `${canvas.width}x${canvas.height} bitmap`;

    article.append(canvas, meta, download);
    resultsNode.append(article);

    renderBitmapToCanvas(canvas, image.dataUrl);
  }
}

function renderBitmapToCanvas(canvas, dataUrl) {
  const context = canvas.getContext("2d");
  const image = new Image();
  image.onload = () => {
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  };
  image.src = dataUrl;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  setStatus("Submitting prompt to the bridge...");

  const payload = {
    prompt: form.prompt.value.trim(),
    negativePrompt: form.negativePrompt.value.trim(),
    width: numericValue(form.width),
    height: numericValue(form.height),
    steps: numericValue(form.steps),
    cfg: numericValue(form.cfg),
    seed: numericValue(form.seed)
  };

  if (!payload.negativePrompt) {
    delete payload.negativePrompt;
  }

  if (!payload.prompt) {
    setStatus("Prompt is required.");
    submitButton.disabled = false;
    return;
  }

  try {
    const response = await fetch(`${apiBase}/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error ?? "Generation failed");
    }

    renderImages(result.images ?? []);
    setStatus(`Generated ${result.images.length} image(s). Prompt ID: ${result.promptId}`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

healthButton.addEventListener("click", async () => {
  healthButton.disabled = true;
  setStatus("Checking bridge...");

  try {
    const response = await fetch(`${apiBase}/health`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error ?? "Bridge health check failed");
    }

    setStatus(`Bridge is up. Workflow nodes: ${result.workflow.nodeCount}.`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    healthButton.disabled = false;
  }
});
