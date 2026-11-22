import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID || "5qn2z2dc",
    dataset: process.env.PUBLIC_SANITY_DATASET || "production",
  },
});
