import { readSanity } from "./sanity.js";

import { localEntries } from "./press-content.js";

const query = `*[_type == "naraPressEntry"] {
  "id": slug.current,
  kind,
  title,
  date,
  description,
  url,
  "links": links[defined(url)][]{label, url},
  order,
  "photos": photos[defined(asset->url)][]{"src": asset->url, alt, caption}
}`;

export async function getPressEntries() {
  const entries = await readSanity(query, localEntries);
  return entries
    .filter((entry) => entry.id && entry.title && entry.kind)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
