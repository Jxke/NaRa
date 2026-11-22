import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";

export default defineConfig({
  adapter: netlify(),
  integrations: [react()],
});
