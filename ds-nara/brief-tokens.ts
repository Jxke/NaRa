/** Module colors for the project brief visualization.
 *  Reuses zone palette from architecture-tokens.ts where applicable.
 *  Tuned for contrast on the DS warm paper background (#f5f0e8). */

export const mod = {
  audio:     "#3568b2",   // steel blue (zone.audio)
  cloud:     "#7b3fa6",   // purple (zone.cloud)
  compress:  "#6b4d04",   // amber-brown (zone.storage)
  consult:   "#b85c1a",   // burnt orange (zone.app)
  glyph:     "#2a6490",   // teal-blue (zone.device)
  companion: "#1a7a42",   // forest green (zone.social)
  privacy:   "#a12e22",   // crimson (zone.privacy)
  hardware:  "#3a5a7c",   // slate blue
  questions: "#6b6b6b",   // neutral grey
} as const;

export type ModuleKey = keyof typeof mod;

export const MODULE_META = [
  { id: 0, key: "audio"     as const, shortName: "Audio",      title: "Audio Capture & VAD",           num: "01" },
  { id: 1, key: "cloud"     as const, shortName: "Cloud",      title: "Cloud Analysis Pipeline",       num: "02" },
  { id: 2, key: "compress"  as const, shortName: "Compress",   title: "Context Compression Pipeline",  num: "03" },
  { id: 3, key: "consult"   as const, shortName: "Consult",    title: "Consultation Pipeline",         num: "04" },
  { id: 4, key: "glyph"     as const, shortName: "Glyphs",     title: "Glyph System",                  num: "05" },
  { id: 5, key: "companion" as const, shortName: "Companion",  title: "Companion App & Social",        num: "06" },
  { id: 6, key: "privacy"   as const, shortName: "Privacy",    title: "Privacy & Data Lifecycle",       num: "07" },
  { id: 7, key: "hardware"  as const, shortName: "Hardware",   title: "Hardware Platform",              num: "08" },
  { id: 8, key: "questions" as const, shortName: "Questions",  title: "Open Questions & Deferred",     num: "09" },
] as const;
