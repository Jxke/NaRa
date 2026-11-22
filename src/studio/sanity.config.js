import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import pressEntry from "./press-entry.js";
import about from "./about.js";
import { localEntries } from "../lib/press-content.js";

export default defineConfig({
  name: "nara",
  title: "NaRa",
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID || "5qn2z2dc",
  dataset: import.meta.env.PUBLIC_SANITY_DATASET || "production",
  basePath: "/sanity-cms",
  plugins: [structureTool({
    structure: (S) => S.list().title("NaRa").items([
      S.documentTypeListItem("naraPressEntry").title("Press").child(
        S.documentTypeList("naraPressEntry").title("Press").initialValueTemplates([
          ...localEntries.map(({ id, title }) => S.initialValueTemplateItem(`press-${id}`).title(title)),
          S.initialValueTemplateItem("naraPressEntry").title("New Press entry"),
        ])
      ),
      S.listItem().title("About Us").child(
        S.document().schemaType("naraAbout").documentId("nara-about")
      ),
    ]),
  })],
  schema: {
    types: [pressEntry, about],
    templates: (existing) => [
      ...existing,
      ...localEntries.map(({ id, ...entry }) => ({
        id: `press-${id}`,
        title: entry.title,
        schemaType: "naraPressEntry",
        value: { ...entry, slug: { _type: "slug", current: id } },
      })),
    ],
  },
});
