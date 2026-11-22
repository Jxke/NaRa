import { readSanity } from "./sanity.js";

import { localEntries } from "./press-content.js";

const query = `*[_type == "naraPressEntry"] {
  "id": slug.current,
  kind,
  title,
  url,
  order,
  "photos": photos[defined(asset->url)][]{"src": asset->url, alt}
}`;

export async function getPressEntries() {
  const entries = await readSanity(query, localEntries);
  return entries
    .filter((entry) => entry.id && entry.title && entry.kind)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
