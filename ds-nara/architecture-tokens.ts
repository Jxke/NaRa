/** Domain colors for the architecture visualization zones.
 *  Tuned for contrast on the DS warm paper background (#f5f0e8). */
export const zone = {
  device: "#2a6490",     // was #3a7ca5 — deeper teal-blue
  cloud: "#7b3fa6",      // was #9b59b6 — deeper purple
  app: "#b85c1a",        // was #d97a3a — deeper burnt orange
  social: "#1a7a42",     // was #27ae60 — deeper forest green
  privacy: "#a12e22",    // was #c0392b — deeper crimson
  audio: "#3568b2",      // was #5b8dd9 — deeper steel blue
  storage: "#6b4d04",    // was #866005 — deeper amber-brown
  glyph: "#8b5e3c",      // warm sienna — symbolic/artistic
} as const;
