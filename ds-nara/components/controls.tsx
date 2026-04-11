"use client";

import { type ReactNode, useState } from "react";
import { colors, fonts, typography, radius, transitions } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   FILTER PILLS
   ═══════════════════════════════════════════════════════════════════════════ */

interface FilterPillsProps {
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
  allLabel?: string;
}

export function FilterPills({
  options,
  value,
  onChange,
  allLabel = "All",
}: FilterPillsProps) {
  return (
    <div role="radiogroup" aria-label="Filter options" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <FilterButton active={value === null} onClick={() => onChange(null)}>
        {allLabel}
      </FilterButton>
      {options.map((opt) => (
        <FilterButton
          key={opt}
          active={value === opt}
          onClick={() => onChange(opt)}
        >
          {opt}
        </FilterButton>
      ))}
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      role="radio"
      aria-checked={active}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 11px",
        border: `1px solid ${active ? colors.ink : hovered ? colors.ink3 : colors.rule}`,
        background: active ? colors.ink : hovered ? colors.inkFaint : "transparent",
        color: active ? colors.bg : colors.ink2,
        fontFamily: fonts.mono,
        fontSize: "9px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        borderRadius: radius.sm,
        transition: transitions.fast,
        outline: "none",
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SORT CONTROLS
   ═══════════════════════════════════════════════════════════════════════════ */

interface SortControlsProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export function SortControls({ options, value, onChange }: SortControlsProps) {
  return (
    <div role="radiogroup" aria-label="Sort options" style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <span style={{ ...typography.label, color: colors.ink2 }}>Sort by</span>
      {options.map((opt) => (
        <SortButton
          key={opt.key}
          active={value === opt.key}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </SortButton>
      ))}
    </div>
  );
}

function SortButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      role="radio"
      aria-checked={active}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: "9px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        color: active ? colors.ink : hovered ? colors.ink : colors.ink2,
        background: "none",
        border: "none",
        fontFamily: fonts.mono,
        padding: 0,
        borderBottom: `1px solid ${active ? colors.ink : hovered ? colors.ink3 : "transparent"}`,
        transition: transitions.fast,
        outline: "none",
        fontWeight: active ? 500 : 400,
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAV PILL
   ═══════════════════════════════════════════════════════════════════════════ */

interface NavPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavPill({ label, active, onClick }: NavPillProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "5px 10px",
        border: "none",
        borderRadius: radius.sm,
        background: active
          ? colors.inkSubtle
          : hovered
            ? colors.inkFaint
            : "transparent",
        color: active ? colors.ink : colors.ink2,
        fontFamily: fonts.mono,
        fontSize: "9.5px",
        letterSpacing: "0.04em",
        cursor: "pointer",
        transition: transitions.fast,
        fontWeight: active ? 500 : 400,
        outline: "none",
      }}
    >
      {label}
    </button>
  );
}
