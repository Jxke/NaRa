"use client";

import {
  type CSSProperties,
  type ReactNode,
  type TextareaHTMLAttributes,
  type InputHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import { colors, fonts, shadows, spacing, radius, transitions, typography } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD WRAPPER — label + control + helper/error text
   Shared layout for TextInput, Textarea, Select.
   ═══════════════════════════════════════════════════════════════════════════ */

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  /** Render label inline on the right, typically a char counter or secondary action. */
  labelRight?: ReactNode;
}

function FieldWrapper({ label, hint, error, labelRight, children }: FieldWrapperProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs }}>
      {(label || labelRight) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          {label && (
            <span style={{ ...typography.label, color: error ? colors.harm : colors.ink2 }}>
              {label}
            </span>
          )}
          {labelRight && <span style={{ ...typography.stat, color: colors.ink3 }}>{labelRight}</span>}
        </div>
      )}
      {children}
      {(error || hint) && (
        <span style={{ ...typography.stat, color: error ? colors.harm : colors.ink3 }}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEXT INPUT
   ═══════════════════════════════════════════════════════════════════════════ */

interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  labelRight?: ReactNode;
  /** Visual density. Default uses body typography; compact uses stat/mono at 11px. */
  size?: "default" | "compact";
}

export function TextInput({
  label,
  hint,
  error,
  labelRight,
  size = "default",
  style,
  disabled,
  ...inputProps
}: TextInputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.harm
    : focused
      ? colors.ink
      : colors.rule;

  const isCompact = size === "compact";
  const padding = isCompact
    ? `${spacing.xs}px ${spacing.sm}px`
    : `${spacing.xs + 2}px ${spacing.sm}px`;
  const inputTypography = isCompact ? typography.bodySmall : typography.body;

  return (
    <FieldWrapper label={label} hint={hint} error={error} labelRight={labelRight}>
      <input
        {...inputProps}
        disabled={disabled}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        style={{
          ...inputTypography,
          width: "100%",
          padding,
          background: disabled ? colors.inkFaint : colors.bg,
          border: `1px solid ${borderColor}`,
          borderRadius: radius.sm,
          color: colors.ink,
          outline: "none",
          transition: transitions.fast,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "text",
          boxSizing: "border-box",
          ...style,
        }}
      />
    </FieldWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEXTAREA
   ═══════════════════════════════════════════════════════════════════════════ */

interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  labelRight?: ReactNode;
}

export function Textarea({
  label,
  hint,
  error,
  labelRight,
  style,
  disabled,
  rows = 4,
  ...textareaProps
}: TextareaProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.harm
    : focused
      ? colors.ink
      : colors.rule;

  return (
    <FieldWrapper label={label} hint={hint} error={error} labelRight={labelRight}>
      <textarea
        {...textareaProps}
        rows={rows}
        disabled={disabled}
        onFocus={(e) => {
          setFocused(true);
          textareaProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          textareaProps.onBlur?.(e);
        }}
        style={{
          ...typography.body,
          width: "100%",
          padding: `${spacing.xs + 2}px ${spacing.sm + spacing.xs}px`,
          background: disabled ? colors.inkFaint : colors.bg,
          border: `1px solid ${borderColor}`,
          borderRadius: radius.sm,
          color: colors.ink,
          outline: "none",
          transition: transitions.fast,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "text",
          boxSizing: "border-box",
          resize: "vertical",
          fontFamily: typography.body.fontFamily,
          ...(style as CSSProperties),
        }}
      />
    </FieldWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SELECT
   ═══════════════════════════════════════════════════════════════════════════ */

interface SelectProps {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Visual density. Default uses body typography; compact uses bodySmall (11px). */
  size?: "default" | "compact";
  style?: CSSProperties;
}

export function Select({
  label,
  hint,
  error,
  options,
  value,
  onChange,
  disabled,
  placeholder,
  size = "default",
  style,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* Close on escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const borderColor = error
    ? colors.harm
    : focused || open
      ? colors.ink
      : colors.rule;

  const isCompact = size === "compact";
  const padding = isCompact
    ? `${spacing.xs}px ${spacing.xl}px ${spacing.xs}px ${spacing.sm}px`
    : `${spacing.xs + 2}px ${spacing.xl}px ${spacing.xs + 2}px ${spacing.sm}px`;
  const selectTypography = isCompact ? typography.bodySmall : typography.body;
  const selected = options.find((opt) => opt.value === value);

  return (
    <FieldWrapper label={label} hint={hint} error={error}>
      <div ref={rootRef} style={{ position: "relative" }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-haspopup="listbox"
          aria-expanded={open}
          style={{
            ...selectTypography,
            width: "100%",
            padding,
            background: disabled ? colors.inkFaint : colors.bg,
            border: `1px solid ${borderColor}`,
            borderRadius: radius.sm,
            color: selected ? colors.ink : colors.ink3,
            outline: "none",
            transition: transitions.fast,
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
            boxSizing: "border-box",
            textAlign: "left",
            ...style,
          }}
        >
          {selected?.label ?? placeholder ?? "\u00a0"}
        </button>

        {/* Chevron */}
        <span
          style={{
            position: "absolute",
            right: spacing.sm,
            top: "50%",
            transform: open ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)",
            pointerEvents: "none",
            color: colors.ink3,
            fontSize: 10,
            fontFamily: fonts.mono,
            transition: transitions.fast,
          }}
        >
          ▾
        </span>

        {/* Dropdown popover */}
        {open && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 50,
              background: colors.bg,
              border: `1px solid ${colors.ruleStrong}`,
              borderRadius: radius.sm,
              boxShadow: shadows.tooltip,
              padding: spacing.xs,
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <SelectOption
                  key={opt.value}
                  label={opt.label}
                  isSelected={isSelected}
                  isCompact={isCompact}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}

function SelectOption({
  label,
  isSelected,
  isCompact,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  isCompact: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...(isCompact ? typography.bodySmall : typography.body),
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
        width: "100%",
        padding: `${spacing.xs}px ${spacing.sm}px`,
        background: hovered ? colors.inkSubtle : "transparent",
        border: "none",
        borderRadius: radius.sm,
        color: isSelected ? colors.ink : colors.ink2,
        fontWeight: isSelected ? 500 : 400,
        cursor: "pointer",
        transition: transitions.fast,
        textAlign: "left",
        outline: "none",
      }}
    >
      <span>{label}</span>
      {isSelected && (
        <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink2 }}>✓</span>
      )}
    </button>
  );
}
