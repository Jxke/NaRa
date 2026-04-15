import fs from "node:fs/promises";

const SUPPORTED_WIDGET_TYPES = new Map([
  ["UNETLoader", ["unet_name", "weight_dtype"]],
  ["VAELoader", ["vae_name"]],
  ["CLIPLoader", ["clip_name", "type", "device"]],
  ["LoraLoader", ["lora_name", "strength_model", "strength_clip"]],
  ["CLIPTextEncode", ["text"]],
  ["EmptySD3LatentImage", ["width", "height", "batch_size"]],
  ["KSampler", ["seed", null, "steps", "cfg", "sampler_name", "scheduler", "denoise"]],
  ["VAEDecode", []],
  ["SaveImage", ["filename_prefix"]],
  ["PreviewImage", []]
]);

function findNode(workflow, nodeId) {
  return workflow.nodes.find((node) => node.id === nodeId);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function coerceOptionalNumber(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a finite number, received: ${value}`);
  }
  return parsed;
}

export async function loadWorkflow(workflowPath) {
  const raw = await fs.readFile(workflowPath, "utf8");
  return JSON.parse(raw);
}

export function buildPromptGraph(workflow, config, request) {
  const working = clone(workflow);
  const promptPrefix = config.promptPrefix?.trim();
  const userPrompt = String(request.prompt ?? "").trim();
  const fullPrompt = promptPrefix ? `${promptPrefix} ${userPrompt}`.trim() : userPrompt;

  const positiveNode = findNode(working, config.positivePromptNodeId);
  if (!positiveNode) {
    throw new Error(`Positive prompt node ${config.positivePromptNodeId} not found in workflow`);
  }
  positiveNode.widgets_values[0] = fullPrompt;

  const negativeNode = findNode(working, config.negativePromptNodeId);
  if (negativeNode && request.negativePrompt !== undefined) {
    negativeNode.widgets_values[0] = request.negativePrompt;
  }

  const samplerNode = findNode(working, config.samplerNodeId);
  if (!samplerNode) {
    throw new Error(`Sampler node ${config.samplerNodeId} not found in workflow`);
  }
  samplerNode.widgets_values[0] = coerceOptionalNumber(request.seed, samplerNode.widgets_values[0]);
  samplerNode.widgets_values[2] = coerceOptionalNumber(request.steps, samplerNode.widgets_values[2]);
  samplerNode.widgets_values[3] = coerceOptionalNumber(request.cfg, samplerNode.widgets_values[3]);

  const latentNode = findNode(working, config.latentNodeId);
  if (!latentNode) {
    throw new Error(`Latent node ${config.latentNodeId} not found in workflow`);
  }
  latentNode.widgets_values[0] = coerceOptionalNumber(request.width, latentNode.widgets_values[0]);
  latentNode.widgets_values[1] = coerceOptionalNumber(request.height, latentNode.widgets_values[1]);
  latentNode.widgets_values[2] = coerceOptionalNumber(request.batchSize, latentNode.widgets_values[2]);

  const saveNode = findNode(working, config.saveImageNodeId);
  if (!saveNode) {
    throw new Error(`SaveImage node ${config.saveImageNodeId} not found in workflow`);
  }
  saveNode.widgets_values[0] = request.filenamePrefix || config.filenamePrefix;

  return convertWorkflowToApiPrompt(working);
}

export function summarizeWorkflow(workflow) {
  return {
    nodeCount: workflow.nodes.length,
    clipTextEncodeNodeIds: workflow.nodes
      .filter((node) => node.type === "CLIPTextEncode")
      .map((node) => node.id),
    saveImageNodeId: workflow.nodes.find((node) => node.type === "SaveImage")?.id ?? null
  };
}

function convertWorkflowToApiPrompt(workflow) {
  const linkMap = new Map(workflow.links.map((link) => [link[0], link]));
  const prompt = {};

  for (const node of workflow.nodes) {
    const supportedInputs = SUPPORTED_WIDGET_TYPES.get(node.type);
    if (!supportedInputs) {
      throw new Error(`Unsupported node type in workflow conversion: ${node.type}`);
    }

    const inputs = {};
    let widgetIndex = 0;

    for (const input of node.inputs ?? []) {
      if (input.link !== null) {
        const link = linkMap.get(input.link);
        if (!link) {
          throw new Error(`Broken link ${input.link} on node ${node.id}`);
        }
        inputs[input.name] = [String(link[1]), link[2]];
        continue;
      }

      if (!input.widget) {
        continue;
      }

      const expectedName = supportedInputs[widgetIndex];
      const value = node.widgets_values?.[widgetIndex];
      widgetIndex += 1;

      if (!expectedName) {
        continue;
      }

      inputs[input.name] = value;
    }

    if (node.type === "KSampler") {
      inputs.seed = node.widgets_values[0];
      inputs.steps = node.widgets_values[2];
      inputs.cfg = node.widgets_values[3];
      inputs.sampler_name = node.widgets_values[4];
      inputs.scheduler = node.widgets_values[5];
      inputs.denoise = node.widgets_values[6];
    }

    prompt[String(node.id)] = {
      class_type: node.type,
      inputs
    };
  }

  return prompt;
}
