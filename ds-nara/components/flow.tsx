"use client";

import { type CSSProperties } from "react";
import { colors, fonts, weights, spacing, typography } from "../tokens";
import { Caption } from "./typography";

/* ═══════════════════════════════════════════════════════════════════════════
   ZONE LABEL — colored dot + caption text
   Used as section headers in architecture diagrams.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ZoneLabelProps {
  color: string;
  children: string;
  style?: CSSProperties;
}

export function ZoneLabel({ color, children, style }: ZoneLabelProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm, ...style }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <Caption style={{ color, fontWeight: weights.medium }}>{children}</Caption>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FLOW ARROW — directional SVG arrow with optional label
   Used between architecture components to show data flow.
   ═══════════════════════════════════════════════════════════════════════════ */

type FlowDirection = "down" | "right" | "bidirectional";

interface FlowArrowProps {
  label?: string;
  direction?: FlowDirection;
  color?: string;
  style?: CSSProperties;
}

export function FlowArrow({ label, direction = "down", color = colors.ink3, style }: FlowArrowProps) {
  const isHoriz = direction === "right";
  const isBidi = direction === "bidirectional";
  const w = isHoriz ? 28 : 14;
  const h = isHoriz ? 14 : 28;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isHoriz ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xxs,
        padding: isHoriz ? `0 ${spacing.xxs}px` : `${spacing.xxs}px 0`,
        ...style,
      }}
    >
      {label && !isHoriz && <Caption style={{ color }}>{label}</Caption>}
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ flexShrink: 0 }}>
        {isHoriz ? (
          <>
            <line x1={0} y1={7} x2={22} y2={7} stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />
            <path d="M18 3L24 7L18 11" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
          </>
        ) : isBidi ? (
          <>
            <line x1={7} y1={6} x2={7} y2={22} stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />
            <path d="M3 8L7 2L11 8" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
            <path d="M3 20L7 26L11 20" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
          </>
        ) : (
          <>
            <line x1={7} y1={0} x2={7} y2={22} stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />
            <path d="M3 18L7 24L11 18" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
          </>
        )}
      </svg>
      {label && isHoriz && <Caption style={{ color }}>{label}</Caption>}
    </div>
  );
}
