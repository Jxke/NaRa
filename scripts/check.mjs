import { loadConfig } from "../worker/lib/config.mjs";
import { buildPromptGraph, loadWorkflow, summarizeWorkflow } from "../worker/lib/workflow.mjs";

const config = loadConfig();
const workflow = await loadWorkflow(config.workflowPath);
const promptGraph = buildPromptGraph(workflow, config, {
  prompt: "naraglyph, monochrome advisory glyph, geometric mountain summit"
});

console.log(JSON.stringify({
  ok: true,
  workflow: summarizeWorkflow(workflow),
  promptNodeCount: Object.keys(promptGraph).length
}, null, 2));
