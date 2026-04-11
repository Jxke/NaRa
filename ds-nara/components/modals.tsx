"use client";

import { type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { colors, spacing, radius, transitions, typography } from "../tokens";

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL — portal-based overlay with backdrop dismiss and close button
   Extracted from DefenseModal, SampleDataModal, CostBreakdownModal,
   and NodePopup — all share the same shell.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ModalProps {
  /** Called when the backdrop or close button is clicked. */
  onClose: () => void;
  /** Content rendered inside the modal panel. */
  children: ReactNode;
  /** Max width of the panel. Defaults to 520. */
  maxWidth?: number;
  /** Panel padding. Defaults to spacing.lg. */
  padding?: number;
  /** Max height of the panel (enables scroll). */
  maxHeight?: string;
  /** Extra style on the panel container. */
  style?: CSSProperties;
}

export function Modal({
  onClose,
  children,
  maxWidth = 520,
  padding = spacing.lg,
  maxHeight,
  style,
}: ModalProps) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(26,22,18,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bg,
          border: `1px solid ${colors.ruleStrong}`,
          borderRadius: radius.lg,
          maxWidth,
          width: "100%",
          maxHeight,
          overflow: maxHeight ? "auto" : undefined,
          padding,
          boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
          ...style,
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL HEADER — eyebrow + title + close button
   Common pattern across all architecture modals.
   ═══════════════════════════════════════════════════════════════════════════ */

interface ModalHeaderProps {
  /** Small eyebrow text above the title. */
  eyebrow?: string;
  /** Main title. */
  title: ReactNode;
  /** Title font size override. Defaults to 24. */
  titleSize?: number;
  onClose: () => void;
  style?: CSSProperties;
}

export function ModalHeader({ eyebrow, title, titleSize = 24, onClose, style }: ModalHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.sm, ...style }}>
      <div>
        {eyebrow && (
          <div style={{ ...typography.eyebrow, color: colors.ink3, marginBottom: spacing.xs }}>{eyebrow}</div>
        )}
        <div style={{ ...typography.h2, fontSize: titleSize }}>{title}</div>
      </div>
      <button
        onClick={onClose}
        style={{
          all: "unset",
          cursor: "pointer",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.sm,
          color: colors.ink3,
          transition: transitions.fast,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = colors.inkSubtle; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
