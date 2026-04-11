"use client";

import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { colors, fonts, radius, borders, transitions } from "../tokens";
import { Button, Card, Label, Counter, ContentDivider } from "./atoms";

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS DOTS — horizontal step indicator with color-coded active state
   ═══════════════════════════════════════════════════════════════════════════ */

interface ProgressDotsProps {
  total: number;
  current: number;
  onChange: (index: number) => void;
  /** Per-step accent color. Falls back to ink. */
  colors?: string[];
  /** Per-step label. Shown at the right end. */
  labels?: string[];
  /** Compact mode strips outer margin, padding, and border (for use inside a footer bar). */
  compact?: boolean;
}

export function ProgressDots({
  total,
  current,
  onChange,
  colors: dotColors,
  labels,
  compact = false,
}: ProgressDotsProps) {
  return (
    <div
      role="tablist"
      aria-label="Progress"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        ...(compact
          ? {}
          : {
              marginBottom: 32,
              paddingBottom: 16,
              borderBottom: borders.heavyRule,
            }),
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current;
        const accentColor = dotColors?.[i] ?? colors.ink;
        return (
          <button
            key={i}
            role="tab"
            aria-selected={isActive}
            aria-label={labels?.[i] ?? `Step ${i + 1}`}
            onClick={() => onChange(i)}
            style={{
              width: isActive ? 40 : 24,
              height: 2,
              borderRadius: 0,
              background: isActive ? accentColor : colors.ink3,
              cursor: "pointer",
              border: "none",
              padding: 0,
              transition: "width 0.3s, background 0.3s",
            }}
          />
        );
      })}
      {labels?.[current] && (
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: dotColors?.[current] ?? colors.ink2,
            marginLeft: 12,
            fontWeight: 400,
          }}
        >
          {labels[current]}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SLIDE CAROUSEL — fade+slide transitions between panels
   ═══════════════════════════════════════════════════════════════════════════ */

interface SlideCarouselProps {
  current: number;
  children: ReactNode[];
  /** Minimum height to prevent layout shift. Default 340. */
  minHeight?: number;
}

export function SlideCarousel({
  current,
  children,
  minHeight = 340,
}: SlideCarouselProps) {
  return (
    <div role="tabpanel" style={{ position: "relative", minHeight }}>
      {children.map((child, i) => (
        <div
          key={i}
          style={{
            position: i === current ? "relative" : "absolute",
            top: 0,
            left: 0,
            right: 0,
            opacity: i === current ? 1 : 0,
            transform: i === current ? "translateY(0)" : "translateY(12px)",
            pointerEvents: i === current ? "auto" : "none",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SLIDE NUMBER — tiny uppercase step label
   ═══════════════════════════════════════════════════════════════════════════ */

export function SlideNumber({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: 9,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: colors.ink3,
        marginBottom: 10,
        fontWeight: 400,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAG — bordered pill with semantic color
   ═══════════════════════════════════════════════════════════════════════════ */

type TagVariant = "harm" | "amber" | "help" | "neutral";

const TAG_COLORS: Record<TagVariant, { border: string; color: string }> = {
  harm: { border: "rgba(192,57,43,0.4)", color: colors.harm },
  amber: { border: colors.amberBorder, color: colors.amber },
  help: { border: "rgba(26,107,69,0.4)", color: colors.help },
  neutral: { border: colors.ruleStrong, color: colors.ink2 },
};

interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
}

export function Tag({ children, variant = "neutral" }: TagProps) {
  const scheme = TAG_COLORS[variant];
  return (
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize: 9,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "4px 12px",
        borderRadius: radius.sm,
        border: `1px solid ${scheme.border}`,
        color: scheme.color,
        fontWeight: 400,
      }}
    >
      {children}
    </span>
  );
}

export function TagRow({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginTop: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TENSION GRID — side-by-side comparison with "vs" divider
   Composed from Card + Label atoms.
   ═══════════════════════════════════════════════════════════════════════════ */

interface TensionGridProps {
  left: { label: string; text: string };
  right: { label: string; text: string };
  leftVariant?: "harm" | "help";
  rightVariant?: "harm" | "help";
}

export function TensionGrid({
  left,
  right,
  leftVariant = "harm",
  rightVariant = "help",
}: TensionGridProps) {
  const labelColors = { harm: colors.harm, help: colors.help };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 28px 1fr",
        alignItems: "stretch",
      }}
    >
      <Card scheme={leftVariant}>
        <Label color={labelColors[leftVariant]}>{left.label}</Label>
        <div style={{ color: colors.textMuted }}>{left.text}</div>
      </Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          color: colors.ink3,
          letterSpacing: "0.08em",
          fontFamily: fonts.mono,
        }}
      >
        vs
      </div>
      <Card scheme={rightVariant}>
        <Label color={labelColors[rightVariant]}>{right.label}</Label>
        <div style={{ color: colors.textMuted }}>{right.text}</div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FRICTION TRACK — horizontal track with center marker
   ═══════════════════════════════════════════════════════════════════════════ */

interface FrictionTrackProps {
  leftLabel?: string;
  centerLabel?: string;
  rightLabel?: string;
  leftColor?: string;
  rightColor?: string;
  markerColor?: string;
}

export function FrictionTrack({
  leftLabel = "AI response",
  centerLabel = "Friction point",
  rightLabel = "Human reflection",
  leftColor: _leftColor,
  rightColor: _rightColor,
  markerColor: _markerColor,
}: FrictionTrackProps) {
  // Halftone bitmap axis: light shade on the left (AI, looser grain),
  // dark shade on the right (human, denser grain), with a solid ink marker
  // at the center. Shape and shade density carry the contrast — no hue.
  const light = "░".repeat(16);
  const dark = "▓".repeat(16);

  return (
    <div>
      <div
        style={{
          fontFamily: fonts.serif,
          fontSize: 22,
          lineHeight: 1,
          color: colors.ink,
          textAlign: "center",
          letterSpacing: "0.02em",
          marginBottom: 10,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {light}
        <span style={{ margin: "0 10px" }}>◉</span>
        {dark}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: fonts.mono,
          fontSize: "8.5px",
          color: colors.ink3,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span>{leftLabel}</span>
        <span>{centerLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REFRAME CARDS — before/after comparison pair
   Composed from Card + Label atoms.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ReframeCardsProps {
  before: { label?: string; text: string };
  after: { label?: string; text: string };
}

export function ReframeCards({ before, after }: ReframeCardsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Card scheme="muted">
        <Label color={colors.ink3}>{before.label ?? "Before"}</Label>
        <div style={{ color: colors.textFaded }}>{before.text}</div>
      </Card>
      <Card scheme="help">
        <Label color={colors.help}>{after.label ?? "After"}</Label>
        <div style={{ color: colors.textMuted }}>{after.text}</div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REVEAL — fade + translate entrance animation driven by a boolean
   ═══════════════════════════════════════════════════════════════════════════ */

interface RevealProps {
  isVisible: boolean;
  children: ReactNode;
  /** Translate direction when hidden. "up" = hidden below, reveals upward. Default "up". */
  direction?: "up" | "down";
  /** Pixels to translate when hidden. Default 6. */
  distance?: number;
  /** Transition delay in seconds. Default 0.2. */
  delay?: number;
  /** Transition duration in seconds. Default 0.5. */
  duration?: number;
  style?: CSSProperties;
}

export function Reveal({
  isVisible,
  children,
  direction = "up",
  distance = 6,
  delay = 0.2,
  duration = 0.5,
  style,
}: RevealProps) {
  const hiddenY = direction === "up" ? `${distance}px` : `-${distance}px`;
  const timing = `opacity ${duration}s ease ${delay}s, transform ${duration}s ease ${delay}s`;

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : `translateY(${hiddenY})`,
        transition: timing,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAV BUTTONS — back/next navigation with counter
   Composed from Button + Counter atoms.
   ═══════════════════════════════════════════════════════════════════════════ */

interface NavButtonsProps {
  current: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  endLabel?: string;
}

export function NavButtons({
  current,
  total,
  onBack,
  onNext,
  endLabel = "Start over",
}: NavButtonsProps) {
  const isFirst = current === 0;
  const isLast = current === total - 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginTop: 32,
        paddingTop: 16,
        borderTop: borders.rule,
      }}
    >
      <Button variant="secondary" onClick={onBack} disabled={isFirst}>
        &larr; Back
      </Button>
      <Button variant="primary" onClick={onNext}>
        {isLast ? endLabel : "Next \u2192"}
      </Button>
      <Counter
        current={current + 1}
        total={total}
        style={{ marginLeft: "auto" }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS DOTS — row of circular dots indicating active/inactive state
   ═══════════════════════════════════════════════════════════════════════════ */

interface StatusDotsProps {
  total: number;
  /** Which indices are "active". A number fills 0..active; a Set fills only those indices. */
  active: Set<number> | number;
  /** Single color for all active dots, OR per-dot colors array. Defaults to colors.help. */
  colors?: string | string[];
  /** Inactive dot color. Defaults to colors.rule. */
  inactiveColor?: string;
  /** Dot diameter in px. Default 8. */
  size?: number;
  /** Gap between dots in px. Default 4. */
  gap?: number;
  style?: CSSProperties;
}

export function StatusDots({
  total,
  active,
  colors: dotColors,
  inactiveColor = colors.rule,
  size = 8,
  gap = 4,
  style,
}: StatusDotsProps) {
  const activeSet = useMemo(
    () => (typeof active === "number" ? null : active),
    [active],
  );
  const activeThreshold = typeof active === "number" ? active : -1;

  return (
    <div style={{ display: "flex", gap, ...style }}>
      {Array.from({ length: total }, (_, i) => {
        const isActive =
          activeSet !== null ? activeSet.has(i) : i <= activeThreshold;

        const activeFill =
          typeof dotColors === "string"
            ? dotColors
            : Array.isArray(dotColors)
              ? (dotColors[i] ?? colors.help)
              : colors.help;

        return (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: isActive ? activeFill : inactiveColor,
              transition: "background 0.3s ease",
            }}
          />
        );
      })}
    </div>
  );
}
