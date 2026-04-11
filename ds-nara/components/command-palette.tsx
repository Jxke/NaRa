"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { colors, fonts, shadows, spacing, radius, transitions, typography } from "../tokens";
import { Kbd } from "./status";

/* ═══════════════════════════════════════════════════════════════════════════
   COMMAND PALETTE — spotlight-style command search
   Keyboard: ↑↓ navigate, Enter select, Esc close.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface Command {
  id: string;
  label: string;
  /** Group header under which this command appears. */
  group?: string;
  /** Optional icon rendered left of the label. */
  icon?: ReactNode;
  /** Optional keyboard shortcut hint rendered right-aligned. */
  shortcut?: string;
  /** Fallback description shown under label when label alone is ambiguous. */
  hint?: string;
  onSelect: () => void;
  /** Custom keywords for search matching (appended to label). */
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
  /** Called when there are zero matches. */
  emptyState?: ReactNode;
}

export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = "Type a command or search…",
  emptyState,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Reset query + selection when opening */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Focus input after mount
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  /* Filter commands by query (matches label + keywords + group) */
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((cmd) => {
      const haystack = [
        cmd.label,
        cmd.group ?? "",
        cmd.hint ?? "",
        ...(cmd.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [commands, query]);

  /* Group filtered commands */
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    filtered.forEach((cmd) => {
      const group = cmd.group ?? "";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(cmd);
    });
    return Array.from(map.entries());
  }, [filtered]);

  /* Clamp selectedIndex when filtered list shrinks */
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  /* Scroll selected row into view */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${selectedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (cmd: Command) => {
      cmd.onSelect();
      onClose();
    },
    [onClose],
  );

  /* Keyboard navigation */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[selectedIndex];
      if (cmd) handleSelect(cmd);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(26,22,18,0.35)",
        backdropFilter: "blur(2px)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        animation: "cockpit-fade-in 0.12s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(90vw, 560px)",
          maxHeight: "70vh",
          background: colors.bg,
          border: `1px solid ${colors.ruleStrong}`,
          borderRadius: radius.md,
          boxShadow: shadows.tooltip,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div
          style={{
            borderBottom: `1px solid ${colors.rule}`,
            padding: `${spacing.sm}px ${spacing.md}px`,
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <span
            style={{
              ...typography.label,
              color: colors.ink3,
              flexShrink: 0,
            }}
          >
            ⌘
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={placeholder}
            style={{
              ...typography.body,
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: colors.ink,
              padding: 0,
            }}
          />
          <Kbd muted>Esc</Kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          role="listbox"
          style={{
            overflowY: "auto",
            padding: `${spacing.xxs}px 0`,
            flex: 1,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: `${spacing.md}px ${spacing.md}px`,
                ...typography.body,
                color: colors.ink3,
                textAlign: "center",
              }}
            >
              {emptyState ?? `No results for "${query}"`}
            </div>
          ) : (
            grouped.map(([groupName, cmds]) => {
              const groupStartIndex = filtered.indexOf(cmds[0]);
              return (
                <div key={groupName || "__root__"}>
                  {groupName && (
                    <div
                      style={{
                        ...typography.label,
                        color: colors.ink3,
                        padding: `${spacing.sm}px ${spacing.md}px ${spacing.xxs}px`,
                      }}
                    >
                      {groupName}
                    </div>
                  )}
                  {cmds.map((cmd, i) => {
                    const absoluteIndex = groupStartIndex + i;
                    const isSelected = absoluteIndex === selectedIndex;
                    return (
                      <CommandRow
                        key={cmd.id}
                        command={cmd}
                        isSelected={isSelected}
                        index={absoluteIndex}
                        onSelect={() => handleSelect(cmd)}
                        onHover={() => setSelectedIndex(absoluteIndex)}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: `1px solid ${colors.rule}`,
            padding: `${spacing.xxs}px ${spacing.md}px`,
            display: "flex",
            alignItems: "center",
            gap: spacing.md,
            background: colors.inkFaint,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: spacing.xxs,
              ...typography.stat,
              color: colors.ink3,
            }}
          >
            <Kbd muted>↑</Kbd>
            <Kbd muted>↓</Kbd>
            <span>navigate</span>
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: spacing.xxs,
              ...typography.stat,
              color: colors.ink3,
            }}
          >
            <Kbd muted>↵</Kbd>
            <span>select</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Command Row ───────────────────────────────────────────────────────── */

function CommandRow({
  command,
  isSelected,
  index,
  onSelect,
  onHover,
}: {
  command: Command;
  isSelected: boolean;
  index: number;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      data-cmd-index={index}
      onClick={onSelect}
      onMouseEnter={onHover}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        width: "100%",
        padding: `${spacing.xs}px ${spacing.md}px`,
        background: isSelected ? colors.inkSubtle : "transparent",
        transition: transitions.fast,
        boxSizing: "border-box",
      }}
    >
      {command.icon && (
        <span
          style={{
            display: "inline-flex",
            color: isSelected ? colors.ink : colors.ink2,
            flexShrink: 0,
          }}
        >
          {command.icon}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...typography.body,
            color: isSelected ? colors.ink : colors.ink2,
            fontWeight: isSelected ? 500 : 400,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {command.label}
        </div>
        {command.hint && (
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              color: colors.ink3,
              lineHeight: 1.3,
              marginTop: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {command.hint}
          </div>
        )}
      </div>
      {command.shortcut && (
        <span style={{ flexShrink: 0 }}>
          <Kbd muted>{command.shortcut}</Kbd>
        </span>
      )}
    </button>
  );
}
