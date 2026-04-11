"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { colors, fonts, radius, transitions, typography } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   BUTTON — 5 variants × 3 sizes × icon slots × loading state
   ═══════════════════════════════════════════════════════════════════════════ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
  "aria-label"?: string;
}

/** Map size → padding + typography token. */
const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: {
    ...typography.label,
    padding: "4px 8px",
  },
  md: {
    ...typography.label,
    padding: "8px 16px",
  },
  lg: {
    ...typography.caption,
    padding: "12px 20px",
  },
};

const ICON_GAPS: Record<ButtonSize, number> = {
  sm: 6,
  md: 8,
  lg: 10,
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onClick,
  type = "button",
  style,
  ...ariaProps
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  const variantStyles: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: colors.ink,
      color: colors.bg,
      border: `1px solid ${colors.ink}`,
      opacity: hovered && !isDisabled ? 0.82 : 1,
    },
    secondary: {
      background: hovered && !isDisabled ? colors.inkSubtle : "transparent",
      color: hovered && !isDisabled ? colors.ink : colors.ink2,
      border: `1px solid ${colors.ruleStrong}`,
    },
    ghost: {
      background: hovered && !isDisabled ? colors.inkFaint : "transparent",
      color: hovered && !isDisabled ? colors.ink : colors.ink2,
      border: "1px solid transparent",
    },
    danger: {
      background: colors.harm,
      color: colors.bg,
      border: `1px solid ${colors.harm}`,
      opacity: hovered && !isDisabled ? 0.85 : 1,
    },
    outline: {
      background: hovered && !isDisabled ? colors.inkFaint : "transparent",
      color: colors.ink,
      border: `1px solid ${colors.ink}`,
    },
  };

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...ariaProps}
      style={{
        ...SIZE_STYLES[size],
        fontFamily: fonts.mono,
        fontWeight: 400,
        borderRadius: radius.sm,
        transition: transitions.fast,
        outline: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: ICON_GAPS[size],
        width: fullWidth ? "100%" : undefined,
        ...variantStyles[variant],
        opacity: disabled ? 0.3 : loading ? 0.6 : variantStyles[variant].opacity ?? 1,
        cursor: isDisabled ? "default" : "pointer",
        ...style,
      }}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        leftIcon && <span style={{ display: "inline-flex" }}>{leftIcon}</span>
      )}
      {children}
      {rightIcon && !loading && <span style={{ display: "inline-flex" }}>{rightIcon}</span>}
    </button>
  );
}

/** Small inline spinner, sized to match button text. */
function Spinner({ size }: { size: ButtonSize }) {
  const diameter = size === "sm" ? 10 : size === "md" ? 12 : 14;
  return (
    <span
      style={{
        display: "inline-block",
        width: diameter,
        height: diameter,
        borderRadius: "50%",
        border: "1.5px solid currentColor",
        borderTopColor: "transparent",
        animation: "cockpit-spin 0.7s linear infinite",
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICON BUTTON — square, icon-only, inherits Button sizes + variants
   ═══════════════════════════════════════════════════════════════════════════ */

interface IconButtonProps {
  icon: ReactNode;
  "aria-label": string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  style?: CSSProperties;
}

/** Square dimension for icon-only buttons. */
const ICON_BUTTON_DIMENSIONS: Record<ButtonSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

export function IconButton({
  icon,
  variant = "ghost",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  style,
  ...ariaProps
}: IconButtonProps) {
  const dimension = ICON_BUTTON_DIMENSIONS[size];
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      type={type}
      {...ariaProps}
      style={{
        width: dimension,
        height: dimension,
        padding: 0,
        ...style,
      }}
    >
      {!loading && icon}
    </Button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CARD — bordered container with optional semantic color scheme
   ═══════════════════════════════════════════════════════════════════════════ */

type CardScheme = "neutral" | "harm" | "help" | "muted";

interface CardProps {
  children: ReactNode;
  scheme?: CardScheme;
  style?: CSSProperties;
}

/**
 * NaRa Card schemes — differentiation via stroke weight and pattern, not color.
 *   harm    → 2px solid black  (friction / emphasis)
 *   help    → 1px solid black  (affirmation / baseline positive)
 *   muted   → 1px dashed black (tentative, exploratory)
 *   neutral → 1px solid rule   (neutral baseline, faint)
 */
const CARD_SCHEMES: Record<
  CardScheme,
  { border: string; background: string }
> = {
  neutral: {
    border: `1px solid ${colors.rule}`,
    background: "transparent",
  },
  harm: {
    border: `2px solid ${colors.ink}`,
    background: "transparent",
  },
  help: {
    border: `1px solid ${colors.ink}`,
    background: "transparent",
  },
  muted: {
    border: `1px dashed ${colors.ink}`,
    background: "transparent",
  },
};

export function Card({ children, scheme = "neutral", style }: CardProps) {
  const s = CARD_SCHEMES[scheme];
  return (
    <div
      style={{
        padding: "14px 16px",
        fontSize: 10,
        lineHeight: 1.7,
        fontWeight: 700,
        fontFamily: fonts.mono,
        borderRadius: radius.sm,
        border: s.border,
        background: s.background,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT PAIR — key-value row with muted label and bold value
   ═══════════════════════════════════════════════════════════════════════════ */

interface StatPairProps {
  label: string;
  value: string;
  /** Override color for the value. */
  valueColor?: string;
  /** Whether displayed on a dark surface. */
  inverted?: boolean;
}

export function StatPair({
  label,
  value,
  valueColor,
  inverted = false,
}: StatPairProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 4,
        fontFamily: fonts.mono,
        fontSize: 9,
      }}
    >
      <span
        style={{
          color: inverted ? "rgba(245,240,232,0.5)" : colors.ink3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color:
            valueColor ??
            (inverted ? colors.bg : colors.ink),
          fontWeight: 700,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LABEL — tiny uppercase label with semantic color
   Uses typography.label token. Used in cards, form groups, etc.
   ═══════════════════════════════════════════════════════════════════════════ */

interface LabelProps {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}

export function Label({ children, color, style }: LabelProps) {
  return (
    <div
      style={{
        ...typography.label,
        fontWeight: 700,
        marginBottom: 6,
        color: color ?? colors.ink2,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTENT DIVIDER — thin rule with built-in vertical breathing room
   Unlike Rule/ThinRule (just lines), this creates a content section break.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ContentDividerProps {
  style?: CSSProperties;
}

export function ContentDivider({ style }: ContentDividerProps) {
  return (
    <div
      style={{
        borderTop: `1px solid ${colors.rule}`,
        paddingTop: 20,
        marginTop: 4,
        ...style,
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COUNTER — step/page counter text (e.g., "1 / 4")
   ═══════════════════════════════════════════════════════════════════════════ */

interface CounterProps {
  current: number;
  total: number;
  style?: CSSProperties;
}

export function Counter({ current, total, style }: CounterProps) {
  return (
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize: 9,
        color: colors.ink3,
        letterSpacing: "0.1em",
        ...style,
      }}
    >
      {current} / {total}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERACTIVE CARD — clickable card with active/inactive states
   Extracted from repeated expand/collapse patterns in slides.
   ═══════════════════════════════════════════════════════════════════════════ */

interface InteractiveCardProps {
  children: ReactNode;
  isActive?: boolean;
  /** Border color when active. Defaults to colors.ruleStrong. */
  activeColor?: string;
  /** Background when active. Defaults to colors.inkFaint. */
  activeBg?: string;
  /** Padding in default state. Defaults to "14px 16px". */
  padding?: string;
  /** Optional larger padding when active. */
  activePadding?: string;
  borderRadius?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  style?: CSSProperties;
  textAlign?: "left" | "center" | "right";
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHECKBOX — presentational checkbox indicator (not interactive on its own)
   Parent handles click. Two mark variants: "check" (✓) and "dot" (filled square).
   ═══════════════════════════════════════════════════════════════════════════ */

interface CheckboxProps {
  isChecked: boolean;
  /** Border + fill color when checked. Defaults to colors.help. */
  color?: string;
  /** Box size in px. Defaults to 16. */
  size?: number;
  /** Inner mark style. Defaults to "check" (✓). */
  variant?: "check" | "dot";
  style?: CSSProperties;
}

export function Checkbox({
  isChecked,
  color = colors.help,
  size = 16,
  variant = "check",
  style,
}: CheckboxProps) {
  const dotSize = Math.round(size * 0.4);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius.sm,
        border: `1.5px solid ${isChecked ? color : colors.rule}`,
        background: isChecked ? color : "transparent",
        transition: "all 0.2s ease",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {isChecked &&
        (variant === "dot" ? (
          <div
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: 1,
              background: colors.bg,
            }}
          />
        ) : (
          <span
            style={{
              fontSize: size * 0.65,
              lineHeight: 1,
              color: colors.bg,
              fontWeight: 600,
            }}
          >
            ✓
          </span>
        ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION HEADER — colored dot + label + optional hint + optional right content
   Extracted from repeated flex-row patterns in slides (8+ instances).
   ═══════════════════════════════════════════════════════════════════════════ */

interface SectionHeaderProps {
  label: string;
  hint?: string;
  /** Dot + label color. Defaults to colors.ink. */
  color?: string;
  /** Dot diameter in px. Defaults to 7. */
  dotSize?: number;
  /** Gap between items in px. Defaults to 8. */
  gap?: number;
  /** Bottom margin in px. Defaults to 16. */
  marginBottom?: number;
  /** Extra content pushed to the right (e.g., a counter). */
  right?: ReactNode;
  style?: CSSProperties;
}

export function SectionHeader({
  label,
  hint,
  color = colors.ink,
  dotSize = 7,
  gap = 8,
  marginBottom = 16,
  right,
  style,
}: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap,
        marginBottom,
        ...style,
      }}
    >
      <div
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: "8.5px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 700,
          color,
        }}
      >
        {label}
      </div>
      {hint && (
        <span style={{ ...typography.caption, color: colors.ink3 }}>
          {hint}
        </span>
      )}
      {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
    </div>
  );
}

export function InteractiveCard({
  children,
  isActive = false,
  activeColor = colors.ruleStrong,
  activeBg = colors.inkFaint,
  padding = "14px 16px",
  activePadding,
  borderRadius = radius.sm,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style,
  textAlign = "left",
}: InteractiveCardProps) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        padding: isActive && activePadding ? activePadding : padding,
        border: `1px solid ${isActive ? activeColor : colors.rule}`,
        borderRadius,
        background: isActive ? activeBg : "transparent",
        transition: "all 0.35s ease",
        textAlign,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
