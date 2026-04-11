/* ─── NaRa Design Tokens ─────────────────────────────────────────────────
 * Black-on-white ePaper palette. PP Mondwest (display) + PP NeueBit (mono/UI).
 * Shape mirrors app/ds/tokens.ts so shared components re-theme automatically.
 * ──────────────────────────────────────────────────────────────────────── */

export const colors = {
  bg: "#ffffff",
  ink: "#000000",
  ink2: "rgba(0,0,0,0.78)",
  ink3: "rgba(0,0,0,0.54)",
  inkHover: "rgba(0,0,0,0.05)",
  inkSubtle: "rgba(0,0,0,0.07)",
  inkFaint: "rgba(0,0,0,0.035)",
  // NaRa guideline: no accent color. Semantic slots collapse to B/W.
  harm: "#000000",
  help: "#000000",
  amber: "#000000",
  harmFaint: "rgba(0,0,0,0.06)",
  helpFaint: "rgba(0,0,0,0.06)",
  harmBorder: "rgba(0,0,0,0.4)",
  helpBorder: "rgba(0,0,0,0.4)",
  amberBorder: "rgba(0,0,0,0.4)",
  harmBg: "rgba(0,0,0,0.04)",
  helpBg: "rgba(0,0,0,0.04)",
  amberBg: "rgba(0,0,0,0.04)",
  rule: "rgba(0,0,0,0.18)",
  ruleStrong: "#000000",
  centerLine: "rgba(0,0,0,0.2)",
  textMuted: "rgba(0,0,0,0.62)",
  textFaded: "rgba(0,0,0,0.5)",
} as const;

/** Inverted palette for rare dark surfaces (tooltips, highlight blocks). */
export const invertedColors = {
  textMuted: "rgba(255,255,255,0.62)",
  textSubtle: "rgba(255,255,255,0.74)",
  border: "rgba(255,255,255,0.2)",
} as const;

/** Categories collapse to pure B/W to respect the guideline. */
export const categoryColors = {
  Cognitive: "#000000",
  Emotional: "#000000",
  Social: "#000000",
  Health: "#000000",
  Economic: "#000000",
  Civic: "#000000",
} as const;

export type CategoryName = keyof typeof categoryColors;

export const fonts = {
  serif: "'PP Mondwest', ui-serif, Georgia, serif",
  mono: "'PP NeueBit', ui-monospace, 'IBM Plex Mono', monospace",
  display: "'PP Mondwest', ui-serif, Georgia, serif",
  sans: "'PP NeueBit', ui-monospace, 'IBM Plex Mono', monospace",
} as const;

/** NeueBit ships Bold; Mondwest ships Regular. Weight scale stays two-stop. */
export const weights = {
  light: 400,
  regular: 400,
  medium: 700,
  bold: 700,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 36,
  xxl: 48,
} as const;

/** NaRa is ePaper hard-edged. Everything is square. */
export const radius = {
  none: 0,
  sm: 0,
  md: 0,
  lg: 0,
} as const;

export const borders = {
  rule: `1px solid rgba(0,0,0,0.18)`,
  heavyRule: `1.5px solid #000000`,
} as const;

export const shadows = {
  tooltip: "0 0 0 1px #000000",
} as const;

export const transitions = {
  fast: "all 0.12s",
} as const;

/** Shared 3-column grid for data table components. */
export const TABLE_GRID = "180px 1fr 80px";

/* ─── Typography ─────────────────────────────────────────────────────────
 * NaRa guideline (from Figma 1:2):
 *   Display / H1 / Body   → Mondwest Regular, 32–128 / 24–96 / 12–20
 *   H2 / Body / Caption   → NeueBit Bold, 0.63×H1 / 9–16 / 6–12
 *   All-caps: Display ☒, H1 ☒, Body ☒, H2 ☑, Body ☒, Caption ☑
 * ──────────────────────────────────────────────────────────────────────── */

export const typography = {
  title: {
    fontFamily: fonts.serif,
    fontSize: "clamp(64px, 10vw, 128px)",
    fontWeight: 400,
    lineHeight: 0.95,
    color: colors.ink,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: "16px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: colors.ink,
    fontWeight: 700,
  },
  h1: {
    fontFamily: fonts.serif,
    fontSize: "clamp(48px, 6vw, 96px)",
    fontWeight: 400,
    lineHeight: 1.0,
    color: colors.ink,
  },
  h2: {
    fontFamily: fonts.mono,
    fontSize: "clamp(30px, 3.78vw, 60px)",
    fontWeight: 700,
    lineHeight: 1.0,
    letterSpacing: "0.02em",
    textTransform: "uppercase" as const,
    color: colors.ink,
  },
  h3: {
    fontFamily: fonts.mono,
    fontSize: "24px",
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: "0.02em",
    textTransform: "uppercase" as const,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.serif,
    fontSize: "18px",
    color: colors.ink,
    lineHeight: 1.35,
    fontWeight: 400,
    letterSpacing: "0",
  },
  bodySmall: {
    fontFamily: fonts.mono,
    fontSize: "14px",
    color: colors.ink,
    lineHeight: 1.3,
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  caption: {
    fontFamily: fonts.mono,
    fontSize: "12px",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: colors.ink,
    fontWeight: 700,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
  },
  stat: {
    fontFamily: fonts.mono,
    fontSize: "14px",
    fontWeight: 700,
  },
} as const;
