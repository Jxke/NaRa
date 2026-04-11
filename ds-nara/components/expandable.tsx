"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { colors, fonts, weights, spacing, radius, transitions, typography } from "../tokens";
import { GaugeBar } from "./data-display";
import { Label } from "./atoms";

/* ═══════════════════════════════════════════════════════════════════════════
   CHEVRON — shared animated expand indicator
   ═══════════════════════════════════════════════════════════════════════════ */

function Chevron({ open, hovered, size = 10 }: { open: boolean; hovered?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease, opacity 0.2s",
        opacity: hovered || open ? 0.5 : 0.2,
        flexShrink: 0,
      }}
    >
      <path
        d={`M${size * 0.25} ${size * 0.35}L${size * 0.5} ${size * 0.65}L${size * 0.75} ${size * 0.35}`}
        stroke={colors.ink}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPEC TAG — inline key-value pill used in expanded detail panels
   Extracted from 8+ identical usages across architecture-v5.
   ═══════════════════════════════════════════════════════════════════════════ */

interface SpecTagProps {
  label: string;
  value: string;
  style?: CSSProperties;
}

export function SpecTag({ label, value, style }: SpecTagProps) {
  return (
    <span
      style={{
        ...typography.stat,
        padding: `3px ${spacing.xs}px 2px`,
        borderRadius: radius.sm,
        border: `1px solid ${colors.rule}`,
        background: colors.inkFaint,
        color: colors.ink,
        fontWeight: weights.medium,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{label}</span>
      {value}
    </span>
  );
}

/** Render a flex-wrap row of SpecTags from key-value pairs. */
export function SpecTagRow({ specs, style }: { specs: readonly { k: string; v: string }[]; style?: CSSProperties }) {
  if (!specs.length) return null;
  return (
    <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap", ...style }}>
      {specs.map((s) => (
        <SpecTag key={s.k} label={s.k} value={s.v} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPEC ROW — label/value pair row with rule divider
   Used in BOM detail panels, summary cards, etc.
   ═══════════════════════════════════════════════════════════════════════════ */

interface SpecRowProps {
  label: string;
  value: string;
  color?: string;
  style?: CSSProperties;
}

export function SpecRow({ label, value, color, style }: SpecRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: `${spacing.xxs}px 0`,
        ...typography.stat,
        borderBottom: `1px solid ${colors.rule}`,
        ...style,
      }}
    >
      <span style={{ color: colors.ink3 }}>{label}</span>
      <span style={{ color: color ?? colors.ink, fontWeight: weights.medium }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPANDABLE ROW — click-to-expand row with chevron, label, and detail
   Consolidates BomCard, LaneStepRow, LaneFooterRow, VadCycleCard rows,
   and FreeRtosColumn rows into one reusable primitive.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ExpandableRowProps {
  /** Primary label text. */
  label: string;
  /** Secondary descriptive text under the label. */
  description?: string;
  /** Accent color for active-state label. */
  color?: string;
  /** Whether a bottom border is shown (false for last item). */
  bordered?: boolean;
  /** Content rendered when expanded. */
  children?: ReactNode;
  /** Additional right-side content (badges, timing, gauge, etc.). */
  right?: ReactNode;
  /** Left-side indicator: colored dot. */
  dot?: boolean;
  /** Background override when open. Defaults to `${color}04`. */
  openBg?: string;
  /** Override default padding. */
  padding?: string;
  /** Context provider value (passed to StepContext by consumer if needed). */
  style?: CSSProperties;
}

export function ExpandableRow({
  label,
  description,
  color = colors.ink,
  bordered = true,
  children,
  right,
  dot,
  openBg,
  padding,
  style,
}: ExpandableRowProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasDetail = !!children;

  return (
    <div
      onClick={hasDetail ? () => setOpen((o) => !o) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role={hasDetail ? "button" : undefined}
      aria-expanded={hasDetail ? open : undefined}
      tabIndex={hasDetail ? 0 : undefined}
      onKeyDown={hasDetail ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } } : undefined}
      style={{
        cursor: hasDetail ? "pointer" : "default",
        borderBottom: bordered ? `1px solid ${colors.rule}` : "none",
        background: open ? (openBg ?? `${color}04`) : hovered && hasDetail ? colors.inkFaint : "transparent",
        transition: "all 0.2s ease",
        overflow: "hidden",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, padding: padding ?? `${spacing.sm}px ${spacing.md}px` }}>
        {dot && (
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...typography.label, fontWeight: weights.medium, color: open ? color : colors.ink, lineHeight: 1.3, transition: "color 0.2s" }}>
            {label}
          </div>
          {description && (
            <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>
              {description}
            </div>
          )}
        </div>
        {right}
        {hasDetail && <Chevron open={open} hovered={hovered} />}
      </div>
      {open && children && (
        <div style={{ padding: `0 ${spacing.md}px ${spacing.md}px` }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPANDABLE LIST CARD — bordered card with header + expandable item rows
   Extracted from PowerBudgetCard, FreeRtosColumn, VadCycleCard pattern.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ExpandableListItem {
  label: string;
  description?: string;
  /** Expanded detail content. */
  detail?: ReactNode;
  /** Key-value spec tags shown below the detail. */
  specs?: readonly { k: string; v: string }[];
  /** Optional gauge percentage (0-100). */
  gauge?: number;
  /** Right-side content (timing labels, badges, etc.). */
  right?: ReactNode;
  /** Colored dot indicator. */
  dot?: boolean;
  /** Item accent color override (defaults to card color). */
  color?: string;
}

interface ExpandableListCardProps {
  title: string;
  subtitle?: string;
  color: string;
  /** Optional hero stat displayed below the title. */
  hero?: { value: string; sub: string };
  items: readonly ExpandableListItem[];
  style?: CSSProperties;
}

export function ExpandableListCard({ title, subtitle, color, hero, items, style }: ExpandableListCardProps) {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  return (
    <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", display: "flex", flexDirection: "column", ...style }}>
      {/* Header */}
      <div style={{ padding: `${spacing.sm}px ${spacing.md}px`, borderBottom: `1px solid ${colors.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.xs }}>
          <Label color={color} style={{ marginBottom: 0 }}>{title}</Label>
          {subtitle && <span style={{ ...typography.caption, color: colors.ink3 }}>{subtitle}</span>}
        </div>
        {hero && (
          <div style={{ display: "flex", alignItems: "baseline", gap: spacing.xs, marginTop: spacing.xs }}>
            <span style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: weights.light, color, lineHeight: 1 }}>{hero.value}</span>
            <span style={{ ...typography.label, color: colors.ink3 }}>{hero.sub}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ flex: 1 }}>
        {items.map((item, i) => {
          const isOpen = expandedItem === i;
          const itemColor = item.color ?? color;
          return (
            <div key={item.label} style={{ borderBottom: i < items.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
              <div
                onClick={() => setExpandedItem(isOpen ? null : i)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: spacing.xs, padding: `${spacing.sm}px ${spacing.md}px`, transition: "background 0.15s" }}
              >
                {item.dot && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: itemColor, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...typography.label, fontWeight: weights.medium, color: isOpen ? itemColor : colors.ink, lineHeight: 1.3 }}>{item.label}</div>
                  {item.description && (
                    <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{item.description}</div>
                  )}
                </div>
                {item.gauge !== undefined && (
                  <GaugeBar value={item.gauge} color={itemColor} height={3} style={{ width: 48, flexShrink: 0, marginLeft: spacing.sm }} />
                )}
                {item.right}
                <Chevron open={isOpen} hovered={false} />
              </div>
              {isOpen && item.detail && (
                <div style={{ padding: `0 ${spacing.md}px ${spacing.md}px` }}>
                  <div style={{ ...typography.body, color: colors.ink2, marginBottom: item.specs?.length ? spacing.xs : 0 }}>{item.detail}</div>
                  {item.specs && <SpecTagRow specs={item.specs} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PIPELINE STEP ROW — expandable step with colored dot, flow connector,
   optional timing badge, and spec tags. The flow connector sits on the
   border between steps, showing a tiny arrow + optional label.
   Extracted from architecture-v5 StepRow.
   ═══════════════════════════════════════════════════════════════════════════ */

interface FlowStep {
  /** Step name. */
  label: string;
  /** Short description. */
  detail: string;
  /** Dot + accent color. */
  color: string;
  /** Optional timing badge (right-aligned). */
  timing?: string;
  /** Expanded detail content. */
  expanded?: ReactNode;
  /** Key-value spec tags. */
  specs?: readonly { k: string; v: string }[];
  /** Label shown on the flow connector below this step. */
  flowLabel?: string;
  /** Additional content in expanded area (below specs). */
  extra?: ReactNode;
}

export type { FlowStep };

function PipelineStepRow({ step, isLast }: { step: FlowStep; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!step.expanded;

  return (
    <div
      onClick={hasDetail ? () => setOpen((o) => !o) : undefined}
      style={{
        position: "relative",
        padding: `${spacing.xs + 12}px ${spacing.sm}px ${spacing.xs + 8}px`,
        borderBottom: isLast ? "none" : `1px solid ${colors.rule}`,
        cursor: hasDetail ? "pointer" : "default",
        transition: "background 0.15s",
      }}
    >
      {/* Flow connector on bottom border */}
      {!isLast && (
        <div style={{
          position: "absolute",
          bottom: -1,
          left: spacing.sm + spacing.xs + 3 - 4,
          display: "flex",
          alignItems: "center",
          gap: 3,
          background: colors.bg,
          padding: `0 ${spacing.xxs}px`,
          transform: "translateY(50%)",
          zIndex: 1,
        }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M4 1L4 6M2.5 4.5L4 6.5L5.5 4.5" stroke={step.color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          </svg>
          {step.flowLabel && (
            <span style={{ ...typography.label, fontSize: 8, color: colors.ink3, whiteSpace: "nowrap" }}>{step.flowLabel}</span>
          )}
        </div>
      )}
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: spacing.xs }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: step.color, opacity: open ? 0.9 : 0.55, flexShrink: 0, transition: "opacity 0.15s" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...typography.label, fontWeight: weights.medium, color: step.color, lineHeight: 1.3 }}>{step.label}</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{step.detail}</div>
        </div>
        {step.timing && (
          <div style={{ ...typography.label, color: colors.ink3, background: colors.inkSubtle, padding: `2px ${spacing.xs - 2}px`, borderRadius: radius.sm, whiteSpace: "nowrap", flexShrink: 0 }}>{step.timing}</div>
        )}
        {hasDetail && <Chevron open={open} />}
      </div>
      {/* Expanded content */}
      {open && step.expanded && (
        <div style={{ marginTop: spacing.xs, paddingLeft: 6 + spacing.xs }}>
          <div style={{ ...typography.body, color: colors.ink2, marginBottom: step.specs?.length ? spacing.xs : 0 }}>{step.expanded}</div>
          {step.specs && <SpecTagRow specs={step.specs} />}
          {step.extra}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PIPELINE CARD — bordered card with header + pipeline step rows
   Extracted from architecture-v5 PipelineCard + SystemDataFlow.
   ═══════════════════════════════════════════════════════════════════════════ */

interface PipelineCardProps {
  /** Pipeline title. */
  title: string;
  /** Short pipeline description. */
  description: string;
  /** Accent color for the step count. */
  accent: string;
  /** Ordered list of pipeline steps. */
  steps: readonly FlowStep[];
  style?: CSSProperties;
}

export function PipelineCard({ title, description, accent, steps, style }: PipelineCardProps) {
  return (
    <div
      style={{
        border: `1px solid ${colors.rule}`,
        borderRadius: radius.sm,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ padding: `${spacing.md}px ${spacing.md}px ${spacing.sm}px`, display: "flex", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...typography.h2, fontSize: 20, marginBottom: spacing.xxs }}>{title}</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.5 }}>{description}</div>
        </div>
        <div style={{ ...typography.h2, fontSize: 24, color: accent, opacity: 0.35, lineHeight: 1, flexShrink: 0 }}>{steps.length}</div>
      </div>

      {/* Steps */}
      <div style={{ borderTop: `1px solid ${colors.rule}`, flex: 1 }}>
        {steps.map((step, i) => (
          <PipelineStepRow key={step.label} step={step} isLast={i === steps.length - 1} />
        ))}
      </div>
    </div>
  );
}
