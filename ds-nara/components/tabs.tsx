"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { colors, fonts, spacing, radius, transitions, typography } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   TABS — horizontal underline tabs
   Classic tab-switcher for panels. Underline marks active.
   ═══════════════════════════════════════════════════════════════════════════ */

interface TabsProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  /** Distribute tabs equally across available width. Default false (natural width). */
  fullWidth?: boolean;
}

export function Tabs({ options, value, onChange, fullWidth = false }: TabsProps) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        borderBottom: `1px solid ${colors.rule}`,
      }}
    >
      {options.map((opt) => (
        <TabButton
          key={opt.key}
          active={value === opt.key}
          onClick={() => onChange(opt.key)}
          fullWidth={fullWidth}
        >
          {opt.label}
        </TabButton>
      ))}
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  fullWidth,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  fullWidth: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...typography.label,
        flex: fullWidth ? 1 : "initial",
        textAlign: "center",
        padding: `${spacing.sm}px ${spacing.md}px`,
        background: "none",
        border: "none",
        borderBottom: `2px solid ${
          active ? colors.ink : hovered ? colors.ink3 : "transparent"
        }`,
        marginBottom: -1,
        color: active ? colors.ink : hovered ? colors.ink : colors.ink2,
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
        transition: transitions.fast,
        outline: "none",
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SEGMENTED CONTROL — grouped container with filled active segment
   Higher visual weight. Use for 2-3 mutually-exclusive options.
   ═══════════════════════════════════════════════════════════════════════════ */

interface SegmentedControlProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      style={{
        display: "inline-flex",
        padding: 1,
        border: `1px solid ${colors.rule}`,
        borderRadius: radius.sm,
        background: colors.inkFaint,
      }}
    >
      {options.map((opt) => (
        <SegmentButton
          key={opt.key}
          active={value === opt.key}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </SegmentButton>
      ))}
    </div>
  );
}

function SegmentButton({
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
        ...typography.label,
        padding: `${spacing.xs}px ${spacing.sm + spacing.xs}px`,
        background: active
          ? colors.bg
          : hovered
            ? colors.inkSubtle
            : "transparent",
        color: active ? colors.ink : colors.ink2,
        fontWeight: active ? 500 : 400,
        border: `1px solid ${active ? colors.rule : "transparent"}`,
        borderRadius: radius.sm,
        cursor: "pointer",
        transition: transitions.fast,
        outline: "none",
        boxShadow: active ? "0 1px 2px rgba(26,22,18,0.04)" : "none",
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEXT TABS — ultra-minimal inline text switcher
   No container, no underlines, just color-weight shift on active.
   Use in tight headers where visual noise must be minimal.
   ═══════════════════════════════════════════════════════════════════════════ */

interface TextTabsProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export function TextTabs({ options, value, onChange }: TextTabsProps) {
  return (
    <div
      role="tablist"
      style={{ display: "inline-flex", gap: spacing.md, alignItems: "center" }}
    >
      {options.map((opt) => (
        <TextTabButton
          key={opt.key}
          active={value === opt.key}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </TextTabButton>
      ))}
    </div>
  );
}

function TextTabButton({
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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...typography.label,
        padding: 0,
        background: "none",
        border: "none",
        color: active ? colors.ink : hovered ? colors.ink2 : colors.ink3,
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
        transition: transitions.fast,
        outline: "none",
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICON TABS — square icon-only buttons
   For vertical toolbars or dense horizontal bars.
   ═══════════════════════════════════════════════════════════════════════════ */

interface IconTabsProps {
  options: { key: string; icon: ReactNode; label: string }[];
  value: string;
  onChange: (key: string) => void;
  /** Layout orientation. Default horizontal. */
  orientation?: "horizontal" | "vertical";
}

export function IconTabs({
  options,
  value,
  onChange,
  orientation = "horizontal",
}: IconTabsProps) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        flexDirection: orientation === "vertical" ? "column" : "row",
        gap: 2,
        padding: 2,
        border: `1px solid ${colors.rule}`,
        borderRadius: radius.sm,
        background: colors.inkFaint,
      }}
    >
      {options.map((opt) => (
        <IconTabButton
          key={opt.key}
          active={value === opt.key}
          onClick={() => onChange(opt.key)}
          ariaLabel={opt.label}
        >
          {opt.icon}
        </IconTabButton>
      ))}
    </div>
  );
}

function IconTabButton({
  children,
  active,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      role="tab"
      aria-label={ariaLabel}
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 28,
        height: 28,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: active
          ? colors.bg
          : hovered
            ? colors.inkSubtle
            : "transparent",
        color: active ? colors.ink : colors.ink2,
        border: `1px solid ${active ? colors.rule : "transparent"}`,
        borderRadius: radius.sm,
        cursor: "pointer",
        transition: transitions.fast,
        outline: "none",
        boxShadow: active ? "0 1px 2px rgba(26,22,18,0.04)" : "none",
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TABS WITH COUNT — horizontal tabs that display a numeric badge
   Common in email clients, ticket lists, inbox views.
   ═══════════════════════════════════════════════════════════════════════════ */

interface TabsWithCountProps {
  options: { key: string; label: string; count: number }[];
  value: string;
  onChange: (key: string) => void;
}

export function TabsWithCount({
  options,
  value,
  onChange,
}: TabsWithCountProps) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        borderBottom: `1px solid ${colors.rule}`,
      }}
    >
      {options.map((opt) => (
        <CountTabButton
          key={opt.key}
          active={value === opt.key}
          onClick={() => onChange(opt.key)}
          count={opt.count}
        >
          {opt.label}
        </CountTabButton>
      ))}
    </div>
  );
}

function CountTabButton({
  children,
  active,
  onClick,
  count,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spacing.xs + 2,
        padding: `${spacing.sm}px ${spacing.md}px`,
        background: "none",
        border: "none",
        borderBottom: `2px solid ${
          active ? colors.ink : hovered ? colors.ink3 : "transparent"
        }`,
        marginBottom: -1,
        color: active ? colors.ink : hovered ? colors.ink : colors.ink2,
        cursor: "pointer",
        transition: transitions.fast,
        outline: "none",
      }}
    >
      <span
        style={{
          ...typography.label,
          fontWeight: active ? 500 : 400,
          color: "inherit",
        }}
      >
        {children}
      </span>
      <span
        style={{
          ...typography.stat,
          color: active ? colors.ink : colors.ink3,
          background: active ? colors.inkSubtle : colors.inkFaint,
          padding: "2px 6px",
          borderRadius: radius.sm,
          lineHeight: 1,
          minWidth: 16,
          textAlign: "center",
        }}
      >
        {count}
      </span>
    </button>
  );
}
