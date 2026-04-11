"use client";

import { type CSSProperties, type ReactNode } from "react";
import { colors, spacing, radius, typography } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   CHIP — small colored pill for inline labeling
   Extracted from architecture-v5 Chip component.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ChipProps {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}

export function Chip({ children, color = colors.ink2, style }: ChipProps) {
  return (
    <span
      style={{
        ...typography.label,
        padding: `${spacing.xxs}px ${spacing.xs}px`,
        borderRadius: radius.sm,
        border: `1px solid ${color}30`,
        background: `${color}08`,
        color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NODE BOX — bordered container with label, optional sublabel, tinted bg
   Used in architecture diagrams for service/component nodes.
   ═══════════════════════════════════════════════════════════════════════════ */

interface NodeBoxProps {
  label: string;
  sublabel?: string;
  color?: string;
  dashed?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}

export function NodeBox({ label, sublabel, color = colors.ink, dashed, children, style }: NodeBoxProps) {
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
      <div
        style={{
          ...typography.label,
          fontWeight: 700,
          color,
          marginBottom: sublabel || children ? spacing.xxs : 0,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div style={{ ...typography.caption, color: colors.ink3 }}>{sublabel}</div>
      )}
      {children}
    </div>
  );
}
