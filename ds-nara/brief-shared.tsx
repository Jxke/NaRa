"use client";

import { type ReactNode, type CSSProperties } from "react";
import { colors, weights, spacing, radius, typography } from "./tokens";
import { Caption } from "./components";

export function FlowArrow({
  label,
  direction = "down",
  color = colors.ink3,
}: {
  label?: string;
  direction?: "down" | "right" | "bidirectional";
  color?: string;
}) {
  const isHoriz = direction === "right";
  const isBidi = direction === "bidirectional";
  const w = isHoriz ? 28 : 14;
  const h = isHoriz ? 14 : 28;

  return (
    <div style={{ display: "flex", flexDirection: isHoriz ? "row" : "column", alignItems: "center", justifyContent: "center", gap: spacing.xxs, padding: isHoriz ? `0 ${spacing.xxs}px` : `${spacing.xxs}px 0` }}>
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

export function NodeBox({
  label,
  sublabel,
  color = colors.ink,
  dashed,
  children,
  style,
}: {
  label: string;
  sublabel?: string;
  color?: string;
  dashed?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        padding: `${spacing.sm}px ${spacing.md}px`,
        borderRadius: radius.sm,
        border: `1px ${dashed ? "dashed" : "solid"} ${color}40`,
        background: `${color}06`,
        ...style,
      }}
    >
      <div style={{ ...typography.label, fontWeight: weights.medium, color, marginBottom: sublabel || children ? spacing.xxs : 0 }}>
        {label}
      </div>
      {sublabel && <div style={{ ...typography.caption, color: colors.ink3 }}>{sublabel}</div>}
      {children}
    </div>
  );
}

export function Chip({ children, color = colors.ink2 }: { children: string; color?: string }) {
  return (
    <span style={{ ...typography.label, padding: `${spacing.xxs}px ${spacing.xs}px`, borderRadius: radius.sm, border: `1px solid ${color}30`, background: `${color}08`, color, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
