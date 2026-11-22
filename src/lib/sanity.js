import { createClient } from "@sanity/client";

export const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID || "5qn2z2dc";
export const dataset = import.meta.env.PUBLIC_SANITY_DATASET || "production";

const client = projectId ? createClient({
  projectId,
  dataset,
  apiVersion: "2025-01-01",
  perspective: "published",
  useCdn: false,
}) : null;

export async function readSanity(query, fallback) {
  if (!client) return fallback;

  try {
    return (await client.fetch(query, {}, { signal: AbortSignal.timeout(5000) })) ?? fallback;
  } catch (error) {
    console.warn("Could not load NaRa content from Sanity:", error.message);
    return fallback;
  }
}
