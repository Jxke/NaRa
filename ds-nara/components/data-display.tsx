"use client";

import React, { CSSProperties, useState } from "react";
import {
  colors,
  fonts,
  typography,
  borders,
  transitions,
  TABLE_GRID,
} from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   GAUGE BAR
   ═══════════════════════════════════════════════════════════════════════════ */

interface GaugeBarProps {
  value: number; // 0-100
  color?: string; // fill color, defaults to colors.ink
  height?: number; // track height in px, defaults to 4
  animated?: boolean; // whether to animate, defaults to true
  style?: CSSProperties;
}

export function GaugeBar({
  value,
  color = colors.ink,
  height = 4,
  animated = true,
  style,
}: GaugeBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="img"
      aria-label={`${clamped}%`}
      style={{
        height,
        background: colors.rule,
        borderRadius: 0,
        ...style,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${clamped}%`,
          background: color,
          borderRadius: 0,
          ...(animated
            ? { transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }
            : {}),
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SWATCH
   ═══════════════════════════════════════════════════════════════════════════ */

export function Swatch({
  color,
  size = 8,
}: {
  color: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORY HEADER
   ═══════════════════════════════════════════════════════════════════════════ */

interface CategoryHeaderProps {
  label: string;
  color: string;
  showBorder?: boolean;
}

export function CategoryHeader({
  label,
  color: _color,
  showBorder = true,
}: CategoryHeaderProps) {
  return (
    <div
      style={{
        fontSize: "8.5px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: colors.ink2,
        padding: "12px 0 5px",
        borderTop: showBorder ? borders.rule : "none",
        marginTop: showBorder ? 8 : 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: fonts.mono,
      }}
    >
      <span
        aria-hidden
        style={{
          fontFamily: fonts.mono,
          fontSize: 10,
          lineHeight: 1,
          color: colors.ink,
        }}
      >
        ■
      </span>
      {label}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DIVERGING BAR
   ═══════════════════════════════════════════════════════════════════════════ */

interface DivergingBarProps {
  value: number; // -100 to +100
  magnitude?: number; // 0–100, affects bar height/opacity
}

export function DivergingBar({ value, magnitude = 70 }: DivergingBarProps) {
  const isHelp = value >= 0;
  const barPct = (Math.abs(value) / 100) * 50;
  const barHeight = 7 + Math.round((magnitude / 100) * 8);
  const opacity = 0.55 + (magnitude / 100) * 0.45;
  // Flip label inside bar when it would overflow the container
  const flipInside = barPct > 40;

  return (
    <div
      role="img"
      aria-label={`${isHelp ? "Positive" : "Negative"} ${Math.abs(value)}`}
      style={{
        position: "relative",
        height: 26,
        display: "flex",
        alignItems: "center",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Center line */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 1,
          background: colors.centerLine,
          pointerEvents: "none",
        }}
      />
      {/* Bar */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          height: barHeight,
          width: `${barPct}%`,
          borderRadius: 0,
          background: isHelp ? colors.help : colors.harm,
          opacity,
          ...(isHelp
            ? { left: "50%" }
            : { right: "50%" }),
        }}
      />
      {/* Direction indicator for color-blind users */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 6,
          fontFamily: fonts.mono,
          color: colors.centerLine,
          ...(isHelp
            ? { left: `calc(50% + ${Math.min(barPct, 3)}%)` }
            : { right: `calc(50% + ${Math.min(barPct, 3)}%)` }),
          opacity: barPct > 5 ? 0 : 0.6,
        }}
      >
        {isHelp ? "+" : "\u2013"}
      </div>
      {/* Net value label */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 8,
          fontWeight: 700,
          fontFamily: fonts.mono,
          whiteSpace: "nowrap",
          color: flipInside
            ? colors.bg
            : isHelp
              ? colors.help
              : colors.harm,
          ...(isHelp
            ? flipInside
              ? { right: `calc(50% + 4px)` }
              : { left: `calc(50% + ${barPct}% + 4px)` }
            : flipInside
              ? { left: `calc(50% + 4px)` }
              : { right: `calc(50% + ${barPct}% + 4px)` }),
        }}
      >
        {isHelp ? "+" : ""}
        {value}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PREVALENCE BAR (mini)
   ═══════════════════════════════════════════════════════════════════════════ */

interface PrevalenceBarProps {
  value: number; // 0–100
}

export function PrevalenceBar({ value }: PrevalenceBarProps) {
  return (
    <div
      role="img"
      aria-label={`Prevalence ${value}%`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 3,
      }}
    >
      <div
        style={{
          width: 52,
          height: 3,
          background: colors.ink3,
          borderRadius: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 0,
            background: colors.ink,
            width: `${value}%`,
            opacity: 0.35 + (value / 100) * 0.65,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 8,
          color: colors.ink2,
          width: 26,
          textAlign: "right",
          fontFamily: fonts.mono,
        }}
      >
        {value}%
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATA ROW
   ═══════════════════════════════════════════════════════════════════════════ */

interface DataRowProps {
  label: string;
  net: number;
  magnitude?: number;
  prevalence: number;
}

export function DataRow({
  label,
  net,
  magnitude = 70,
  prevalence,
}: DataRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: TABLE_GRID,
        alignItems: "center",
        padding: "3px 0",
        cursor: "default",
        transition: transitions.fast,
        borderRadius: 0,
        background: hovered ? colors.inkHover : "transparent",
      }}
    >
      <div
        style={{
          fontSize: "10.5px",
          fontWeight: 400,
          color: colors.ink,
          paddingRight: 12,
          lineHeight: 1.3,
          fontFamily: fonts.mono,
        }}
      >
        {label}
      </div>
      <DivergingBar value={net} magnitude={magnitude} />
      <div style={{ paddingLeft: 12 }}>
        <PrevalenceBar value={prevalence} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AXIS HEADER
   ═══════════════════════════════════════════════════════════════════════════ */

export function AxisHeader() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: TABLE_GRID,
        marginBottom: 6,
        paddingBottom: 8,
        borderBottom: borders.heavyRule,
        alignItems: "end",
      }}
    >
      <div style={{ ...typography.caption }}>Domain</div>
      <div style={{ display: "flex", position: "relative" }}>
        <span style={{ ...typography.label, color: colors.harm }}>
          &larr; Harm
        </span>
        <span
          style={{
            ...typography.label,
            color: colors.help,
            position: "absolute",
            right: 0,
          }}
        >
          Help &rarr;
        </span>
      </div>
      <div style={{ ...typography.caption, textAlign: "right" }}>
        Prevalence
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TICK MARKS
   ═══════════════════════════════════════════════════════════════════════════ */

export function TickMarks() {
  const ticks = [-75, -50, -25, 0, 25, 50, 75];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: TABLE_GRID,
        marginBottom: 2,
      }}
    >
      <div />
      <div style={{ position: "relative", height: 12 }}>
        {ticks.map((v) => {
          const pct = ((v + 100) / 200) * 100;
          return (
            <React.Fragment key={v}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${pct}%`,
                  width: 1,
                  height: 6,
                  background: colors.rule,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  left: `${pct}%`,
                  fontSize: 8,
                  color: colors.ink3,
                  transform: "translateX(-50%)",
                  fontFamily: fonts.mono,
                }}
              >
                {v > 0 ? "+" : ""}
                {v}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div />
    </div>
  );
}
