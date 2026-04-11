import { type ReactNode } from "react";
import { colors, fonts, borders } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   LEGEND
   Markers are typographic glyphs, not color swatches. NaRa encodes legend
   meaning through shape (●, ○, ■, ◇, ▲ …) instead of hue.
   ═══════════════════════════════════════════════════════════════════════════ */

interface LegendItem {
  label: string;
  /** Legacy color field — retained for back-compat, visually ignored. */
  color?: string;
  /** Bitmap marker glyph (defaults alternate ● / ○ by index). */
  glyph?: string;
}

interface LegendProps {
  items: LegendItem[];
}

const DEFAULT_MARKERS = ["●", "○", "■", "□", "◆", "◇"];

export function Legend({ items }: LegendProps) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 9,
            color: colors.ink2,
            fontFamily: fonts.mono,
          }}
        >
          <span
            aria-hidden
            style={{
              fontFamily: fonts.serif,
              fontSize: 13,
              lineHeight: 1,
              color: colors.ink,
              display: "inline-block",
              minWidth: 11,
              textAlign: "center",
            }}
          >
            {item.glyph ?? DEFAULT_MARKERS[i % DEFAULT_MARKERS.length]}
          </span>
          {item.label}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   META FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */

export function MetaFooter({
  legend,
  source,
}: {
  legend?: ReactNode;
  source?: string;
}) {
  return (
    <div
      style={{
        marginTop: 28,
        display: "flex",
        alignItems: "flex-start",
        gap: 24,
        flexWrap: "wrap",
        paddingTop: 14,
        borderTop: borders.rule,
      }}
    >
      {legend && <div>{legend}</div>}
      {source && (
        <div
          style={{
            fontSize: "8.5px",
            color: colors.ink3,
            lineHeight: 1.7,
            maxWidth: 360,
            marginLeft: "auto",
            fontFamily: fonts.mono,
          }}
        >
          {source}
        </div>
      )}
    </div>
  );
}
