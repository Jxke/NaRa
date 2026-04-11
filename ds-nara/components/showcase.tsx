/** Showcase-only components — used to document the design system, not part of the library itself. */

import { type CSSProperties, type ReactNode } from "react";
import { colors, fonts, typography, radius, borders } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   CODE BLOCK
   ═══════════════════════════════════════════════════════════════════════════ */

/** Renders a code snippet. Accepts only string children (intentional — JSX not supported). */
export function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        background: colors.ink,
        color: colors.bg,
        fontFamily: fonts.mono,
        fontSize: "10px",
        lineHeight: 1.7,
        padding: "14px 18px",
        borderRadius: radius.md,
        overflow: "auto",
        whiteSpace: "pre-wrap",
        marginTop: 12,
      }}
    >
      <code>{children}</code>
    </pre>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREVIEW BOX
   ═══════════════════════════════════════════════════════════════════════════ */

export function PreviewBox({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        border: borders.rule,
        borderRadius: radius.md,
        padding: "24px",
        marginTop: 12,
        marginBottom: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLOR SWATCH CARD
   ═══════════════════════════════════════════════════════════════════════════ */

export function ColorCard({
  name,
  value,
  textColor,
}: {
  name: string;
  value: string;
  textColor?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          width: 72,
          height: 48,
          borderRadius: radius.md,
          background: value,
          border: borders.rule,
          display: "flex",
          alignItems: "flex-end",
          padding: 6,
        }}
      >
        <span
          style={{
            fontSize: 7,
            fontFamily: fonts.mono,
            color: textColor ?? colors.bg,
            opacity: 0.7,
          }}
        >
          {value}
        </span>
      </div>
      <span
        style={{
          fontSize: 8,
          fontFamily: fonts.mono,
          color: colors.ink2,
          letterSpacing: "0.08em",
        }}
      >
        {name}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROP TABLE
   ═══════════════════════════════════════════════════════════════════════════ */

interface PropDef {
  name: string;
  type: string;
  default?: string;
  description: string;
}

export function PropTable({ props }: { props: PropDef[] }) {
  return (
    <div style={{ marginTop: 12, overflow: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: fonts.mono,
          fontSize: 9,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: borders.heavyRule,
              textAlign: "left",
            }}
          >
            <th style={{ padding: "6px 12px 6px 0", ...typography.caption }}>
              Prop
            </th>
            <th style={{ padding: "6px 12px", ...typography.caption }}>Type</th>
            <th style={{ padding: "6px 12px", ...typography.caption }}>
              Default
            </th>
            <th style={{ padding: "6px 12px", ...typography.caption }}>
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr
              key={p.name}
              style={{ borderBottom: borders.rule }}
            >
              <td
                style={{
                  padding: "6px 12px 6px 0",
                  color: colors.ink,
                  fontWeight: 700,
                }}
              >
                {p.name}
              </td>
              <td style={{ padding: "6px 12px", color: colors.harm }}>
                {p.type}
              </td>
              <td style={{ padding: "6px 12px", color: colors.ink3 }}>
                {p.default ?? "\u2014"}
              </td>
              <td style={{ padding: "6px 12px", color: colors.ink2 }}>
                {p.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
