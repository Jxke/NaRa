import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";

export default defineConfig({
  adapter: netlify(),
  integrations: [react()],
  redirects: {
    "/studio": { status: 301, destination: "/sanity-cms" },
    "/sanitycms": { status: 301, destination: "/sanity-cms" },
  },
});
