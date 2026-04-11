"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { colors, fonts, spacing, radius, transitions, typography, weights } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS BADGE — colored dot + uppercase label, optional variant tinting
   The canonical dot+label pattern used across cockpit-v2 (session status,
   deploy state, ticket type, etc.).
   ═══════════════════════════════════════════════════════════════════════════ */

export type StatusBadgeTone = "neutral" | "help" | "harm" | "amber" | "muted";

interface StatusBadgeProps {
  /** Label text (auto-uppercased via typography.label). */
  label: string;
  /** Color tone — chooses dot and label color. */
  tone?: StatusBadgeTone;
  /** Override dot color (wins over tone). */
  dotColor?: string;
  /** Animate the marker with a soft pulse. */
  pulse?: boolean;
  /** Render as a full pill with tinted background instead of inline dot+label. */
  filled?: boolean;
  /**
   * NaRa marker glyph. When provided, replaces the dot with a typographic
   * symbol rendered in the mono/pixel face. Meaning is carried by shape
   * (☑ / ☒ / ◯ / ◇ / ◌) rather than color.
   */
  glyph?: string;
  style?: CSSProperties;
}

const TONE_COLORS: Record<StatusBadgeTone, { dot: string; text: string; bg: string; border: string }> = {
  neutral: { dot: colors.ink2, text: colors.ink2, bg: colors.inkSubtle, border: colors.rule },
  help: { dot: colors.help, text: colors.help, bg: colors.helpFaint, border: colors.helpBorder },
  harm: { dot: colors.harm, text: colors.harm, bg: colors.harmFaint, border: colors.harmBorder },
  amber: { dot: colors.amber, text: colors.amber, bg: colors.inkFaint, border: colors.amberBorder },
  muted: { dot: colors.ink3, text: colors.ink3, bg: colors.inkFaint, border: colors.rule },
};

const TONE_TO_GLYPH: Record<StatusBadgeTone, string> = {
  neutral: "◯",
  help: "☑",
  harm: "☒",
  amber: "◌",
  muted: "◇",
};

export function StatusBadge({
  label,
  tone = "neutral",
  dotColor: _dotColor,
  pulse = false,
  filled = false,
  glyph,
  style,
}: StatusBadgeProps) {
  const scheme = TONE_COLORS[tone];
  const marker = glyph ?? TONE_TO_GLYPH[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spacing.xs + 2,
        padding: filled ? "5px 8px 4px" : 0,
        background: filled ? scheme.bg : "transparent",
        border: filled ? `1px solid ${scheme.border}` : "none",
        borderRadius: filled ? radius.sm : 0,
        lineHeight: 1,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          fontFamily: fonts.serif,
          fontSize: 14,
          lineHeight: 1,
          color: scheme.text,
          display: "inline-block",
          minWidth: 12,
          textAlign: "center",
          flexShrink: 0,
          animation: pulse ? "cockpit-pulse 2s ease-in-out infinite" : "none",
        }}
      >
        {marker}
      </span>
      <span style={{ ...typography.label, color: scheme.text, lineHeight: 1 }}>{label}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   KBD — keyboard shortcut hint
   Renders a single key or combo like Cmd+K in a subtle bordered pill.
   ═══════════════════════════════════════════════════════════════════════════ */

interface KbdProps {
  /** Key or combo as single string ("Cmd+K") or array of keys. */
  children: string | string[];
  /** Dimmer variant for secondary hints. */
  muted?: boolean;
  style?: CSSProperties;
}

export function Kbd({ children, muted = false, style }: KbdProps) {
  const keys = Array.isArray(children) ? children : children.split("+").map((k) => k.trim());
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, ...style }}>
      {keys.map((key, i) => (
        <span
          key={i}
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            lineHeight: 1,
            padding: "3px 5px 2px",
            background: muted ? "transparent" : colors.inkFaint,
            border: `1px solid ${colors.rule}`,
            borderRadius: radius.sm,
            color: muted ? colors.ink3 : colors.ink2,
            minWidth: 16,
            textAlign: "center",
          }}
        >
          {key}
        </span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI STAT — small label-over-value pair
   For dashboard stat rows, header metadata, inline metrics.
   Numeric values in mono, labels in uppercase mono (label token).
   ═══════════════════════════════════════════════════════════════════════════ */

interface MiniStatProps {
  label: string;
  value: string;
  /** Override the value color. */
  valueColor?: string;
  style?: CSSProperties;
}

export function MiniStat({ label, value, valueColor, style }: MiniStatProps) {
  return (
    <div style={style}>
      <div style={{ ...typography.label, color: colors.ink3, marginBottom: spacing.xs }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 13,
          fontWeight: 700,
          color: valueColor ?? colors.ink,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLLAPSIBLE — disclosure panel with title + chevron + optional count
   For sidebars, settings panels, accordion layouts.
   ═══════════════════════════════════════════════════════════════════════════ */

interface CollapsibleProps {
  title: string;
  /** Show count badge next to the title. */
  count?: number;
  /** Initial open state. Default: true. */
  defaultOpen?: boolean;
  /** Show a border below the header+content. Default: true. */
  bordered?: boolean;
  children: ReactNode;
}

export function Collapsible({
  title,
  count,
  defaultOpen = true,
  bordered = true,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ borderBottom: bordered ? `1px solid ${colors.rule}` : "none" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-expanded={open}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: `${spacing.xs + 2}px ${spacing.md}px`,
          background: hovered ? colors.inkFaint : "transparent",
          transition: transitions.fast,
          boxSizing: "border-box",
        }}
      >
        <span style={{ ...typography.caption, fontWeight: weights.bold }}>
          {title}
          {count !== undefined && count > 0 && (
            <span style={{ color: colors.ink3, fontWeight: weights.regular, marginLeft: spacing.xs }}>
              {count}
            </span>
          )}
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: colors.ink3,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: transitions.fast,
            display: "inline-block",
          }}
        >
          ▸
        </span>
      </button>
      {open && (
        <div style={{ padding: `${spacing.xs}px ${spacing.md}px ${spacing.md}px` }}>{children}</div>
      )}
    </div>
  );
}
