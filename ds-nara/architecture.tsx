"use client";

import { type ReactNode, type CSSProperties, useState, lazy, Suspense, createContext, useContext } from "react";
import { createPortal } from "react-dom";
const PipelineFlowLazy = lazy(() => import("./pipeline-flow").then(m => ({ default: m.PipelineFlow })));
import {
  colors,
  fonts,
  weights,
  spacing,
  radius,
  borders,
  transitions,
  typography,
} from "./tokens";
import {
  Title,
  Eyebrow,
  H2,
  H3,
  Body,
  Caption,
  Card,
  Label,
  ContentDivider,
  StatusBadge,
  MiniStat,
  Tabs,
  GaugeBar,
  ThinRule,
  IconButton,
  Tag,
  KeyValueTable,
  StatPair,
} from "./components";

/* ═══════════════════════════════════════════════════════════════════════════
   PALETTE — domain colors for the architecture zones
   ═══════════════════════════════════════════════════════════════════════════ */

import { zone } from "./architecture-tokens";
import { NODE_INFO } from "./node-info";

/* ═══════════════════════════════════════════════════════════════════════════
   TINY REUSABLE PRIMITIVES (architecture-specific)
   ═══════════════════════════════════════════════════════════════════════════ */

function ZoneLabel({ color, children }: { color: string; children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <Caption style={{ color, fontWeight: weights.medium }}>{children}</Caption>
    </div>
  );
}

function FlowArrow({
  label,
  direction = "down",
  color = colors.ink3,
}: {
  label?: string;
  direction?: "down" | "right" | "bidirectional";
  color?: string;
}) {
  const isHoriz = direction === "right";
  const isBidi = direction === "bidirectional";
  const w = isHoriz ? 28 : 14;
  const h = isHoriz ? 14 : 28;

  return (
    <div style={{ display: "flex", flexDirection: isHoriz ? "row" : "column", alignItems: "center", justifyContent: "center", gap: spacing.xxs, padding: isHoriz ? `0 ${spacing.xxs}px` : `${spacing.xxs}px 0` }}>
      {label && !isHoriz && <Caption style={{ color }}>{label}</Caption>}
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ flexShrink: 0 }}>
        {isHoriz ? (
          <>
            <line x1={0} y1={7} x2={22} y2={7} stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />
            <path d="M18 3L24 7L18 11" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
          </>
        ) : isBidi ? (
          <>
            <line x1={7} y1={6} x2={7} y2={22} stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />
            <path d="M3 8L7 2L11 8" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
            <path d="M3 20L7 26L11 20" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
          </>
        ) : (
          <>
            <line x1={7} y1={0} x2={7} y2={22} stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />
            <path d="M3 18L7 24L11 18" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.7} />
          </>
        )}
      </svg>
      {label && isHoriz && <Caption style={{ color }}>{label}</Caption>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFENDABLE VALUE — highlighted inline value that opens a rationale modal
   ═══════════════════════════════════════════════════════════════════════════ */

interface VocabEntry {
  term: string;
  definition: string;
}

const StepContext = createContext<string | undefined>(undefined);

const VOCAB_COLORS = [zone.audio, zone.cloud, zone.storage, zone.device, zone.privacy, zone.social, zone.app, zone.glyph];

function vocabColor(index: number): string {
  return VOCAB_COLORS[index % VOCAB_COLORS.length];
}

function highlightVocab(text: string, vocab: VocabEntry[]): ReactNode {
  const terms = vocab.map((v) => v.term).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    const termIdx = vocab.findIndex((v) => v.term.toLowerCase() === part.toLowerCase());
    if (termIdx !== -1) {
      const c = vocabColor(termIdx);
      return <span key={i} style={{ fontWeight: weights.medium, color: c }}>{part}</span>;
    }
    return part;
  });
}

function DefenseModal({ value, defense, vocab, context, onClose }: { value: string; defense: string; vocab?: VocabEntry[]; context?: string; onClose: () => void }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(26,22,18,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: spacing.xl,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bg,
          border: `1px solid ${colors.ruleStrong}`,
          borderRadius: radius.lg,
          maxWidth: 520,
          width: "100%",
          padding: `${spacing.lg}px`,
          boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.sm }}>
          <div>
            <div style={{ ...typography.eyebrow, color: colors.ink3, marginBottom: spacing.xs }}>{context ?? "Value Defense"}</div>
            <div style={{ ...typography.h2, fontSize: 24 }}>{value}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              all: "unset", cursor: "pointer",
              width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
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
        <div style={{ ...typography.body, color: colors.ink2, lineHeight: 1.7 }}>
          {vocab && vocab.length > 0
            ? highlightVocab(defense, vocab)
            : defense}
        </div>

        {vocab && vocab.length > 0 && (
          <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.rule}` }}>
            <div style={{ ...typography.label, color: colors.ink3, marginBottom: spacing.sm }}>Vocabulary</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: `0 ${spacing.md}px` }}>
              {vocab.map((v, i) => {
                const c = vocabColor(i);
                return (
                <div key={v.term} style={{
                  display: "grid", gridTemplateColumns: "subgrid", gridColumn: "1 / -1",
                  alignItems: "start",
                  padding: `${spacing.sm}px 0`,
                  borderBottom: i < vocab.length - 1 ? `1px solid ${colors.rule}` : "none",
                }}>
                  <span style={{
                    ...typography.label, fontWeight: weights.medium, color: c,
                    padding: `3px ${spacing.xs}px 2px`,
                    background: `${c}08`,
                    border: `1px solid ${c}25`,
                    borderRadius: radius.sm,
                    whiteSpace: "nowrap",
                    marginTop: 2,
                    justifySelf: "start",
                  }}>
                    {v.term}
                  </span>
                  <span style={{ ...typography.body, color: colors.ink2, lineHeight: 1.5 }}>
                    {v.definition}
                  </span>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SampleDataModal({ label, payload, onClose }: { label: string; payload: SamplePayload; onClose: () => void }) {
  // Group rows — collect unique groups in order, ungrouped rows go under ""
  const groups: { name: string; rows: readonly SampleRow[] }[] = [];
  const seen = new Set<string>();
  for (const row of payload.rows) {
    const g = row.group ?? "";
    if (!seen.has(g)) {
      seen.add(g);
      groups.push({ name: g, rows: payload.rows.filter((r) => (r.group ?? "") === g) });
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(26,22,18,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: spacing.lg,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bg,
          border: `1px solid ${colors.ruleStrong}`,
          borderRadius: radius.lg,
          maxWidth: 900,
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          padding: `${spacing.xl}px`,
          boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.xs }}>
          <div>
            <div style={{ ...typography.eyebrow, color: colors.ink3, marginBottom: spacing.xs }}>Sample Payload</div>
            <div style={{ ...typography.h2, fontSize: 22 }}>{label}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              all: "unset", cursor: "pointer",
              width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
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

        {/* Scenario description */}
        <div style={{ ...typography.body, color: colors.ink2, lineHeight: 1.6, marginBottom: spacing.lg, padding: `${spacing.sm}px ${spacing.md}px`, background: colors.inkFaint, borderRadius: radius.sm, borderLeft: `3px solid ${zone.storage}` }}>
          {payload.scenario}
        </div>

        {/* Grouped tables */}
        {groups.map((group) => (
          <div key={group.name} style={{ marginBottom: group.name ? spacing.lg : 0 }}>
            {group.name && (
              <div style={{ ...typography.label, color: zone.storage, marginBottom: spacing.xs, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {group.name}
              </div>
            )}
            <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.sm }}>
              {/* Column header */}
              <div style={{
                display: "grid", gridTemplateColumns: "180px 140px 1fr",
                background: colors.inkFaint,
                borderBottom: `1px solid ${colors.rule}`,
              }}>
                {["Field", "Type", "Example"].map((h) => (
                  <div key={h} style={{ ...typography.label, color: colors.ink3, padding: `${spacing.xs + 2}px ${spacing.sm}px` }}>{h}</div>
                ))}
              </div>
              {/* Data rows */}
              {group.rows.map((row, i) => (
                <div key={row.field} style={{
                  display: "grid", gridTemplateColumns: "180px 140px 1fr",
                  borderBottom: i < group.rows.length - 1 ? `1px solid ${colors.rule}` : "none",
                  alignItems: "start",
                }}>
                  <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink, padding: `${spacing.xs + 2}px ${spacing.sm}px`, wordBreak: "break-word", lineHeight: 1.5 }}>{row.field}</div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 9.5, color: colors.ink3, padding: `${spacing.xs + 2}px ${spacing.sm}px`, lineHeight: 1.5 }}>{row.type}</div>
                  <div style={{ padding: `${spacing.xs + 2}px ${spacing.sm}px`, lineHeight: 1.7, wordBreak: "break-word" }}>
                    {typeof row.example === "string" ? (
                      <span style={{ fontFamily: fonts.mono, fontSize: 10.5, color: colors.ink2, whiteSpace: "pre-wrap" }}>{row.example}</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: `${spacing.xxs}px` }}>
                        {row.example.map((kv, ki) => (
                          <span key={ki} style={{
                            fontFamily: fonts.mono, fontSize: 10, lineHeight: 1.5,
                            padding: `3px ${spacing.xs}px 2px`,
                            borderRadius: radius.sm,
                            border: `1px solid ${vocabColor(ki)}25`,
                            background: `${vocabColor(ki)}08`,
                            color: colors.ink,
                          }}>
                            <span style={{ color: vocabColor(ki), fontWeight: weights.medium, marginRight: 4, whiteSpace: "nowrap" }}>{kv.k}</span>{kv.v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

function DV({ value, defense, vocab, context: contextProp }: { value: string; defense: string; vocab?: VocabEntry[]; context?: string }) {
  const [open, setOpen] = useState(false);
  const stepLabel = useContext(StepContext);
  const context = contextProp ?? stepLabel;
  return (
    <>
      <span
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          borderBottom: `1px dashed ${colors.ink3}`,
          cursor: "pointer",
          fontWeight: weights.medium,
          color: colors.ink,
        }}
      >
        {value}
      </span>
      {open && <DefenseModal value={value} defense={defense} vocab={vocab} context={context} onClose={() => setOpen(false)} />}
    </>
  );
}

function Chip({ children, color = colors.ink2 }: { children: string; color?: string }) {
  return (
    <span style={{ ...typography.label, padding: `${spacing.xxs}px ${spacing.xs}px`, borderRadius: radius.sm, border: `1px solid ${color}30`, background: `${color}08`, color, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function NodeBox({
  label,
  sublabel,
  color = colors.ink,
  dashed,
  children,
  style,
}: {
  label: string;
  sublabel?: string;
  color?: string;
  dashed?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}) {
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
          fontWeight: weights.medium,
          color,
          marginBottom: sublabel || children ? spacing.xxs : 0,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          style={{
            ...typography.caption,
            color: colors.ink3,
          }}
        >
          {sublabel}
        </div>
      )}
      {children}
    </div>
  );
}

function SpecRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: `${spacing.xxs}px 0`,
        ...typography.stat,
        borderBottom: borders.rule,
      }}
    >
      <span style={{ color: colors.ink3 }}>{label}</span>
      <span style={{ color: color ?? colors.ink, fontWeight: weights.medium }}>
        {value}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOM CARD — expandable hardware component card
   ═══════════════════════════════════════════════════════════════════════════ */

type BomItem = { label: string; color: string; desc: ReactNode; iface: string; draw: string; gpio: string };

function BomCard({ item, isLast }: { item: BomItem; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const specs = [
    ...(item.iface !== "—" ? [{ k: "Interface", v: item.iface }] : []),
    ...(item.draw !== "—" ? [{ k: "Power", v: item.draw }] : []),
    ...(item.gpio !== "—" ? [{ k: "GPIO", v: item.gpio }] : []),
  ];

  return (
    <div
      onClick={() => setOpen((o) => !o)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      aria-expanded={open}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }}
      style={{
        cursor: "pointer",
        borderBottom: isLast ? "none" : `1px solid ${colors.rule}`,
        background: open ? `${item.color}04` : hovered ? colors.inkFaint : "transparent",
        transition: "all 0.2s ease",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
        <span style={{ ...typography.label, fontWeight: weights.medium, color: open ? item.color : colors.ink, flex: 1, letterSpacing: "0.08em", transition: "color 0.2s" }}>
          {item.label}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease, opacity 0.2s", opacity: hovered || open ? 0.6 : 0.25, flexShrink: 0 }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {open && (
        <StepContext.Provider value={item.label}>
        <div style={{ padding: `0 ${spacing.md}px ${spacing.md}px` }}>
          <div style={{ ...typography.body, marginBottom: specs.length > 0 ? spacing.sm : 0 }}>{item.desc}</div>
          {specs.length > 0 && (
            <div style={{ display: "flex", gap: spacing.lg, flexWrap: "wrap", paddingTop: spacing.xs, borderTop: `1px solid ${item.color}15` }}>
              {specs.map((s) => (
                <div key={s.k}>
                  <div style={{ ...typography.label, color: colors.ink3, fontSize: 8, marginBottom: 3 }}>{s.k}</div>
                  <div style={{ fontFamily: fonts.mono, fontSize: 10, fontWeight: weights.medium, color: colors.ink, lineHeight: 1 }}>{s.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        </StepContext.Provider>
      )}
    </div>
  );
}

function BomGrid({ items }: { items: BomItem[] }) {
  const left = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 !== 0);
  return (
    <div style={{ display: "flex", border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.lg }}>
      <div style={{ flex: 1 }}>
        {left.map((item, i) => <BomCard key={item.label} item={item} isLast={i === left.length - 1} />)}
      </div>
      <div style={{ width: 1, background: colors.rule, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        {right.map((item, i) => <BomCard key={item.label} item={item} isLast={i === right.length - 1} />)}
      </div>
    </div>
  );
}

interface PowerItem {
  label: string;
  value: string;
  pct: number;
  detail: ReactNode;
  specs: { k: string; v: string }[];
}

function PowerBudgetCard({ title, color, hero, heroSub, items }: { title: string; color: string; hero: string; heroSub: string; items: PowerItem[] }) {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  return (
    <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: `${spacing.sm}px ${spacing.md}px`, borderBottom: `1px solid ${colors.rule}` }}>
        <Label color={color} style={{ marginBottom: spacing.xs }}>{title}</Label>
        <div style={{ display: "flex", alignItems: "baseline", gap: spacing.xs }}>
          <span style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: weights.light, color, lineHeight: 1 }}>{hero}</span>
          <span style={{ ...typography.label, color: colors.ink3 }}>{heroSub}</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {items.map((item, i) => {
          const isOpen = expandedItem === i;
          return (
            <div key={item.label} style={{ borderBottom: i < items.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
              <div
                onClick={() => setExpandedItem(isOpen ? null : i)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: spacing.xs, padding: `${spacing.sm}px ${spacing.md}px`, transition: "background 0.15s" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink, lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{item.value}</div>
                </div>
                <GaugeBar value={item.pct} color={color} height={3} style={{ width: 48, flexShrink: 0, marginLeft: spacing.sm }} />
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: isOpen ? 0.5 : 0.2, flexShrink: 0 }}>
                  <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {isOpen && (
                <StepContext.Provider value={item.label}>
                <div style={{ padding: `0 ${spacing.md}px ${spacing.md}px` }}>
                  <div style={{ ...typography.body, color: colors.ink2, marginBottom: spacing.xs }}>{item.detail}</div>
                  <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
                    {item.specs.map((sp) => (
                      <span key={sp.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                        <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{sp.k}</span>{sp.v}
                      </span>
                    ))}
                  </div>
                </div>
                </StepContext.Provider>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const VAD_STEPS: { step: string; desc: string; color: string; detail: ReactNode; specs: { k: string; v: string }[] }[] = [
  { step: "Default", desc: "WiFi OFF, ~80 mA idle", color: colors.help, detail: <>The device's resting state. ESP32-S3 runs at <DV value="240 MHz" defense="The ESP32-S3 stays at full clock speed even during idle because dynamic frequency scaling is unvalidated in v1. At 240 MHz, the CPU can instantly respond to VAD speech onset without a frequency ramp-up delay." vocab={[
    { term: "dynamic frequency scaling", definition: "Automatically adjusting CPU clock speed based on workload to trade performance for power savings." },
    { term: "frequency ramp-up", definition: "The time required for the PLL to stabilize after a clock speed change, typically 1-2 ms on the ESP32-S3." },
  ]} /> with mic and VAD active, but <DV value="WiFi radio" defense="The WiFi radio is the single largest variable power consumer (80-120 mA when active). Keeping it fully powered off during silence reduces total device draw from ~180 mA to ~80 mA — a 55% reduction that directly extends battery life proportional to silence time." vocab={[
    { term: "WiFi radio", definition: "The 802.11n transceiver on the ESP32-S3, including the RF front-end, baseband processor, and MAC layer — all powered together." },
    { term: "RF front-end", definition: "The analog radio circuitry that handles signal amplification, filtering, and frequency conversion between baseband and antenna." },
  ]} /> is completely powered off. This is the lowest-power active state — the device is always listening but never transmitting.</>, specs: [{ k: "Power", v: "~80 mA" }, { k: "WiFi", v: "Off" }] },
  { step: "Speech onset", desc: "WiFi association ~300 ms", color: zone.audio, detail: <>VAD detects speech and sets the <DV value="speech-active flag" defense="A boolean flag in shared memory that the VAD task on Core 0 sets when speech is detected. The WiFi task on Core 1 polls this flag every 10 ms. Using a simple flag rather than a FreeRTOS event group avoids cross-core synchronization overhead." vocab={[
    { term: "shared memory", definition: "A memory region accessible by both CPU cores, used for lightweight inter-core communication without the overhead of message queues." },
    { term: "FreeRTOS event group", definition: "A synchronization primitive that allows tasks to wait for combinations of events. More powerful than a flag but adds ~5 us overhead per check." },
  ]} />. The WiFi task on Core 1 begins association using the <DV value="stored BSSID" defense="The WiFi access point's BSSID (MAC address) is cached in NVS after the first connection. On subsequent connections, the ESP32-S3 skips the 802.11 scanning phase entirely and associates directly, reducing connection time from ~2 seconds to ~300 ms." vocab={[
    { term: "BSSID", definition: "Basic Service Set Identifier — the MAC address of the WiFi access point. Storing it eliminates the need to scan for available networks on reconnect." },
    { term: "NVS", definition: "Non-Volatile Storage — a key-value store in flash memory that persists across reboots, used for WiFi credentials, device config, and cached network info." },
  ]} />, skipping the scan phase. <DV value="WebSocket" defense="WebSocket provides a persistent, full-duplex connection over TCP/TLS. Reconnecting to an existing session avoids re-authentication and re-negotiation — the API Gateway identifies the device by its mTLS certificate and resumes the session within one round-trip." vocab={[
    { term: "full-duplex", definition: "Both sides can send data simultaneously over the same connection, unlike HTTP request-response which is half-duplex." },
    { term: "mTLS certificate", definition: "Mutual TLS — both client and server present certificates for authentication. The device's certificate is provisioned during manufacturing." },
  ]} /> reconnects to the existing session on the API Gateway.</>, specs: [{ k: "Association", v: "~300 ms" }, { k: "Method", v: "Stored BSSID" }] },
  { step: "During speech", desc: "Opus stream at 16 kbps", color: zone.device, detail: <>WiFi stays on continuously. Opus-encoded frames stream over the WebSocket at <DV value="16 kbps CBR" defense="16 kbps constant bit rate is the sweet spot for speech on constrained bandwidth. Each 20 ms frame produces exactly ~40 bytes, making buffer management predictable. At this rate, Opus achieves near-transparent speech quality (POLQA >4.0) using the SILK mode optimized for voice." vocab={[
    { term: "CBR", definition: "Constant Bit Rate — every encoded frame is the same size, simplifying buffer allocation and bandwidth reservation." },
    { term: "POLQA", definition: "Perceptual Objective Listening Quality Analysis — an ITU standard for measuring speech quality on a 1-5 scale. Scores above 4.0 are considered near-transparent." },
  ]} />. The <DV value="three cloud consumers" defense="STT (Deepgram), Tonal (wav2vec2-emotion), and Environment (YAMNet) subscribe independently to the same NATS JetStream subject. Parallel processing reduces total wall-clock time from ~950 ms (sequential) to ~800 ms (bottlenecked on STT). Each consumer operates independently — one failing doesn't block the others." vocab={[
    { term: "NATS JetStream", definition: "A persistent messaging layer built on NATS that provides at-least-once delivery, consumer replay, and message retention — used for fan-out to parallel analysis services." },
    { term: "fan-out", definition: "A messaging pattern where a single published message is delivered to multiple independent subscribers simultaneously." },
  ]} /> (STT, Tonal, Environment) process in parallel. Power peaks at ~180 mA.</>, specs: [{ k: "Power", v: "~180 mA peak" }, { k: "Stream", v: "16 kbps Opus" }] },
  { step: "Speech ends", desc: "2s hold-off timer", color: zone.storage, detail: <>VAD detects silence but doesn't immediately kill WiFi. A 2-second <DV value="hold-off timer" defense="The hold-off timer prevents rapid WiFi on/off cycling during natural speech pauses. Each WiFi reconnect takes ~300 ms and costs ~50 mA-seconds of energy. If the user pauses more than once per 6 seconds, cycling costs more power than simply keeping WiFi on." vocab={[
    { term: "hold-off timer", definition: "A delay between detecting silence and actually powering down WiFi, designed to absorb brief pauses without triggering a reconnect cycle." },
    { term: "mA-seconds", definition: "A unit of electrical charge (equivalent to millicoulombs) used to quantify the energy cost of transient events like WiFi association." },
  ]} /> prevents rapid on/off cycling during <DV value="natural speech pauses" defense="Conversational speech includes pauses of 200 ms - 2 s for breaths, thinking, and turn-taking. Without the hold-off timer, each pause would trigger a WiFi disconnect/reconnect cycle, wasting ~50 mA-seconds per cycle and adding 300 ms latency when speech resumes." vocab={[
    { term: "turn-taking", definition: "The natural rhythm of conversation where speakers alternate, creating silences of 200 ms - 1 s that should not be interpreted as end-of-speech." },
    { term: "reconnect cycle", definition: "The full sequence of WiFi power-on, BSSID association, TCP connect, TLS handshake, and WebSocket upgrade — taking ~300 ms total." },
  ]} /> (breaths, thinking gaps). If speech resumes within 2 s, no reconnection is needed.</>, specs: [{ k: "Timer", v: "2 seconds" }, { k: "Purpose", v: "Prevent cycling" }] },
  { step: "Hold-off expires", desc: "WiFi off, back to idle", color: colors.help, detail: <>No speech detected for 2 seconds. WiFi radio powers down completely. Device returns to ~80 mA idle baseline. The <DV value="aggregator" defense="A cloud-side service that collects and merges results from the three parallel analysis consumers (STT, Tonal, Environment). It aligns timestamps, resolves conflicts, and produces a single structured Tier 1 payload every 5 seconds." vocab={[
    { term: "aggregator", definition: "A stateful cloud service that buffers incoming analysis results and emits merged payloads on a fixed time window, ensuring all three consumers' outputs are combined." },
    { term: "timestamp alignment", definition: "Matching analysis results from different consumers to the same audio segment, compensating for varying processing latencies across STT, tonal, and environment pipelines." },
  ]} /> on the cloud side finalizes any pending <DV value="5-second window" defense="The aggregator emits one Tier 1 payload per 5-second window. This batching interval balances temporal resolution (fine enough to capture emotional shifts within a sentence) against payload overhead (fewer, larger payloads reduce per-message framing cost)." vocab={[
    { term: "temporal resolution", definition: "The granularity of time-based data. 5-second windows capture within-sentence emotional shifts while smoothing out frame-level noise." },
    { term: "framing cost", definition: "The overhead bytes added by WebSocket, TLS, and TCP headers to each transmitted message — amortized better over larger payloads." },
  ]} /> and sends the last <DV value="Tier 1 payload" defense="A structured JSON document containing all analysis results (transcript, tonal scores, environment classification) keyed by timestamp. Schema-versioned for backwards compatibility. Typical size: 2-4 KB per 5-second window." vocab={[
    { term: "Tier 1", definition: "The first level of Madie's data compression hierarchy — raw structured signals from cloud analysis, retained for 1 hour on-device before being compressed into Tier 2 summaries." },
    { term: "schema-versioned", definition: "Each payload includes a version field so that older payloads can be parsed correctly even after the schema evolves in future firmware updates." },
  ]} />.</>, specs: [{ k: "Power", v: "~80 mA" }, { k: "Cloud", v: "Final aggregation" }] },
];

function VadCycleCard() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  return (
    <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden" }}>
      <div style={{ padding: `${spacing.sm}px ${spacing.md}px`, borderBottom: `1px solid ${colors.rule}` }}>
        <Label color={zone.device} style={{ marginBottom: 0 }}>VAD-Gated WiFi Cycle</Label>
      </div>
      {VAD_STEPS.map((s, i) => {
        const isOpen = expandedStep === i;
        return (
          <div key={s.step} style={{ borderBottom: i < VAD_STEPS.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
            <div
              onClick={() => setExpandedStep(isOpen ? null : i)}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: spacing.xs, padding: `${spacing.sm}px ${spacing.md}px`, transition: "background 0.15s" }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...typography.label, fontWeight: weights.medium, color: s.color, lineHeight: 1.3 }}>{s.step}</div>
                <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{s.desc}</div>
              </div>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: isOpen ? 0.5 : 0.2, flexShrink: 0 }}>
                <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isOpen && (
              <StepContext.Provider value={s.step}>
              <div style={{ padding: `0 ${spacing.md}px ${spacing.md}px`, paddingLeft: spacing.md + 6 + spacing.xs }}>
                <div style={{ ...typography.body, color: colors.ink2, marginBottom: spacing.xs }}>{s.detail}</div>
                <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
                  {s.specs.map((sp) => (
                    <span key={sp.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                      <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{sp.k}</span>{sp.v}
                    </span>
                  ))}
                </div>
              </div>
              </StepContext.Provider>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FREERTOS TASK COLUMN — collapsible task rows with DVs
   ═══════════════════════════════════════════════════════════════════════════ */

interface FreeRtosTask {
  name: string;
  pri: number;
  stack: string;
  wake: string;
  desc: string;
  detail: ReactNode;
  specs: { k: string; v: string }[];
}

function FreeRtosColumn({ title, subtitle, color, tasks }: { title: string; subtitle: string; color: string; tasks: FreeRtosTask[] }) {
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  return (
    <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden" }}>
      <div style={{ padding: `${spacing.sm}px ${spacing.md}px`, borderBottom: `1px solid ${colors.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.xs }}>
          <Label style={{ marginBottom: 0 }}>{title}</Label>
          <Caption style={{ color: colors.ink3 }}>{subtitle}</Caption>
        </div>
      </div>
      {tasks.map((t, i) => {
        const isOpen = expandedTask === i;
        return (
          <div key={t.name} style={{ borderBottom: i < tasks.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
            <div
              onClick={() => setExpandedTask(isOpen ? null : i)}
              style={{ cursor: "pointer", display: "grid", gridTemplateColumns: "1fr 36px auto auto auto", alignItems: "center", gap: spacing.xs, padding: `${spacing.sm}px ${spacing.md}px` }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink, lineHeight: 1.3 }}>{t.name}</div>
                <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{t.desc}</div>
              </div>
              <GaugeBar value={t.pri * 16.6} color={color} height={3} style={{ width: 36 }} />
              <span style={{ ...typography.label, color: colors.ink3, whiteSpace: "nowrap" }}>P{t.pri}</span>
              <span style={{ ...typography.label, color: colors.ink3, whiteSpace: "nowrap" }}>{t.stack}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: isOpen ? 0.5 : 0.2, flexShrink: 0 }}>
                <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isOpen && (
              <StepContext.Provider value={t.name}>
              <div style={{ padding: `0 ${spacing.md}px ${spacing.md}px` }}>
                <div style={{ ...typography.body, color: colors.ink2, marginBottom: spacing.xs }}>{t.detail}</div>
                <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
                  {t.specs.map((sp) => (
                    <span key={sp.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                      <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{sp.k}</span>{sp.v}
                    </span>
                  ))}
                </div>
                <div style={{ ...typography.stat, color: colors.ink3, marginTop: spacing.xs }}>Wake: {t.wake}</div>
              </div>
              </StepContext.Provider>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIO PIPELINE — collapsible step rows with flow connectors
   ═══════════════════════════════════════════════════════════════════════════ */

const AUDIO_PIPELINE_STEPS: PipelineStep[] = [
  { label: "INMP441", detail: "I2S MEMS Microphone", color: zone.audio, flowLabel: "I2S DMA",
    expanded: <>Always-on <DV value="MEMS microphone" defense="Micro-Electro-Mechanical Systems microphone producing digital I2S output directly — no external ADC needed. The INMP441 was chosen for its low power (2 mA), high SNR (61 dB), and native I2S interface matching the ESP32-S3's peripheral." vocab={[
      { term: "MEMS", definition: "Micro-Electro-Mechanical Systems — microscopic structures etched into silicon that convert sound pressure waves into electrical signals." },
      { term: "SNR", definition: "Signal-to-Noise Ratio — the difference in dB between the desired signal and background noise. Higher SNR means cleaner audio capture." },
    ]} /> sampling <DV value="16-bit PCM at 16 kHz" defense="16-bit depth provides 96 dB dynamic range. 16 kHz sample rate captures the full speech frequency band (up to 8 kHz per Nyquist) while being the native input format for Deepgram, wav2vec2, and YAMNet — no resampling needed." /> via I2S DMA directly into PSRAM ring buffer.</>,
    specs: [{ k: "Sample rate", v: "16 kHz" }, { k: "Format", v: "16-bit PCM" }, { k: "Power", v: "2 mA" }] },
  { label: "PSRAM Ring Buffer", detail: "64 KB circular buffer", color: zone.audio, flowLabel: "continuous frames",
    expanded: <><DV value="64 KB" defense="64 KB at 16 kHz 16-bit mono holds ~2 seconds of raw audio. This provides the 500 ms pre-roll needed for VAD onset capture (speech starts before VAD detects it) plus 1.5 seconds of buffer for jitter in the Opus encoder task." vocab={[
      { term: "pre-roll", definition: "Audio captured before the VAD trigger. Since VAD has detection latency, the pre-roll ensures the beginning of speech is not lost." },
    ]} /> circular buffer in <DV value="PSRAM" defense="External pseudo-static RAM accessed via octal SPI. Used instead of internal SRAM (only 512 KB) because the ring buffer must coexist with FreeRTOS stacks, WiFi buffers, and Opus encoder state. PSRAM latency is higher but acceptable for streaming audio." vocab={[
      { term: "PSRAM", definition: "Pseudo-Static RAM — external memory that behaves like SRAM but uses DRAM cells with built-in refresh. The ESP32-S3 supports up to 16 MB via octal SPI." },
    ]} />. <DV value="500 ms pre-roll" defense="VAD detection latency is typically 30-100 ms, but speech onset contains critical phonemes in the first few hundred milliseconds. 500 ms pre-roll guarantees no speech content is lost, even for abrupt utterances." /> captures speech onset before VAD triggers.</>,
    specs: [{ k: "Capacity", v: "~2 seconds" }, { k: "Pre-roll", v: "500 ms" }, { k: "Location", v: "PSRAM" }] },
  { label: "ESP-SR WakeNet", detail: "Voice Activity Detection", color: zone.device, flowLabel: "speech flag → WiFi + Opus",
    expanded: <>Neural VAD running on <DV value="Core 0, priority 5" defense="Core 0 is dedicated to real-time sensor tasks. Priority 5 (of 7 max) ensures VAD preempts IMU polling (priority 3) but yields to audio_capture DMA (priority 6). This guarantees speech detection within one I2S frame period." vocab={[
      { term: "priority 5", definition: "FreeRTOS task priority level. Higher numbers preempt lower ones. Audio capture (6) > VAD (5) > IMU (3) ensures audio is never dropped." },
    ]} />. Gates both the <DV value="Opus encoder" defense="Opus encoding only runs when VAD detects speech. During silence, the encoder task is suspended — saving ~10 mA of CPU power. When speech starts, the encoder resumes and begins consuming frames from the ring buffer." /> and <DV value="WiFi radio" defense="The single largest power optimization. WiFi draws 80-120 mA when active. VAD-gating means WiFi is only on during speech — battery life is directly proportional to how much the user talks. This one gate controls 40-50% of total power." />.</>,
    specs: [{ k: "Engine", v: "ESP-SR WakeNet" }, { k: "Core", v: "0 (priority 5)" }, { k: "Latency", v: "<50 ms" }] },
  { label: "Opus Encoder", detail: "Core 1, priority 5", color: zone.audio, flowLabel: "Opus frames",
    expanded: <>Real-time encoding at <DV value="16 kbps CBR" defense="Constant bitrate at 16 kbps achieves near-transparent speech quality (POLQA >4.0). CBR over VBR because each 20 ms frame is exactly ~40 bytes — predictable size simplifies ring buffer bookkeeping and WiFi TX scheduling." vocab={[
      { term: "CBR", definition: "Constant Bit Rate — every frame uses the same number of bits regardless of audio complexity. Produces predictable output sizes at the cost of slightly lower quality during complex passages." },
      { term: "POLQA", definition: "Perceptual Objective Listening Quality Analysis — the ITU-T standard for measuring speech quality. Scores range from 1 (bad) to 5 (excellent)." },
    ]} /> using <DV value="SILK mode" defense="Opus has two internal codecs: SILK (optimized for speech) and CELT (optimized for music). At 16 kbps, SILK produces better speech quality than CELT and uses less CPU. The encoder auto-selects SILK when it detects voice-like input." vocab={[
      { term: "SILK", definition: "Originally developed by Skype, now part of Opus. A speech-specific codec that models the human vocal tract for efficient compression of voice signals." },
    ]} />. <DV value="20 ms frames" defense="Opus's default frame size — the optimal trade-off between latency and compression efficiency. Each frame produces ~40 bytes, consumed by the WiFi streamer task." /> (~40 bytes each) on Core 1.</>,
    specs: [{ k: "Bitrate", v: "16 kbps CBR" }, { k: "Frame", v: "20 ms / ~40 bytes" }, { k: "Mode", v: "SILK" }] },
  { label: "WiFi Streamer", detail: "WebSocket → API Gateway", color: zone.cloud,
    expanded: <>Single <DV value="WebSocket" defense="Persistent bidirectional connection avoids repeated TLS handshake overhead (~200 ms each). The same connection carries Opus frames upstream and Tier 1 payloads downstream. Auto-reconnect with exponential backoff on disconnect." vocab={[
      { term: "WebSocket", definition: "A protocol providing full-duplex communication over a single TCP connection. Unlike HTTP, both sides can send data at any time without request/response pairing." },
    ]} /> stream over <DV value="TLS 1.3" defense="TLS 1.3 eliminates the 1-RTT overhead of TLS 1.2 (0-RTT resumption on reconnect), reduces cipher negotiation, and is required for mTLS certificate pinning. Fallback to TLS 1.2 is explicitly disabled." vocab={[
      { term: "mTLS", definition: "Mutual TLS — both the client (device) and server present certificates, proving identity in both directions. Prevents unauthorized devices from connecting to the cloud." },
      { term: "0-RTT", definition: "Zero Round-Trip Time resumption — allows the client to send data immediately on reconnect using cached session keys, without waiting for a handshake." },
    ]} /> with <DV value="mTLS" defense="Each device has a unique X.509 certificate stored in encrypted NVS. The API Gateway (Kong) validates the device certificate on every connection — no API keys, no shared secrets." /> through Kong API Gateway.</>,
    specs: [{ k: "Protocol", v: "WSS (TLS 1.3)" }, { k: "Auth", v: "mTLS (X.509)" }, { k: "Gateway", v: "Kong" }] },
];

function AudioPipelineCard() {
  return (
    <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden" }}>
      {AUDIO_PIPELINE_STEPS.map((step, i) => (
        <StepRow key={step.label} step={step} isLast={i === AUDIO_PIPELINE_STEPS.length - 1} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FLASH PARTITION TABLE — collapsible partition rows with DVs
   ═══════════════════════════════════════════════════════════════════════════ */

const FLASH_PARTITIONS: { name: string; size: string; pct: number; color: string; offset: string; detail: ReactNode; specs: { k: string; v: string }[] }[] = [
  { name: "nvs_encrypted", size: "64 KB", pct: 0.2, color: zone.privacy, offset: "0x9000",
    detail: <>Encrypted <DV value="Non-Volatile Storage" defense="NVS is ESP-IDF's key-value store for persistent configuration. Encrypted with AES-XTS using an eFuse-derived key — the encryption key is burned into silicon and cannot be read back via software or JTAG. Even physical flash chip extraction yields only ciphertext." vocab={[
      { term: "AES-XTS", definition: "A block cipher mode designed for storage encryption. XTS handles variable-length data and prevents block-level pattern analysis across sectors." },
      { term: "eFuse", definition: "One-time-programmable bits burned into the ESP32's silicon. Once written, they cannot be erased or read back — used for storing encryption keys securely." },
    ]} /> partition. Stores <DV value="WiFi credentials" defense="SSID, password, and cached BSSID for fast reconnection. Stored encrypted because WiFi credentials are the most common attack vector for IoT devices — a compromised credential grants network access." />, X.509 device certificate + private key, and <DV value="per-tier AES-256-GCM keys" defense="Each tier (1-4) has its own encryption key, enabling per-tier crypto-shredding. Deleting a tier's key renders all data in that tier unrecoverable without touching other tiers. GCM mode provides both confidentiality and integrity verification." vocab={[
      { term: "AES-256-GCM", definition: "256-bit Advanced Encryption Standard in Galois/Counter Mode. Provides authenticated encryption — data is both encrypted and integrity-protected in a single pass." },
      { term: "crypto-shredding", definition: "Destroying the encryption key instead of overwriting the data. The encrypted data remains on flash but is computationally irretrievable without the key." },
    ]} />.</>,
    specs: [{ k: "Encryption", v: "AES-XTS (eFuse key)" }, { k: "Contents", v: "WiFi, certs, tier keys" }] },
  { name: "otadata", size: "8 KB", pct: 0.02, color: colors.ink3, offset: "0x19000",
    detail: <><DV value="OTA boot slot selector" defense="A small partition that tracks which firmware slot (ota_0 or ota_1) is currently active. After a successful OTA update, this partition is updated to point to the new slot. If the new firmware fails to boot within 30 seconds, the bootloader reverts this pointer — automatic rollback." vocab={[
      { term: "bootloader", definition: "The first code that runs when the ESP32 powers on. It reads otadata to decide which firmware slot to boot, and handles rollback if the active slot fails." },
    ]} />. Two copies for redundancy — if one is corrupted during a power loss, the other is used.</>,
    specs: [{ k: "Purpose", v: "A/B slot toggle" }, { k: "Redundancy", v: "Dual copy" }] },
  { name: "ota_0", size: "4 MB", pct: 12.5, color: zone.device, offset: "0x20000",
    detail: <>Firmware slot A — the primary boot target. All firmware images are <DV value="Ed25519-signed" defense="Ed25519 provides 128-bit security with fast verification (~50 µs on ESP32-S3). The public key is stored in eFuse — it cannot be replaced by a compromised firmware update. RSA was rejected for its 10x slower verification and 8x larger signatures." vocab={[
      { term: "Ed25519", definition: "An elliptic curve digital signature algorithm. Fast, compact (64-byte signatures), and immune to timing attacks — ideal for embedded signature verification." },
    ]} />. If the new firmware fails to call esp_ota_mark_app_valid() within <DV value="30 seconds" defense="30 seconds covers the longest observed boot sequence (WiFi association + NVS mount + LittleFS mount + sensor init). If the firmware hangs or crash-loops, the watchdog triggers and the bootloader rolls back to the other slot automatically." />, the bootloader rolls back to ota_1.</>,
    specs: [{ k: "Signing", v: "Ed25519" }, { k: "Rollback", v: "30s watchdog" }] },
  { name: "ota_1", size: "4 MB", pct: 12.5, color: zone.device, offset: "0x420000",
    detail: <>Firmware slot B — the inactive slot that receives OTA updates. While ota_0 is running, new firmware is written to ota_1 without affecting the running system. The <DV value="dual A/B scheme" defense="Dual slots ensure the device always has a known-good firmware to fall back to. Single-slot OTA risks bricking if the update is corrupted during transfer or if the new firmware has a critical bug. The cost is 4 MB of flash — a worthwhile trade for field reliability." vocab={[
      { term: "A/B scheme", definition: "Two firmware partitions that alternate roles. One runs while the other receives updates. On success, they swap; on failure, the device stays on the working slot." },
    ]} /> means updates are atomic — the device is never in a half-updated state.</>,
    specs: [{ k: "Role", v: "Inactive / update target" }, { k: "Size", v: "4 MB (mirrors ota_0)" }] },
  { name: "tier_store", size: "12 MB", pct: 37.5, color: zone.storage, offset: "0x820000",
    detail: <><DV value="LittleFS" defense="LittleFS over SPIFFS because: built-in wear leveling distributes writes across flash blocks (critical for a device that writes continuously), power-loss resilience prevents corruption on unexpected reboot, and directory support organizes tiers into separate paths (/tier1, /tier2, etc.). SPIFFS is deprecated in ESP-IDF v5+." vocab={[
      { term: "LittleFS", definition: "A filesystem designed for microcontrollers. Resilient to power loss, supports wear leveling, and uses bounded RAM regardless of filesystem size." },
      { term: "wear leveling", definition: "Distributing write operations across all flash blocks to prevent any single block from wearing out prematurely. Flash cells have a limited number of write cycles (~10,000-100,000)." },
    ]} /> filesystem holding Tiers 1-4 data, <DV value="offline audio buffer (4 MB)" defense="4 MB is reserved for buffering Opus frames when WiFi is unavailable (e.g. user walks away from router). At 16 kbps, 4 MB holds ~33 minutes of audio — enough to cover most connectivity gaps. When WiFi returns, the buffer is drained to the cloud in priority order." />, and social context packets. The largest partition at 37.5% of total flash.</>,
    specs: [{ k: "Filesystem", v: "LittleFS" }, { k: "Contents", v: "Tiers 1-4 + offline buffer" }, { k: "Max util.", v: "75% (LittleFS limit)" }] },
  { name: "glyph_store", size: "256 KB", pct: 0.8, color: zone.app, offset: "0x1420000",
    detail: <><DV value="22 glyph PBM bitmaps" defense="PBM (Portable Bitmap) format — each glyph is a 200×200 1-bit image at 5 KB each (~110 KB total). PBM was chosen over PNG because it requires zero decompression on the ESP32 — the bitmap can be sent directly to the e-ink display driver via SPI without CPU-intensive decoding." vocab={[
      { term: "PBM", definition: "Portable Bitmap — the simplest image format. No compression, no headers to parse. Each pixel is one bit. Ideal for 1-bit e-ink displays where decompression would waste CPU." },
    ]} /> (~110 KB) + <DV value="protobuf metadata" defense="Each glyph has associated metadata: semantic tags, emotional valence mappings, valid combination rules, and display positioning hints. Protobuf over JSON because it's 3-5x smaller and has zero-copy deserialization — important on a device with limited RAM." vocab={[
      { term: "protobuf", definition: "Protocol Buffers — Google's binary serialization format. Compact, strongly typed, and supports schema evolution for forwards/backwards compatibility." },
    ]} /> (~100 KB). Encrypted with a separate eFuse key for independent crypto-shredding.</>,
    specs: [{ k: "Bitmaps", v: "22 × 5 KB PBM" }, { k: "Metadata", v: "~100 KB protobuf" }, { k: "Encryption", v: "Separate eFuse key" }] },
  { name: "coredump", size: "128 KB", pct: 0.4, color: colors.ink3, offset: "0x1460000",
    detail: <><DV value="Crash diagnostics" defense="When the ESP32 encounters a fatal error (stack overflow, null pointer, watchdog timeout), it writes a core dump to this partition before resetting. The dump contains the full register state, stack traces for all tasks, and the last 256 bytes of each task's stack — enough to diagnose most crashes without a debugger." vocab={[
      { term: "core dump", definition: "A snapshot of the CPU state at the moment of a crash. Contains register values, stack pointers, and memory contents — the embedded equivalent of a crash report." },
    ]} /> — stack trace and register dump. Retrieved over USB or BLE for post-mortem analysis. The 128 KB size covers the worst case (all 8 FreeRTOS tasks with full stack dumps).</>,
    specs: [{ k: "Contents", v: "Stack traces + registers" }, { k: "Retrieval", v: "USB / BLE" }] },
  { name: "unallocated", size: "~11.5 MB", pct: 36, color: colors.ink3, offset: "0x1480000",
    detail: <>Future headroom — <DV value="~11.5 MB" defense="36% of total flash is deliberately unallocated. This provides room for: tier_store expansion if compression ratios change, additional glyph inventory (v2 may grow from 22 to 40+ glyphs), new partition types (e.g. ML model storage for on-device inference), and general growth as features are added." /> of the 32 MB flash is reserved. LittleFS performance degrades significantly above <DV value="75% utilization" defense="LittleFS uses a log-structured approach that requires free blocks for garbage collection. Above 75% utilization, the filesystem must compact data more frequently, increasing write latency and flash wear. Keeping utilization below 75% ensures consistent write performance and extends flash lifespan." vocab={[
      { term: "garbage collection", definition: "The filesystem process of reclaiming space from deleted files. Requires copying live data to new blocks and erasing old ones — slower when free space is scarce." },
    ]} />, so total usable capacity is effectively ~24 MB.</>,
    specs: [{ k: "Reserved", v: "~11.5 MB (36%)" }, { k: "Effective capacity", v: "~24 MB at 75%" }] },
];

function FlashPartitionTable() {
  const [expandedPart, setExpandedPart] = useState<number | null>(null);
  return (
    <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", display: "grid", gridTemplateColumns: "auto auto 80px 1fr auto auto" }}>
      {FLASH_PARTITIONS.map((p, i) => {
        const isOpen = expandedPart === i;
        return (
          <div key={p.name} style={{ display: "contents" }}>
            <div
              onClick={() => setExpandedPart(isOpen ? null : i)}
              style={{ cursor: "pointer", display: "grid", gridTemplateColumns: "subgrid", gridColumn: "1 / -1", alignItems: "center", gap: spacing.sm, padding: `${spacing.sm}px ${spacing.md}px`, borderBottom: !isOpen && i < FLASH_PARTITIONS.length - 1 ? `1px solid ${colors.rule}` : isOpen ? `1px solid ${colors.rule}` : "none" }}
            >
              <span style={{ ...typography.label, fontWeight: weights.medium, color: p.color }}>{p.name}</span>
              <span style={{ ...typography.label, color: colors.ink2, marginLeft: 92, textAlign: "right" }}>{p.size}</span>
              <GaugeBar value={Math.max(p.pct, 0.5)} color={p.color} height={3} />
              <div />
              <span style={{ ...typography.label, color: colors.ink3, textAlign: "right" }}>{p.offset}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: isOpen ? 0.5 : 0.2 }}>
                <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isOpen && (
              <StepContext.Provider value={p.name}>
              <div style={{ gridColumn: "1 / -1", padding: `${spacing.md}px`, borderBottom: i < FLASH_PARTITIONS.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
                <div style={{ ...typography.body, color: colors.ink2, marginBottom: spacing.xs }}>{p.detail}</div>
                <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
                  {p.specs.map((sp) => (
                    <span key={sp.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                      <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{sp.k}</span>{sp.v}
                    </span>
                  ))}
                </div>
              </div>
              </StepContext.Provider>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 1: DEVICE ARCHITECTURE
   ═══════════════════════════════════════════════════════════════════════════ */

function DeviceArchitecture() {
  return (
    <div>
      <ZoneLabel color={zone.device}>On-Device — ESP32-S3</ZoneLabel>

      {/* Hardware BOM */}
      <H3 style={{ marginBottom: spacing.md }}>Hardware BOM</H3>
      <BomGrid items={[
        { label: "ESP32-S3-N32R16V", color: zone.device, desc: <>Waveshare <DV value="dual-core Xtensa LX7" defense="Two cores allow hard partitioning: Core 0 for real-time sensor tasks (audio, VAD, IMU) and Core 1 for network and storage. This eliminates cross-domain contention — a WiFi reconnect on Core 1 can never cause an audio buffer underrun on Core 0." vocab={[
          { term: "Xtensa LX7", definition: "Tensilica's 32-bit RISC processor architecture used in the ESP32-S3. Supports hardware DSP instructions for audio processing." },
          { term: "hard partitioning", definition: "Permanently assigning each CPU core to specific task domains, rather than letting the scheduler place tasks freely across cores." },
        ]} /> at <DV value="240 MHz" defense="Maximum clock speed of the ESP32-S3. Running at full speed during active processing, with dynamic frequency scaling to 80 MHz during idle to save power. 240 MHz is required for real-time Opus encoding alongside VAD." vocab={[
          { term: "dynamic frequency scaling", definition: "Automatically reducing CPU clock speed when the processor is idle, trading performance for lower power consumption." },
        ]} />. <DV value="32 MB flash" defense="32 MB (256 Mbit) supports dual OTA firmware slots (8 MB each), 12 MB tier_store, 256 KB glyph_store, 64 KB NVS, and ~11.5 MB headroom. The N32 variant was chosen over N16 to avoid partition budget pressure as features grow." vocab={[
          { term: "OTA", definition: "Over-The-Air firmware update. Dual A/B slots mean the device always has a known-good firmware to roll back to if an update fails." },
          { term: "NVS", definition: "Non-Volatile Storage — a key-value store in flash for WiFi credentials, device keys, and configuration. Encrypted with AES-XTS." },
        ]} />, <DV value="16 MB PSRAM" defense="16 MB of pseudo-static RAM for large runtime buffers: the 64 KB audio ring buffer, WiFi TX/RX buffers (~30 KB), and Opus encoder state. Internal SRAM (512 KB) is reserved for FreeRTOS stacks and interrupt handlers." vocab={[
          { term: "PSRAM", definition: "Pseudo-Static RAM — external memory accessed via SPI, slower than internal SRAM but vastly larger. The ESP32-S3 supports up to 16 MB via octal SPI." },
        ]} />. Core 0 handles sensors and I/O, Core 1 handles encoding, network, and storage.</>, iface: "—", draw: "70-100 mA baseline", gpio: "—" },
        { label: "INMP441", color: zone.audio, desc: <>Always-on <DV value="MEMS microphone" defense="MEMS (Micro-Electro-Mechanical Systems) microphones are tiny, low-power, and produce digital output directly — no ADC needed. The INMP441 outputs I2S, which the ESP32-S3 reads via DMA without CPU involvement." vocab={[
          { term: "MEMS", definition: "Micro-Electro-Mechanical Systems — microscopic mechanical structures etched into silicon. MEMS mics use a vibrating diaphragm to convert sound to electrical signals." },
          { term: "I2S", definition: "Inter-IC Sound — a serial bus protocol designed for digital audio data transfer between chips. Supports DMA for zero-CPU-overhead streaming." },
        ]} />. <DV value="16-bit signed PCM" defense="16-bit depth gives 96 dB dynamic range — more than sufficient for speech capture in ambient environments. Signed format is native to Opus encoder input, avoiding conversion overhead." vocab={[
          { term: "PCM", definition: "Pulse-Code Modulation — the standard uncompressed digital audio format. Each sample is an amplitude value at a fixed point in time." },
        ]} /> at 16 kHz via I2S DMA into PSRAM ring buffer. Hardwired recording LED on power rail.</>, iface: "I2S", draw: "~2 mA", gpio: "WS: 4, SCK: 5, SD: 6" },
        { label: "GY-521 MPU-6050", color: zone.device, desc: <><DV value="3-axis accelerometer + 3-axis gyroscope" defense="6 degrees of freedom (6DoF) enables motion state classification: walking (rhythmic acceleration), sitting (low acceleration, stable orientation), fidgeting (high-frequency small movements), and rest (minimal signal). Gyroscope adds rotational data that distinguishes fidgeting from walking." vocab={[
          { term: "6DoF", definition: "Six Degrees of Freedom — three linear axes (X/Y/Z acceleration) plus three rotational axes (pitch/roll/yaw angular velocity)." },
        ]} />. Polled at <DV value="25 Hz" defense="25 Hz captures all human motion frequencies of interest (walking cadence ~2 Hz, fidgeting ~5-10 Hz) per Nyquist, while keeping I2C bus utilization under 5%. Higher rates (100+ Hz) are needed for gesture recognition but waste power for coarse state classification." vocab={[
          { term: "I2C", definition: "Inter-Integrated Circuit — a two-wire serial bus for connecting low-speed peripherals. Multiple devices share the same bus, addressed by unique IDs." },
        ]} /> for motion state classification (walk, sit, fidget, rest).</>, iface: "I2C (0x68)", draw: "3.5 mA", gpio: "SCL: 39, SDA: 38" },
        { label: "E-Ink Display", color: zone.app, desc: <><DV value="200×200 pixel 1-bit" defense="200×200 is the smallest resolution that renders the 22-glyph inventory with sufficient detail for recognition. 1-bit (black/white only) matches the glyph system's symbolic aesthetic and simplifies the SPI interface — no grayscale controller needed." vocab={[
          { term: "1-bit", definition: "Each pixel is either fully black or fully white — no shades of gray. This matches e-ink's natural bistable behavior and keeps the display buffer at just 5 KB (200×200/8)." },
          { term: "SPI", definition: "Serial Peripheral Interface — a high-speed serial bus. Faster than I2C, used here because e-ink refresh requires pushing the full framebuffer quickly." },
        ]} /> binary display. <DV value="Zero-power image hold" defense="E-ink pixels are bistable — they hold their state with no power applied. The display only draws current during refresh (~8 mA for 200ms). This means the glyph output is visible indefinitely with zero ongoing power cost, unlike OLED/LCD which draw continuously." vocab={[
          { term: "bistable", definition: "A physical state that persists without energy input. E-ink particles stay black or white until actively moved by an electric field." },
        ]} />. Partial refresh ~200 ms for zone transitions, full refresh ~2 s for boot.</>, iface: "SPI", draw: "8 mA/refresh, 0 mA hold", gpio: "CS: 10, DIN: 11, CLK: 12, DC: 13, RST: 14, BUSY: 9" },
        { label: "DRV2605L + Motor", color: zone.device, desc: <><DV value="Haptic driver" defense="The DRV2605L is a dedicated haptic driver IC with a built-in effect library (123 waveforms). Using a dedicated driver rather than raw GPIO PWM gives consistent vibration strength regardless of battery voltage, and supports complex multi-pulse patterns without CPU involvement." vocab={[
          { term: "DRV2605L", definition: "Texas Instruments haptic driver IC. Communicates over I2C, stores waveform sequences in registers, and drives the motor autonomously once triggered." },
        ]} /> + DIANN 3V vibration motor (12,000 rpm). Single tap on button press (<DV value="50 ms" defense="50 ms is the minimum duration for a tactile 'click' sensation. Shorter pulses feel weak; longer pulses feel buzzy. This was tuned through physical prototyping — 50 ms at full amplitude gives a clean, crisp confirmation." />) , double pulse on consultation response (<DV value="80-40-80 ms" defense="Two 80 ms pulses separated by a 40 ms gap creates a distinct 'ba-bump' pattern distinguishable from the single-tap button confirmation. The pattern signals 'response ready' without requiring the user to look at the device." />).</>, iface: "I2C (0x5A)", draw: "0.6 mA idle, 80 mA burst", gpio: "SCL: 39, SDA: 38" },
        { label: "BQ25185 PMIC", color: zone.storage, desc: <>USB-C charging management with <DV value="CC/CV profile" defense="Constant-Current/Constant-Voltage is the standard LiPo charging algorithm. CC phase charges at a fixed current (typically 0.5C = 500 mA for our 1000 mAh cell) until 4.2V, then CV phase holds voltage while current tapers. The BQ25185 handles this autonomously with thermal protection." vocab={[
          { term: "CC/CV", definition: "Constant-Current then Constant-Voltage — the two-phase charging profile required by lithium-polymer batteries to maximize capacity without damage." },
          { term: "0.5C", definition: "Charging rate relative to battery capacity. 0.5C for a 1000 mAh cell = 500 mA charge current. Balances charge speed against battery longevity." },
        ]} />. <DV value="IP2312 boost converter" defense="Steps the LiPo's 3.0-4.2V output up to a stable 5V rail for the ESP32. The IP2312 was chosen for its 96% efficiency at light loads — critical because the boost converter runs continuously, and even 1% efficiency loss at 100 mA costs ~4 mA of wasted power." vocab={[
          { term: "boost converter", definition: "A DC-DC converter that steps voltage up. Uses an inductor to store and release energy at a higher voltage than the input." },
        ]} /> steps 3.7 V LiPo up to 5 V for ESP32.</>, iface: "USB-C input", draw: "—", gpio: "—" },
        { label: "Button", color: zone.device, desc: <>Momentary tactile switch. <DV value="Hardware interrupt on falling edge" defense="Falling-edge interrupt (GPIO goes high-to-low on press) triggers immediately without polling. This means the button works even if both cores are busy — the interrupt preempts any running task within microseconds. Falling edge (not rising) because the switch has a pull-up resistor." vocab={[
          { term: "falling edge", definition: "The transition from high voltage to low voltage. With a pull-up resistor, pressing the button connects the pin to ground, creating a falling edge." },
          { term: "interrupt", definition: "A hardware signal that immediately pauses the current task and runs a handler function. Much faster than polling (checking the pin in a loop)." },
        ]} />. Sole active input — means one thing: &apos;I have a question.&apos; 50 ms software debounce.</>, iface: "Digital GPIO", draw: "—", gpio: "GPIO 2 (interrupt)" },
        { label: "Potentiometer", color: zone.device, desc: <>Analog rotary dial mapped to <DV value="5 display zones" defense="Five zones match the five content categories on the e-ink display: ambient context, emotional state, themes, social, and consultation history. The potentiometer provides a physical, screenless navigation method that works by touch alone — no visual feedback needed." /> via <DV value="12-bit ADC" defense="12-bit resolution gives 4096 discrete values (0-4095). Each zone occupies ~819 counts, with a ±50 count hysteresis band at boundaries. 12-bit is the ESP32-S3's native ADC resolution — no external ADC needed." vocab={[
          { term: "ADC", definition: "Analog-to-Digital Converter — converts continuous voltage levels into discrete digital numbers. The ESP32-S3 has two built-in ADC units." },
          { term: "hysteresis", definition: "A dead zone at boundaries that prevents flickering. The zone only changes when the reading moves 50 counts past the boundary, not when it's exactly on it." },
        ]} /> (0-4095). Hysteresis band ±50 counts at zone boundaries prevents flickering.</>, iface: "ADC", draw: "<0.1 mA", gpio: "GPIO 8 (ADC1_CH7)" },
        { label: "Recording LED", color: zone.privacy, desc: <>Privacy-critical hardware guarantee. <DV value="Wired in series with INMP441 VCC" defense="The LED is physically in the power circuit of the microphone — the same current that powers the mic passes through the LED. There is no GPIO, no transistor, no firmware path that can disable the LED while the mic has power. This is a circuit-level guarantee, not a software promise." vocab={[
          { term: "in series", definition: "Components connected end-to-end so the same current flows through both. If either component breaks the circuit, both stop working." },
          { term: "VCC", definition: "The positive power supply voltage. The INMP441's VCC pin provides the current that powers both the microphone and the LED." },
        ]} /> — physically impossible to record without LED illuminating. No software control.</>, iface: "Hardwired", draw: "~5 mA", gpio: "On mic power rail" },
      ]} />

      {/* Power Strategy */}
      <H3 style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Power Strategy</H3>
      <Body style={{ marginBottom: spacing.md }}>
        The WiFi radio is the single largest variable power consumer (80-120 mA). The VAD controls it as a binary gate — WiFi is OFF during silence, ON only when speech is detected. This means battery life is directly proportional to how much the user talks.
      </Body>

      {/* Power: VAD cycle + budget in three columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.sm, marginBottom: spacing.md, alignItems: "stretch" }}>
        {/* VAD-Gated WiFi flow */}
        <VadCycleCard />

        {/* Idle budget */}
        <PowerBudgetCard
          title="Idle (WiFi Off)"
          color={colors.help}
          hero="~8h"
          heroSub="@ ~80 mA"
          items={[
            { label: "ESP32-S3 baseline", value: "70-100 mA", pct: 85, detail: <>The MCU's base power draw at <DV value="240 MHz" defense="Maximum clock speed of the ESP32-S3. At 240 MHz, the MCU can run real-time VAD inference and I2C polling simultaneously without frame drops. Lower frequencies risk audio buffer overruns during peak load." vocab={[
              { term: "ESP32-S3", definition: "Espressif's dual-core Xtensa LX7 microcontroller with integrated WiFi and Bluetooth, designed for AIoT edge applications." },
              { term: "clock speed", definition: "The rate at which the CPU executes instructions, measured in megahertz (MHz). Higher speeds increase throughput but also power consumption." },
            ]} /> with all peripherals initialized. <DV value="Dynamic frequency scaling" defense="DFS automatically reduces clock speed to 80 MHz when the CPU is idle, cutting dynamic power by roughly 60%. This is handled by the ESP-IDF power management module and requires no application code changes." vocab={[
              { term: "dynamic power", definition: "The component of CPU power consumption proportional to clock frequency and switching activity, as opposed to static leakage current." },
              { term: "ESP-IDF", definition: "Espressif's official IoT Development Framework — the SDK and build system for ESP32 chips." },
            ]} /> to <DV value="80 MHz" defense="80 MHz is the lowest stable frequency for the ESP32-S3 that keeps the I2S peripheral clocked correctly for audio capture. Going lower (40 MHz) risks I2S timing violations and corrupted PCM frames." vocab={[
              { term: "I2S peripheral", definition: "Inter-IC Sound — a synchronous serial bus protocol for connecting digital audio devices. The ESP32-S3 has two I2S controllers." },
              { term: "PCM frames", definition: "Pulse-Code Modulation samples — the raw digital audio data produced by the MEMS microphone at 16 kHz, 16-bit depth." },
            ]} /> during idle could reduce this to ~30 mA but is unvalidated in v1.</>, specs: [{ k: "Clock", v: "240 MHz" }, { k: "DFS target", v: "80 MHz (planned)" }] },
            { label: "INMP441 mic", value: "2 mA", pct: 3, detail: <><DV value="Always-on" defense="The microphone must run continuously because VAD requires an unbroken audio stream to detect speech onset. Any gap in audio input would create a blind window where speech could be missed entirely." vocab={[
              { term: "VAD", definition: "Voice Activity Detection — an algorithm that distinguishes speech from silence in a continuous audio stream." },
              { term: "speech onset", definition: "The moment when speech begins after a period of silence, detected by a sudden rise in audio energy and spectral characteristics." },
            ]} /> MEMS microphone. Cannot be <DV value="duty-cycled" defense="Duty cycling (powering the mic on/off periodically) would create gaps where speech onset could be missed. Unlike an IMU which can buffer samples, audio capture must be continuous for VAD to work — even a 50 ms gap could clip the beginning of a word." vocab={[
              { term: "duty cycling", definition: "Periodically turning a component on and off to reduce average power consumption, at the cost of temporal coverage." },
              { term: "MEMS microphone", definition: "Micro-Electro-Mechanical Systems microphone — a miniaturized acoustic sensor that converts sound pressure to digital I2S output." },
            ]} /> because VAD needs continuous audio input. The 2 mA is fixed — the mic has no <DV value="low-power mode" defense="The INMP441 has no standby or sleep pin — it draws a constant 2 mA whenever VCC is applied. Some newer MEMS mics (e.g., ICS-43434) offer a low-power standby mode at ~10 uA, but lack the INMP441's noise floor performance." vocab={[
              { term: "noise floor", definition: "The level of background self-noise generated by the microphone itself, measured in dBFS. Lower noise floor means better sensitivity to quiet speech." },
              { term: "VCC", definition: "The positive supply voltage pin on an integrated circuit. For the INMP441, VCC is 1.8-3.3V." },
            ]} />.</>, specs: [{ k: "Mode", v: "Always-on" }, { k: "Draw", v: "Fixed 2 mA" }] },
            { label: "Recording LED", value: "~5 mA", pct: 6, detail: <>Hardwired <DV value="in series" defense="The LED is wired in the power path of the microphone — the same current that powers the mic passes through the LED. This is a hardware-level privacy guarantee: there is no firmware path, GPIO, or software toggle that can disable the LED while the mic has power." vocab={[
              { term: "series circuit", definition: "Components connected end-to-end so the same current flows through each. If one component loses power, all lose power." },
              { term: "privacy guarantee", definition: "A design constraint enforced by hardware topology rather than software, making it impossible to circumvent through firmware changes." },
            ]} /> with mic VCC. Draws current whenever the mic is powered. Red LED <DV value="forward voltage" defense="The forward voltage (~1.8V) determines how much of the supply voltage is dropped across the LED. At 5 mA through a 3.3V supply, the remaining 1.5V is dropped across the current-limiting resistor. This specific LED was chosen for its low Vf — keeping total LED circuit draw under 5 mA." vocab={[
              { term: "forward voltage", definition: "The minimum voltage required across an LED for it to conduct and emit light, determined by the semiconductor bandgap material." },
              { term: "current-limiting resistor", definition: "A resistor in series with an LED that prevents excessive current draw, sized to the difference between supply voltage and LED forward voltage." },
            ]} /> ~1.8V at 5 mA — chosen for visibility without excessive drain.</>, specs: [{ k: "Circuit", v: "In series with mic" }, { k: "Vf", v: "~1.8V" }] },
            { label: "VAD (CPU share)", value: "~10 mA", pct: 12, detail: <><DV value="ESP-SR WakeNet" defense="ESP-SR is Espressif's speech recognition framework. WakeNet is its lightweight neural-net-based VAD model, optimized for the Xtensa LX7 DSP instructions. It runs inference on each audio frame with ~2 ms latency, consuming roughly 10 mA of incremental CPU power." vocab={[
              { term: "WakeNet", definition: "A compact neural network in the ESP-SR framework designed for keyword detection and voice activity detection on ESP32 chips." },
              { term: "DSP instructions", definition: "Digital Signal Processing hardware instructions built into the Xtensa LX7 core that accelerate multiply-accumulate operations used in neural network inference." },
            ]} /> running on <DV value="Core 0" defense="Core 0 is dedicated to real-time sensor tasks: audio capture, VAD inference, and IMU polling. This hard partition ensures VAD latency stays deterministic — no contention with WiFi or Opus encoding on Core 1." vocab={[
              { term: "hard partition", definition: "Permanently assigning each CPU core to specific task domains using FreeRTOS core affinity, rather than letting the scheduler freely migrate tasks." },
              { term: "core affinity", definition: "A FreeRTOS setting that pins a task to a specific CPU core, preventing the scheduler from moving it to the other core." },
            ]} />. The ~10 mA is the <DV value="incremental CPU power" defense="The additional power drawn by the CPU specifically for running VAD inference, above the baseline idle draw. Measured by comparing power with VAD enabled vs. disabled while keeping all other peripherals active." vocab={[
              { term: "incremental power", definition: "The marginal increase in power consumption attributable to a specific workload, measured against a baseline with that workload disabled." },
              { term: "inference", definition: "Running a trained neural network model on new input data to produce predictions, as opposed to training the model." },
            ]} /> for VAD inference on each audio frame.</>, specs: [{ k: "Engine", v: "ESP-SR WakeNet" }, { k: "Core", v: "0" }] },
            { label: "IMU polling", value: "3.5 mA", pct: 4, detail: <>MPU-6050 polled at <DV value="25 Hz" defense="25 Hz captures all human motion frequencies of interest (walking ~2 Hz, fidgeting ~5-10 Hz) per the Nyquist theorem, while keeping I2C bus utilization under 5%. Higher poll rates (100+ Hz) are needed for gesture recognition but waste power for coarse motion-state classification." vocab={[
              { term: "Nyquist theorem", definition: "States that to accurately capture a signal, the sampling rate must be at least twice the highest frequency component of interest." },
              { term: "motion-state classification", definition: "Categorizing the user's physical activity into discrete states (walking, sitting, fidgeting, resting) based on accelerometer and gyroscope data." },
            ]} /> over <DV value="I2C" defense="I2C (Inter-Integrated Circuit) is a two-wire serial bus used for low-speed peripheral communication. At 400 kHz fast mode, reading 12 bytes of IMU data takes ~0.3 ms per poll — negligible bus utilization at 25 Hz." vocab={[
              { term: "I2C", definition: "A synchronous multi-master, multi-slave serial communication bus using two lines (SDA for data, SCL for clock), commonly used for sensor interfacing." },
              { term: "fast mode", definition: "I2C operating at 400 kHz clock speed, compared to standard mode at 100 kHz. Reduces per-transaction bus time by 4x." },
            ]} />. The IMU draws 3.5 mA continuously — it has no <DV value="hardware FIFO" defense="The MPU-6050 has a 1024-byte FIFO buffer but no interrupt-driven batch-read mode suitable for the 25 Hz poll rate. Hardware FIFO with interrupt would allow the MCU to sleep between batches, but the ESP32-S3 is already awake for audio capture, so the power savings would be negligible." vocab={[
              { term: "FIFO buffer", definition: "First-In-First-Out memory on the sensor that stores multiple samples, allowing the host MCU to read them in batches rather than one-by-one." },
              { term: "batch-read mode", definition: "An operating mode where the sensor collects multiple samples into its FIFO and then signals the host via interrupt, reducing the number of I2C transactions." },
            ]} /> interrupt mode that would allow duty cycling at this poll rate.</>, specs: [{ k: "Rate", v: "25 Hz" }, { k: "Bus", v: "I2C" }] },
          ]}
        />

        {/* Active budget */}
        <PowerBudgetCard
          title="Active Streaming"
          color={zone.device}
          hero="~5h"
          heroSub="@ ~130 mA avg"
          items={[
            { label: "ESP32-S3 baseline", value: "70-100 mA", pct: 70, detail: <>Same baseline draw as idle. Both cores now active — <DV value="Core 0" defense="Core 0 handles real-time sensor tasks: audio capture via I2S DMA, VAD inference, and IMU polling. These tasks are latency-sensitive and must not be preempted by networking operations." vocab={[
              { term: "I2S DMA", definition: "Direct Memory Access for the I2S audio peripheral — the hardware writes PCM samples directly to memory without CPU involvement." },
              { term: "latency-sensitive", definition: "Tasks where delayed execution causes data loss or degraded quality, such as audio buffer underruns." },
            ]} /> on sensors, <DV value="Core 1" defense="Core 1 runs all compute-heavy and I/O-bound tasks: Opus encoding, WiFi TX/RX, WebSocket framing, and StorageManager flash writes. Isolating these from Core 0 prevents network jitter from causing audio glitches." vocab={[
              { term: "Opus encoding", definition: "Real-time compression of PCM audio into Opus codec frames at 16 kbps, optimized for speech using the SILK mode." },
              { term: "StorageManager", definition: "A FreeRTOS task that serializes all flash I/O through a queue, eliminating race conditions by ensuring only one writer accesses LittleFS at a time." },
            ]} /> on Opus encoding + WiFi streaming + StorageManager writes.</>, specs: [{ k: "Core 0", v: "Sensors + VAD" }, { k: "Core 1", v: "Encode + network + storage" }] },
            { label: "WiFi radio", value: "80-120 mA", pct: 100, detail: <>The dominant power consumer during streaming. <DV value="802.11n" defense="802.11n (WiFi 4) at 2.4 GHz provides sufficient throughput for the 16 kbps Opus stream with massive headroom. 802.11ac (5 GHz) was rejected because it has worse wall penetration and higher power draw, and our bandwidth needs are trivial." vocab={[
              { term: "802.11n", definition: "WiFi 4 standard supporting up to 150 Mbps on 2.4 GHz with MIMO. The ESP32-S3 supports single-stream 802.11n." },
              { term: "wall penetration", definition: "The ability of radio signals to pass through physical obstacles. 2.4 GHz penetrates walls better than 5 GHz due to longer wavelength." },
            ]} /> at 2.4 GHz with TLS 1.3 encryption. The wide range depends on signal strength — weaker signal requires higher <DV value="TX power" defense="Transmit power is automatically adjusted by the ESP32-S3 radio based on received signal strength. In strong-signal environments (~-40 dBm RSSI), TX power drops to ~11 dBm (~80 mA). In weak-signal environments (~-75 dBm), TX power rises to ~20 dBm (~120 mA)." vocab={[
              { term: "TX power", definition: "Transmit power — the strength of the radio signal emitted by the WiFi antenna, measured in dBm. Higher TX power improves range but increases current draw." },
              { term: "dBm", definition: "Decibels relative to one milliwatt — a logarithmic unit of radio signal power. Every 3 dBm increase doubles the power." },
            ]} /> vs <DV value="RSSI" defense="Received Signal Strength Indicator measures the power level of the incoming WiFi signal. The ESP32-S3 reads RSSI to auto-tune TX power and to decide whether to attempt WiFi association at all — below -80 dBm, the connection is unreliable and power is wasted on retransmissions." vocab={[
              { term: "RSSI", definition: "Received Signal Strength Indicator — a measurement of the power level of a received radio signal, typically reported in negative dBm values." },
              { term: "retransmissions", definition: "Re-sending WiFi frames that were lost or corrupted, which wastes power and bandwidth. High retransmission rates indicate poor signal quality." },
            ]} />.</>, specs: [{ k: "Protocol", v: "802.11n" }, { k: "Variable", v: "TX power vs RSSI" }] },
            { label: "Opus encoder (CPU)", value: "~10 mA", pct: 8, detail: <>Incremental CPU power for real-time Opus encoding on Core 1. 16 kbps CBR with <DV value="20 ms frames" defense="20 ms is Opus's default frame size and the optimal trade-off between latency and compression efficiency for speech. Shorter frames (2.5-10 ms) waste bits on per-frame overhead; longer frames (40-60 ms) add perceptible latency without meaningful quality gain at 16 kbps." vocab={[
              { term: "frame size", definition: "The duration of audio encoded in each Opus packet. Smaller frames mean lower latency but higher overhead per second of audio." },
              { term: "CBR", definition: "Constant Bit Rate — every encoded frame is the same size (~40 bytes at 16 kbps / 20 ms), making buffer management predictable." },
            ]} />. Opus <DV value="SILK mode" defense="SILK is Opus's speech-optimized codec mode (inherited from Skype's original SILK codec). It uses linear prediction coding tuned for human voice, achieving near-transparent speech quality at 16 kbps — far more efficient than the CELT mode designed for music." vocab={[
              { term: "SILK", definition: "A speech codec originally developed by Skype, now integrated into Opus. Optimized for voice frequencies (300 Hz - 3.4 kHz) using linear prediction." },
              { term: "linear prediction", definition: "A signal processing technique that models each audio sample as a linear combination of previous samples, exploiting the predictability of speech waveforms for efficient compression." },
            ]} /> is optimized for speech and uses minimal CPU at this bitrate.</>, specs: [{ k: "Mode", v: "SILK (speech)" }, { k: "Frame", v: "20 ms" }] },
            { label: "Always-on (mic+LED+VAD)", value: "~17 mA", pct: 14, detail: <>Combined draw of INMP441 (2 mA), recording LED (~5 mA), and VAD CPU share (~10 mA). These components run identically in both idle and active states — the <DV value="always-on subsystem" defense="The mic, LED, and VAD form an indivisible power group. The mic cannot be disabled without blinding the VAD. The LED cannot be disabled without breaking the hardware privacy guarantee. And VAD must run whenever the mic is on. This 17 mA floor is the minimum possible draw for a listening device." vocab={[
              { term: "indivisible power group", definition: "A set of components whose power states are physically or logically coupled — disabling any one breaks the function of the others." },
              { term: "hardware privacy guarantee", definition: "The LED is wired in series with the mic, making it physically impossible for firmware to record without the LED illuminated." },
              { term: "listening device", definition: "A device in always-on audio capture mode, continuously processing sound through VAD to detect speech events." },
            ]} /> draws a constant 17 mA regardless of system state.</>, specs: [{ k: "Mic", v: "2 mA" }, { k: "LED", v: "~5 mA" }, { k: "VAD", v: "~10 mA" }] },
            { label: "E-Ink refresh", value: "8 mA", pct: 6, detail: <>Intermittent — only draws during display updates. <DV value="Partial refresh" defense="Partial refresh updates only the changed pixels on the e-ink display, avoiding the full-screen inversion flash that takes ~2 seconds. At 200 ms per partial refresh, glyph updates feel responsive after the cloud round-trip completes." vocab={[
              { term: "partial refresh", definition: "An e-ink update mode that redraws only changed pixels, reducing update time from ~2 s to ~200 ms at the cost of slight ghosting accumulation." },
              { term: "ghosting", definition: "Faint remnants of previous images on an e-ink display caused by incomplete pixel state transitions during partial refreshes." },
            ]} /> (~200 ms at 8 mA) for zone transitions, full refresh (~2 s) for boot. <DV value="Amortized" defense="E-ink only draws power during the brief refresh pulse. With glyph updates occurring at most every 5 seconds, the average power is (8 mA x 0.2 s) / 5 s = 0.32 mA — effectively zero compared to the 130 mA total active draw." vocab={[
              { term: "amortized", definition: "Spreading a brief, high-power event over a longer time period to calculate an average power contribution." },
              { term: "bistable", definition: "E-ink pixels maintain their state (black or white) with zero power applied. Power is only needed to change the display, not to hold it." },
            ]} /> over time, the average is near zero.</>, specs: [{ k: "Partial", v: "200 ms @ 8 mA" }, { k: "Hold", v: "0 mA" }] },
          ]}
        />
      </div>

      {/* Battery math */}
      <Card scheme="muted" style={{ marginBottom: spacing.lg }}>
        <Label>Battery Math</Label>
        <Body>
          1000 mAh LiPo at 3.7 V = 3.7 Wh. At 5 V with 85% boost efficiency (IP2312): ~630 mAh effective. Mixed usage (50/50 idle/active) at ~130 mA avg yields ~5 hours. Light sleep between VAD frames could reduce idle to ~20 mA — unvalidated in v1, highest-impact optimization available.
        </Body>
      </Card>

      {/* Audio Pipeline + Flash Partition side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm, marginTop: spacing.xl }}>
        <H3 style={{ marginBottom: spacing.md }}>Audio Pipeline</H3>
        <H3 style={{ marginBottom: spacing.md }}>Flash Partition Layout (32MB)</H3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm, alignItems: "stretch" }}>
        <AudioPipelineCard />
        <FlashPartitionTable />
      </div>
      <Body style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
        ESP32-S3-N32R16V provides 32 MB flash with AES-XTS encryption (eFuse-protected). Dual OTA slots enable atomic updates with rollback.
      </Body>

      {/* FreeRTOS Tasks */}
      <H3 style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>FreeRTOS Task Layout</H3>
      <Body style={{ marginBottom: spacing.md }}>
        Two Xtensa LX7 cores at 240 MHz. Tasks are pinned to specific cores to avoid cache thrashing. Core 0 handles real-time sensor acquisition and user I/O. Core 1 handles encoding, network, and storage. Audio capture is never blocked by WiFi or flash writes.
      </Body>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm, marginBottom: spacing.lg, alignItems: "start" }}>
        <FreeRtosColumn title="Core 0" subtitle="Sensors & I/O" color={zone.device} tasks={[
          { name: "audio_capture", pri: 6, stack: "4 KB", wake: "I2S DMA interrupt", desc: "I2S DMA reads into 64 KB PSRAM ring buffer",
            detail: <>Highest priority task — never preempted. The <DV value="I2S DMA" defense="Direct Memory Access transfers audio samples from the I2S peripheral directly to the PSRAM ring buffer without CPU involvement. This guarantees zero-copy, zero-latency audio capture even when other tasks are running at full load." vocab={[
              { term: "DMA", definition: "Direct Memory Access — hardware that transfers data between peripherals and memory without CPU intervention. The CPU only sets up the transfer; the DMA controller handles the rest." },
              { term: "I2S", definition: "Inter-IC Sound — a serial bus protocol for digital audio. Carries clock, word-select, and data signals between the INMP441 mic and the ESP32-S3." },
            ]} /> peripheral writes <DV value="16-bit PCM frames" defense="Each sample is a 16-bit signed integer representing the audio amplitude at that instant. At 16 kHz, this produces 32 KB/s of raw audio data flowing into the ring buffer." /> directly to PSRAM. The ring buffer is 64 KB (~2 seconds at 16 kHz).</>,
            specs: [{ k: "Priority", v: "6 (highest)" }, { k: "Stack", v: "4 KB" }, { k: "Rate", v: "16 kHz continuous" }] },
          { name: "vad_engine", pri: 5, stack: "8 KB", wake: "Ring buffer", desc: "ESP-SR WakeNet neural VAD, gates WiFi + Opus",
            detail: <><DV value="ESP-SR WakeNet" defense="Espressif's lightweight neural network VAD, optimized for the Xtensa LX7 DSP instruction set. Runs inference on each 30 ms audio frame with ~2 ms latency. The 8 KB stack accommodates the model's working memory." vocab={[
              { term: "WakeNet", definition: "A neural-network-based Voice Activity Detection model in Espressif's ESP-SR framework. Detects speech onset with sub-50ms latency while consuming ~10 mA." },
              { term: "DSP", definition: "Digital Signal Processing — specialized CPU instructions for audio/signal math (multiply-accumulate, etc.). The Xtensa LX7 has hardware DSP support." },
            ]} /> neural VAD. When speech is detected, sets a flag that wakes the <DV value="Opus encoder" defense="The encoder task on Core 1 is suspended during silence and resumed by the VAD flag. This saves ~10 mA of CPU power during idle periods." /> on Core 1 and triggers <DV value="WiFi association" defense="WiFi radio powers on and connects using the stored BSSID (~300 ms). The VAD is the sole gate for WiFi — no other task can activate the radio." />.</>,
            specs: [{ k: "Priority", v: "5" }, { k: "Stack", v: "8 KB" }, { k: "Frame", v: "30 ms inference" }] },
          { name: "imu_reader", pri: 3, stack: "2 KB", wake: "40 ms timer", desc: "25 Hz MPU-6050 poll, motion state classification",
            detail: <>Polls the <DV value="MPU-6050" defense="6DoF IMU (accelerometer + gyroscope) at I2C address 0x68. Polled rather than interrupt-driven because the ESP32-S3's I2C peripheral doesn't support DMA — each read is a blocking I2C transaction (~200 µs)." vocab={[
              { term: "6DoF", definition: "Six Degrees of Freedom — 3 linear acceleration axes (X/Y/Z) plus 3 rotational velocity axes (pitch/roll/yaw)." },
              { term: "I2C", definition: "Inter-Integrated Circuit — a two-wire serial bus. Slower than SPI but requires fewer GPIO pins and supports multiple devices on one bus." },
            ]} /> at <DV value="25 Hz" defense="Captures all human motion frequencies of interest (walking ~2 Hz, fidgeting ~5-10 Hz) per Nyquist. The 40 ms timer period is derived from 1000/25. Higher rates waste power without improving motion classification accuracy." /> for motion state classification (walk, sit, fidget, rest). Low priority — yields to audio and VAD.</>,
            specs: [{ k: "Priority", v: "3" }, { k: "Stack", v: "2 KB" }, { k: "Period", v: "40 ms" }] },
          { name: "eink_driver", pri: 2, stack: "4 KB", wake: "Queue event", desc: "Renders glyphs/word from display command queue",
            detail: <>Waits on a <DV value="display command queue" defense="A FreeRTOS queue (depth 4) that receives render commands from the consultation pipeline or zone navigation. The queue decouples the display from the data source — the e-ink refresh is slow (~200 ms partial) and must not block the sender." vocab={[
              { term: "FreeRTOS queue", definition: "A thread-safe FIFO buffer for passing data between tasks. The sender never blocks if the queue has space; the receiver blocks until data arrives." },
            ]} />. Renders 3 glyphs + 1 word using <DV value="partial refresh" defense="Updates only changed pixels (~200 ms) instead of full-screen inversion (~2 seconds). Partial refresh avoids the ghosting flash and feels responsive after the cloud round-trip." /> for zone transitions. Full refresh reserved for boot and periodic ghosting cleanup.</>,
            specs: [{ k: "Priority", v: "2" }, { k: "Stack", v: "4 KB" }, { k: "Refresh", v: "~200 ms partial" }] },
          { name: "ble_handler", pri: 2, stack: "4 KB", wake: "BLE event", desc: "BLE provisioning, social exchange, app sync",
            detail: <>Handles all <DV value="BLE" defense="Bluetooth Low Energy for short-range communication with the companion app and other Nara devices. Used for WiFi provisioning (SRP6a + X25519), device status telemetry, tier viewer data, and social exchange packets." vocab={[
              { term: "BLE", definition: "Bluetooth Low Energy — a low-power wireless protocol optimized for intermittent, short-burst data transfer. Range ~10-30m indoors." },
              { term: "SRP6a", definition: "Secure Remote Password protocol — mutual authentication without transmitting the password. Used during WiFi provisioning to securely share credentials over BLE." },
            ]} /> communication. <DV value="Suspended during WiFi" defense="The ESP32-S3 shares a single radio between WiFi and BLE. When WiFi is active (during speech streaming), BLE is suspended. This is acceptable because BLE operations (provisioning, social exchange) are infrequent and can wait for a silence gap." /> — the ESP32-S3 shares a single radio.</>,
            specs: [{ k: "Priority", v: "2" }, { k: "Stack", v: "4 KB" }, { k: "Coexistence", v: "WiFi takes priority" }] },
          { name: "power_mgr", pri: 1, stack: "2 KB", wake: "1s timer", desc: "Battery voltage ADC, WiFi duty cycle FSM",
            detail: <>Lowest priority — runs once per second. Reads <DV value="battery voltage via ADC" defense="The LiPo voltage (3.0-4.2V) is read through a voltage divider on an ADC pin. The reading is mapped to a percentage (0-100%) using a LiPo discharge curve lookup table. Accuracy is ±5% — sufficient for the companion app status display." vocab={[
              { term: "ADC", definition: "Analog-to-Digital Converter — converts the battery's continuous voltage into a digital number the firmware can read and interpret." },
            ]} /> and manages the <DV value="WiFi duty cycle FSM" defense="A finite state machine tracking WiFi state: OFF → ASSOCIATING → CONNECTED → HOLD_OFF → OFF. The FSM enforces the 2-second hold-off timer and prevents rapid on/off cycling. It also triggers reconnection if the WebSocket drops." vocab={[
              { term: "FSM", definition: "Finite State Machine — a model with discrete states and transitions. Each state defines allowed behaviors; transitions are triggered by events (speech detected, timer expired, etc.)." },
            ]} />.</>,
            specs: [{ k: "Priority", v: "1 (lowest)" }, { k: "Stack", v: "2 KB" }, { k: "Period", v: "1 second" }] },
        ]} />
        <FreeRtosColumn title="Core 1" subtitle="Network & Storage" color={zone.cloud} tasks={[
          { name: "opus_encoder", pri: 5, stack: "8 KB", wake: "Ring buffer threshold", desc: "Encodes 20 ms Opus frames from ring buffer",
            detail: <>Consumes raw PCM from the ring buffer and produces <DV value="Opus frames" defense="Each 20 ms frame is encoded to ~40 bytes at 16 kbps CBR using SILK mode. The encoder runs on Core 1 to avoid contending with the audio capture DMA on Core 0. Suspended during silence to save ~10 mA." vocab={[
              { term: "SILK mode", definition: "Opus's speech-optimized codec mode (originally from Skype). Models the human vocal tract for efficient speech compression. Auto-selected when the encoder detects voice-like input." },
              { term: "CBR", definition: "Constant Bit Rate — every frame uses exactly the same number of bits, making buffer management predictable." },
            ]} />. Priority 5 ensures encoding keeps up with the <DV value="16 kHz input rate" defense="At 16 kHz with 20 ms frames, the encoder must produce one frame every 20 ms (50 frames/sec). At priority 5, it preempts WiFi streaming (priority 4) if needed — audio encoding must never fall behind." />.</>,
            specs: [{ k: "Priority", v: "5" }, { k: "Stack", v: "8 KB" }, { k: "Output", v: "~40 bytes/frame" }] },
          { name: "wifi_streamer", pri: 4, stack: "4 KB", wake: "Opus frame available", desc: "WebSocket TX to API Gateway over TLS 1.3",
            detail: <>Sends Opus frames over the <DV value="WebSocket" defense="A single persistent WSS connection through Kong API Gateway. The streamer batches 2-3 Opus frames per WebSocket message to reduce per-message overhead. TLS 1.3 with mTLS certificate pinning — each device has a unique X.509 cert." vocab={[
              { term: "WebSocket", definition: "Full-duplex communication over TCP. Both client and server can send data at any time without request/response pairing." },
              { term: "mTLS", definition: "Mutual TLS — both device and server present certificates, proving identity in both directions." },
            ]} /> to the API Gateway. Priority 4 — yields to the encoder (priority 5) to prevent frame drops. <DV value="TLS 1.3" defense="Mandatory encryption with 0-RTT resumption on reconnect. Certificate pinning prevents MITM attacks even on compromised networks." /> with mTLS.</>,
            specs: [{ k: "Priority", v: "4" }, { k: "Stack", v: "4 KB" }, { k: "Batching", v: "2-3 frames/msg" }] },
          { name: "cloud_receiver", pri: 4, stack: "4 KB", wake: "WebSocket RX event", desc: "Receives Tier 1 payloads, glyph deliveries, compression results",
            detail: <>Handles incoming data on the same WebSocket connection: <DV value="Tier 1 payloads" defense="The aggregated analysis results (STT + tonal + environment) sent back from the cloud after the 5-second aggregation window. These are queued to storage_mgr for writing to LittleFS." vocab={[
              { term: "Tier 1 payload", definition: "A structured JSON document containing all cloud analysis results for a 5-second audio window. Typical size: 2-4 KB." },
            ]} /> from the aggregator, glyph deliveries from consultation responses, and compression results from the hourly/daily/weekly compressors. All received data is forwarded to <DV value="storage_mgr" defense="The cloud_receiver never writes to flash directly — all data flows through the tier_write_queue to storage_mgr. This preserves the single-writer invariant that eliminates race conditions." /> via the queue.</>,
            specs: [{ k: "Priority", v: "4" }, { k: "Stack", v: "4 KB" }, { k: "Sources", v: "Aggregator, compressors, glyphs" }] },
          { name: "storage_mgr", pri: 3, stack: "4 KB", wake: "Queue item available", desc: "Sole writer to LittleFS via tier_write_queue (depth 16)",
            detail: <>The <DV value="sole writer" defense="All flash I/O is serialized through this single task via a FreeRTOS queue (depth 16). No mutexes, no priority inversion, no concurrent file access. The trade-off is throughput, but at ~2.5 MB/hour write rate, the queue never backs up." vocab={[
              { term: "priority inversion", definition: "A scheduling pathology where a high-priority task is blocked by a low-priority task holding a shared resource. Eliminated here by using a queue instead of a mutex." },
              { term: "tier_write_queue", definition: "A FreeRTOS queue (depth 16) that serializes all flash write requests. Cloud receiver, compression results, and glyph updates all flow through this single queue." },
            ]} /> to <DV value="LittleFS" defense="A wear-leveling, power-loss-resilient filesystem designed for microcontrollers. Distributes writes across flash blocks to prevent premature wear. The 12 MB tier_store partition holds Tiers 1-4 data plus the offline audio buffer." vocab={[
              { term: "LittleFS", definition: "A filesystem for embedded systems with built-in wear leveling and power-loss resilience. Uses bounded RAM regardless of filesystem size." },
            ]} />. Handles tier writes, glyph storage, offline buffer management, and tier eviction.</>,
            specs: [{ k: "Priority", v: "3" }, { k: "Stack", v: "4 KB" }, { k: "Queue depth", v: "16" }] },
        ]} />
      </div>

      {/* Offline Mode */}
      <H3 style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>Offline Mode</H3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.xs, marginBottom: spacing.xs }}>
        {[
          { state: "Connected", behavior: "Stream normally", led: "None", tone: "help" as const },
          { state: "Lost <5min", behavior: "Buffer Opus in PSRAM (2MB ≈ 16min)", led: "Blue pulse", tone: "neutral" as const },
          { state: "Lost >5min", behavior: "Spill Opus to flash (4MB)", led: "Amber pulse", tone: "amber" as const },
          { state: "Reconnected", behavior: "Drain offline buffer at 50%", led: "Green sweep", tone: "help" as const },
        ].map((m) => (
          <Card key={m.state} style={{ padding: `${spacing.sm}px` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <StatusBadge label={m.state} tone={m.tone} />
              <Chip color={colors.ink2}>{m.led}</Chip>
            </div>
            <div style={{ ...typography.body, color: colors.ink2 }}>
              {m.behavior}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COST CARDS — clickable cards with breakdown modals
   ═══════════════════════════════════════════════════════════════════════════ */

const COST_TIERS = [
  {
    scale: "100 devices", cost: "$8", unit: "/device/mo", pct: 100,
    breakdown: [
      { item: "Deepgram STT", cost: "$2.50", note: "~$0.0043/min × avg 10 hr/device/mo" },
      { item: "T4 GPU (wav2vec2 + YAMNet)", cost: "$1.80", note: "Spot instances, shared across devices" },
      { item: "GKE Autopilot (K8s Jobs)", cost: "$1.20", note: "Compression workers, scale-to-zero" },
      { item: "NATS JetStream", cost: "$0.80", note: "Single node, 90s retention per device" },
      { item: "Qdrant vector DB", cost: "$0.70", note: "~1000 themes/device, single node" },
      { item: "LLM (consultations)", cost: "$0.60", note: "Haiku-class, ~5 consults/hr max" },
      { item: "Network / egress", cost: "$0.40", note: "Opus upstream + Tier 1 downstream" },
    ],
    notes: "At 100 devices, fixed infrastructure costs (NATS, Qdrant, GKE control plane) are amortized across too few devices. GPU node pool runs a single T4 that's underutilized.",
  },
  {
    scale: "10K devices", cost: "$3", unit: "/device/mo", pct: 37,
    breakdown: [
      { item: "Deepgram STT", cost: "$1.00", note: "Volume discount tier (~$0.0025/min)" },
      { item: "T4 GPU (wav2vec2 + YAMNet)", cost: "$0.60", note: "GPU pool scales, better utilization" },
      { item: "GKE Autopilot (K8s Jobs)", cost: "$0.45", note: "Jobs share node pool efficiently" },
      { item: "NATS JetStream", cost: "$0.25", note: "Clustered, cost shared across 10K" },
      { item: "Qdrant vector DB", cost: "$0.25", note: "Sharded across 3 nodes" },
      { item: "LLM (consultations)", cost: "$0.25", note: "Batched requests, lower per-call cost" },
      { item: "Network / egress", cost: "$0.20", note: "GCP committed use discount" },
    ],
    notes: "At 10K devices, GPU utilization reaches 60-70% and volume discounts kick in for Deepgram. Infrastructure costs are well-amortized. This is the break-even point for profitability.",
  },
  {
    scale: "100K devices", cost: "$1.50", unit: "/device/mo", pct: 19,
    breakdown: [
      { item: "Deepgram STT", cost: "$0.45", note: "Enterprise pricing (~$0.0015/min)" },
      { item: "T4 GPU (wav2vec2 + YAMNet)", cost: "$0.30", note: "Auto-scaling GPU pool, 85%+ util." },
      { item: "GKE Autopilot (K8s Jobs)", cost: "$0.20", note: "Massive Job throughput, spot pricing" },
      { item: "NATS JetStream", cost: "$0.12", note: "Multi-cluster, negligible per-device" },
      { item: "Qdrant vector DB", cost: "$0.15", note: "Distributed cluster, horizontal scaling" },
      { item: "LLM (consultations)", cost: "$0.15", note: "Self-hosted Haiku-class viable at scale" },
      { item: "Network / egress", cost: "$0.13", note: "GCP committed use + CDN" },
    ],
    notes: "At 100K devices, everything benefits from economies of scale. Self-hosting the LLM becomes cost-effective. Deepgram enterprise pricing cuts STT cost by 65%. The dominant cost shifts from compute to data transfer.",
  },
];

function CostBreakdownModal({ tier, onClose }: { tier: typeof COST_TIERS[number]; onClose: () => void }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(26,22,18,0.25)", display: "flex", alignItems: "center", justifyContent: "center", padding: spacing.xl }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: colors.bg, border: `1px solid ${colors.ruleStrong}`, borderRadius: radius.lg, maxWidth: 560, width: "100%", padding: `${spacing.lg}px`, boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.md }}>
          <div>
            <div style={{ ...typography.eyebrow, color: colors.ink3, marginBottom: spacing.xs }}>{tier.scale}</div>
            <div style={{ ...typography.h2, fontSize: 28 }}>~{tier.cost}<span style={{ ...typography.label, color: colors.ink3, marginLeft: spacing.xxs }}>{tier.unit}</span></div>
          </div>
          <button
            onClick={onClose}
            style={{ all: "unset", cursor: "pointer", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: radius.sm, color: colors.ink3, transition: transitions.fast }}
            onMouseEnter={(e) => { e.currentTarget.style.background = colors.inkSubtle; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Breakdown table */}
        <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.md }}>
          {tier.breakdown.map((row, i) => (
            <div key={row.item} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: spacing.md, padding: `${spacing.sm}px ${spacing.md}px`, borderBottom: i < tier.breakdown.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
              <div>
                <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink, lineHeight: 1.3 }}>{row.item}</div>
                <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink3, lineHeight: 1.4, marginTop: 1 }}>{row.note}</div>
              </div>
              <span style={{ ...typography.h3, fontSize: 14, color: zone.cloud, flexShrink: 0 }}>{row.cost}</span>
            </div>
          ))}
        </div>

        <div style={{ ...typography.body, color: colors.ink2, lineHeight: 1.7 }}>{tier.notes}</div>
      </div>
    </div>,
    document.body,
  );
}

function CostCards() {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.sm, marginBottom: spacing.sm }}>
        {COST_TIERS.map((row, i) => (
          <div
            key={row.scale}
            onClick={() => setSelectedTier(i)}
            style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px`, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${zone.cloud}50`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.rule; }}
          >
            <div style={{ ...typography.label, color: colors.ink3, marginBottom: spacing.xs }}>{row.scale}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ ...typography.h2, fontSize: 28, marginBottom: 0 }}>~{row.cost}</span>
              <span style={{ ...typography.stat, color: colors.ink3 }}>{row.unit}</span>
            </div>
            <div style={{ height: 2, borderRadius: 1, background: `${zone.cloud}12`, marginTop: spacing.xs, overflow: "hidden" }}>
              <div style={{ width: `${row.pct}%`, height: "100%", background: zone.cloud, borderRadius: 1 }} />
            </div>
          </div>
        ))}
      </div>
      {selectedTier !== null && (
        <CostBreakdownModal tier={COST_TIERS[selectedTier]} onClose={() => setSelectedTier(null)} />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE TOPOLOGY — interactive three-lane cloud service view
   ═══════════════════════════════════════════════════════════════════════════ */

type LaneStep = { label: string; detail: string; time: string; expanded?: ReactNode; specs?: { k: string; v: string }[] };
type LaneFooter = { label: string; detail: string; expanded?: ReactNode; specs?: { k: string; v: string }[] };

const SERVICE_LANES: {
  id: "stream" | "compress" | "consult";
  route: string;
  protocol: string;
  color: string;
  title: string;
  subtitle: string;
  steps: LaneStep[];
  footer: LaneFooter;
}[] = [
  {
    id: "stream",
    route: "/stream",
    protocol: "WebSocket",
    color: zone.audio,
    title: "Audio Ingestion",
    subtitle: "NATS JetStream — 90s buffer",
    steps: [
      {
        label: "STT — Deepgram",
        detail: "Speaker ID → Keywords → Topics",
        time: "real-time",
        expanded: <>Deepgram Nova-2 provides <DV value="streaming STT" defense="Streaming (not batch) enables real-time tonal overlay — each utterance is available within 300ms, so the Tonal and Environment pipelines can align their windows to the same audio segment." vocab={[{ term: "Streaming STT", definition: "Speech-to-text that returns partial results as audio arrives, rather than waiting for the full recording." }, { term: "Speaker diarization", definition: "Identifying which speaker said what in multi-speaker audio." }]} /> with <DV value="speaker diarization" defense="Diarization lets Madie distinguish the wearer's voice from ambient conversation, which is critical for accurate tonal analysis — stress detected on a bystander's speech would corrupt the wearer's emotional timeline." vocab={[{ term: "Diarization", definition: "The process of partitioning an audio stream into segments according to speaker identity." }, { term: "Nova-2", definition: "Deepgram's production STT model offering high accuracy with low latency." }]} />. Chosen over Whisper for its native streaming API and lower p99 latency.</>,
        specs: [{ k: "Model", v: "Nova-2" }, { k: "Latency", v: "<300ms p99" }],
      },
      {
        label: "Tonal — wav2vec2-emotion",
        detail: "Valence / arousal / stress",
        time: "real-time",
        expanded: <>Extracts <DV value="valence / arousal / stress" defense="These three axes capture the core affective dimensions defined by Russell's circumplex model. Valence (positive ↔ negative) and arousal (calm ↔ excited) together map most emotional states; stress is added as a separate axis because it is the primary signal Madie uses for glyph selection." vocab={[{ term: "Valence", definition: "The pleasantness dimension of emotion — positive (happy, content) vs. negative (sad, angry)." }, { term: "Arousal", definition: "The activation dimension — high (excited, tense) vs. low (calm, drowsy)." }, { term: "wav2vec2", definition: "A self-supervised speech representation model by Meta, fine-tuned here for emotion recognition." }]} /> from raw audio waveform. The model runs on <DV value="5s sliding windows" defense="5 seconds balances temporal resolution against classification stability — shorter windows produce noisy readings, longer windows blur emotional transitions. This matches the Aggregator's 5s collection cadence." vocab={[{ term: "Sliding window", definition: "A fixed-size frame that advances over the data stream, re-computing features at each position." }, { term: "Circumplex model", definition: "Russell's model mapping emotions onto a 2D plane of valence and arousal." }]} /> aligned with the Aggregator cadence.</>,
        specs: [{ k: "Window", v: "5s" }, { k: "Axes", v: "3 (V/A/S)" }],
      },
      {
        label: "Environment — YAMNet",
        detail: "Scene + events + noise floor",
        time: "real-time",
        expanded: <>Google's <DV value="AudioSet classifier" defense="YAMNet is trained on AudioSet (2M+ labeled 10s clips, 527 classes). It provides broad environmental awareness — from 'office' to 'traffic' to 'crowd' — without requiring custom training data. The 521 event subset we use covers all domestic and urban scenes relevant to a wearable." vocab={[{ term: "AudioSet", definition: "A large-scale dataset of over 2 million human-labeled 10-second audio clips spanning 527 sound event classes." }, { term: "YAMNet", definition: "Yet Another Mobile Network — a lightweight audio event classifier built on MobileNet v1, trained on AudioSet." }]} /> recognizes <DV value="521 sound events" defense="Of the 527 AudioSet classes, 6 are excluded (musical instrument tuning, etc.) as irrelevant to environmental context. The remaining 521 cover all scene types Madie needs: domestic, urban, nature, social, and work environments." vocab={[{ term: "Sound event", definition: "A discrete acoustic occurrence such as a door closing, dog barking, or keyboard typing." }, { term: "Scene classification", definition: "Categorizing the overall acoustic environment (e.g., cafe, park, office) from the mixture of sound events." }]} /> for scene context that enriches the Tier 1 payload.</>,
        specs: [{ k: "Classes", v: "521" }, { k: "Backbone", v: "MobileNet v1" }],
      },
    ],
    footer: {
      label: "Aggregator",
      detail: "5s window → Tier 1 payload → device via WS",
      expanded: <>Collects STT, Tonal, and Environment outputs into a single <DV value="5s window" defense="The 5-second cadence is the fundamental clock of the Stream lane. It is long enough for wav2vec2-emotion to produce a stable reading and for YAMNet to capture a meaningful scene snapshot, yet short enough that emotional shifts are not lost. The aggregated payload is ~2KB, well within the WebSocket frame limit." vocab={[{ term: "Tier 1 payload", definition: "The raw, time-stamped aggregation of STT transcript, tonal axes, and environment tags — the highest-resolution data tier." }, { term: "Aggregation window", definition: "A fixed time interval over which multiple data streams are collected and merged into a single output record." }]} /> payload. Each window is tagged with speaker ID, timestamp, and a confidence score before being pushed to the device over WebSocket and simultaneously enqueued in NATS JetStream for the Compress lane.</>,
      specs: [{ k: "Cadence", v: "5s" }, { k: "Payload", v: "~2KB" }],
    },
  },
  {
    id: "compress",
    route: "/compress",
    protocol: "gRPC",
    color: zone.storage,
    title: "Context Compression",
    subtitle: "K8s Jobs — scale-to-zero",
    steps: [
      {
        label: "Hourly",
        detail: "Tier 1 → Tier 2 summary",
        time: "scheduled",
        expanded: <>A <DV value="K8s CronJob" defense="Kubernetes CronJobs scale to zero between runs, so Madie pays zero compute cost during idle hours. Each job processes one hour of Tier 1 payloads (~720 windows), extracting dominant emotion, top-3 topics, and environment mode into a single Tier 2 record." vocab={[{ term: "K8s CronJob", definition: "A Kubernetes resource that runs a containerized task on a cron schedule, automatically scaling down when complete." }, { term: "Tier 2", definition: "Hourly summary records — one per hour — containing aggregated emotion, topic, and environment data." }]} /> extracts <DV value="dominant emotion and top topics" defense="The hourly job uses a weighted vote across all 5s windows: tonal axes are averaged (with high-confidence windows weighted 2x), and topics are ranked by frequency × recency. This lossy compression reduces ~720 Tier 1 records into a single Tier 2 row, achieving ~700:1 data reduction." vocab={[{ term: "Dominant emotion", definition: "The most representative emotional state across the hour, computed as the weighted centroid of all valence/arousal/stress readings." }, { term: "Data reduction", definition: "The ratio of input size to output size after compression — higher ratios mean more aggressive summarization." }]} /> from the hour's Tier 1 stream.</>,
        specs: [{ k: "Input", v: "~720 windows" }, { k: "Reduction", v: "~700:1" }],
      },
      {
        label: "Daily",
        detail: "Tier 2 → Tier 3 digest",
        time: "scheduled",
        expanded: <>Merges up to 24 Tier 2 records into a <DV value="daily digest" defense="The daily digest captures cross-hour patterns that hourly summaries miss: Was stress elevated only in the morning, or sustained all day? Did topics shift from work to personal after 6pm? These arc-level patterns are what the Theme Merger eventually distills into weekly themes." vocab={[{ term: "Daily digest", definition: "A Tier 3 record summarizing an entire day — emotional arcs, topic clusters, and environment transitions." }, { term: "Emotional arc", definition: "The trajectory of emotional state across a time period, showing how valence and arousal change." }]} /> that captures <DV value="cross-day patterns" defense="By comparing today's digest against the previous 6 days (stored in a rolling buffer), the daily job can flag emerging patterns: rising stress, topic fixation, or environment monotony. These flags are forwarded to the Theme Merger as weighted signals." vocab={[{ term: "Rolling buffer", definition: "A fixed-size window of recent records that slides forward in time, discarding the oldest entry as each new one arrives." }, { term: "Topic fixation", definition: "When the same topic appears with high frequency across multiple consecutive days, suggesting rumination or preoccupation." }]} />. Emotional arcs and topic clusters are preserved; individual utterances are discarded.</>,
        specs: [{ k: "Input", v: "≤24 Tier 2" }, { k: "Output", v: "1 Tier 3" }],
      },
      {
        label: "Weekly",
        detail: "Tier 3 → Theme Merger",
        time: "scheduled",
        expanded: <>The <DV value="Theme Merger" defense="Weekly granularity is the sweet spot for Madie's use case: daily themes are too noisy (a single bad meeting skews the picture), while monthly themes are too delayed for the device's consultation pipeline to surface timely insights. Weekly themes feed directly into the semantic search index." vocab={[{ term: "Theme Merger", definition: "The process that clusters 7 daily digests into coherent weekly themes using semantic similarity and temporal weighting." }, { term: "Semantic similarity", definition: "A measure of how close two pieces of text are in meaning, computed via embedding distance." }]} /> clusters 7 daily digests into <DV value="weekly themes" defense="Themes are natural-language labels (e.g., 'work deadline stress', 'social reconnection') generated by summarizing the top-3 topic clusters per week. Each theme carries an emotion centroid and a confidence score, making it directly searchable via the Consult pipeline's Qdrant index." vocab={[{ term: "Weekly theme", definition: "A named, semantically coherent pattern extracted from a week of daily digests — the highest-level unit of Madie's memory." }, { term: "Emotion centroid", definition: "The average valence/arousal/stress vector across all data points contributing to a theme." }]} />. These are embedded and stored as the long-term memory that the Consult pipeline searches against.</>,
        specs: [{ k: "Input", v: "7 Tier 3" }, { k: "Output", v: "2–5 themes" }],
      },
    ],
    footer: {
      label: "Theme Merger → E5-small-v2",
      detail: "Time-decay weighting • 384-dim embeddings",
      expanded: <>Themes are embedded using <DV value="E5-small-v2" defense="E5-small-v2 produces 384-dimensional embeddings with strong semantic quality at minimal compute cost (~50ms per theme). It shares the same embedding space as the Consult pipeline's query encoder, ensuring that weekly themes and user queries are directly comparable via cosine similarity." vocab={[{ term: "E5-small-v2", definition: "A compact text embedding model (33M params) from Microsoft, optimized for semantic search with 384-dim output." }, { term: "Embedding space", definition: "The vector space in which texts with similar meaning are placed close together." }]} /> with <DV value="time-decay weighting" defense="Recent themes are weighted higher (exponential decay, half-life = 12 weeks without reinforcement). A pattern that is never reinforced fades to 50% weight in 3 months, 25% in 6 months, and effectively zero within 18 months. Patterns reinforced by new data resist decay. This ensures semantic search naturally favors current context over stale history while preserving persistent long-term trends." vocab={[{ term: "Time-decay weighting", definition: "A scoring method where older items receive progressively lower weights, ensuring recency bias in retrieval. Reinforced themes reset their decay clock." }, { term: "Half-life", definition: "The time period after which an unreinforced theme's weight drops to 50% of its original value — 12 weeks for Madie." }, { term: "Cosine similarity", definition: "A similarity measure between two vectors based on the cosine of the angle between them — 1.0 means identical direction." }]} /> so recent themes rank higher in semantic search.</>,
      specs: [{ k: "Dimensions", v: "384" }, { k: "Half-life", v: "12 weeks" }],
    },
  },
  {
    id: "consult",
    route: "/consult",
    protocol: "gRPC",
    color: zone.cloud,
    title: "Consultation Pipeline",
    subtitle: "~2.8s end-to-end",
    steps: [
      {
        label: "Query STT",
        detail: "Deepgram",
        time: "~800ms",
        expanded: <>Reuses the same <DV value="Deepgram Nova-2" defense="Using the same STT provider for both stream ingestion and consultation queries ensures consistent transcription quality and vocabulary handling. The ~800ms latency includes network round-trip to Deepgram's API — acceptable since it runs in parallel with the user's natural pause after speaking." vocab={[{ term: "Nova-2", definition: "Deepgram's production STT model, chosen for its balance of accuracy and latency." }, { term: "Endpointing", definition: "Detecting when a speaker has finished their utterance, triggering final transcription." }]} /> model as the Stream lane. Query transcription is the latency bottleneck at <DV value="~800ms" defense="800ms is the p95 latency for a typical 3–8 second query. Deepgram's endpointing adds ~200ms after the user stops speaking. This is the single largest contributor to the 2.8s end-to-end budget, but attempts to replace it with on-device STT (Whisper-tiny) produced unacceptable word error rates above 15%." vocab={[{ term: "p95 latency", definition: "The 95th percentile response time — 95% of requests complete within this duration." }, { term: "Word error rate", definition: "The percentage of words incorrectly transcribed — insertions, deletions, and substitutions divided by total reference words." }]} />, but it runs during the user's natural pause.</>,
        specs: [{ k: "p95", v: "800ms" }, { k: "WER", v: "<8%" }],
      },
      {
        label: "Embedding",
        detail: "E5-small-v2",
        time: "~50ms",
        expanded: <>The query text is embedded into the <DV value="same 384-dim space" defense="Using the same E5-small-v2 model for both theme storage and query embedding guarantees that cosine similarity scores are meaningful. Cross-model embedding comparison (e.g., query with model A, themes with model B) produces unreliable similarity scores even if dimensions match." vocab={[{ term: "Symmetric embedding", definition: "When both queries and documents use the same encoder, ensuring direct comparability in vector space." }, { term: "384-dim", definition: "The dimensionality of the embedding vector — lower dimensions reduce storage and search cost while E5-small-v2 maintains strong semantic quality at this size." }]} /> as the stored themes. At <DV value="~50ms" defense="E5-small-v2 (33M params) runs in ~50ms on a single CPU core. This is fast enough that we do not need GPU inference for the embedding step, keeping the Consult pipeline's infrastructure simple and cost-effective." vocab={[{ term: "E5-small-v2", definition: "Microsoft's compact embedding model — 33M parameters, 384-dim output, strong performance on MTEB benchmarks." }, { term: "MTEB", definition: "Massive Text Embedding Benchmark — a standardized evaluation suite for text embedding models across retrieval, classification, and clustering tasks." }]} />, embedding is negligible in the latency budget.</>,
        specs: [{ k: "Model", v: "E5-small-v2" }, { k: "Params", v: "33M" }],
      },
      {
        label: "Semantic Search",
        detail: "Qdrant (HNSW)",
        time: "~20ms",
        expanded: <><DV value="Qdrant" defense="Qdrant is chosen over Pinecone or Weaviate for its self-hosted deployment model (no data leaves our infrastructure), Rust-based performance, and native support for payload filtering. The HNSW index provides sub-linear search time, critical for scaling to thousands of themes per user." vocab={[{ term: "Qdrant", definition: "An open-source vector database written in Rust, optimized for similarity search with filtering." }, { term: "HNSW", definition: "Hierarchical Navigable Small World — a graph-based approximate nearest neighbor algorithm that achieves sub-millisecond search at high recall." }]} /> performs <DV value="approximate nearest neighbor" defense="Exact nearest neighbor search is O(n) and too slow at scale. HNSW provides ~99% recall at O(log n) cost. With ef_search=128 and M=16, Qdrant consistently returns the correct top-5 themes within 20ms, even with 10K+ vectors per user." vocab={[{ term: "Approximate nearest neighbor", definition: "A search technique that trades a small amount of accuracy for dramatically faster retrieval compared to exhaustive search." }, { term: "Recall", definition: "The fraction of true nearest neighbors that the approximate algorithm actually returns — 99% means only 1 in 100 is missed." }, { term: "ef_search", definition: "HNSW parameter controlling search quality — higher values increase recall at the cost of latency." }]} /> search across the user's theme index, returning the top-5 most semantically relevant themes.</>,
        specs: [{ k: "Algorithm", v: "HNSW" }, { k: "Recall", v: "~99%" }],
      },
      {
        label: "Context Assembly",
        detail: "Template concat",
        time: "~10ms",
        expanded: <>Assembles the LLM prompt by <DV value="template concatenation" defense="A deterministic template approach (rather than dynamic prompt construction) ensures reproducible outputs and makes debugging straightforward. The template slots are: system prompt, user profile, top-5 themes (with recency scores), current query, and glyph inventory. Total token budget is capped at 2048 to keep LLM latency predictable." vocab={[{ term: "Template concatenation", definition: "Building an LLM prompt by filling in predefined slots with retrieved context, rather than generating the prompt dynamically." }, { term: "Token budget", definition: "The maximum number of tokens allocated for the assembled prompt — exceeding it triggers truncation of lower-priority context." }]} /> of retrieved themes, user profile, and the current query. A strict <DV value="token budget" defense="The 2048-token budget is chosen to keep the Deep Reasoner's inference time under 1500ms. Each theme consumes ~80 tokens, so 5 themes use ~400 tokens, leaving ~1600 for system prompt, user profile, query, and generation headroom." vocab={[{ term: "Context window", definition: "The maximum number of tokens an LLM can process in a single request — prompt + completion must fit within this limit." }, { term: "Truncation", definition: "Cutting lower-priority content from the prompt when the token budget is exceeded, preserving the most relevant context." }]} /> ensures latency stays predictable.</>,
        specs: [{ k: "Budget", v: "2048 tokens" }, { k: "Themes", v: "top-5" }],
      },
      {
        label: "Deep Reasoner",
        detail: "OpenAI / Claude",
        time: "~1500ms",
        expanded: <>The first stage of a two-stage LLM architecture. A <DV value="full-size model" defense="The Deep Reasoner uses OpenAI or Claude (not Haiku-class) — a model large enough for unconstrained reasoning about the user's situation. It takes the full context package and produces comprehensive internal analysis that the user never sees. This output exists solely as input for the Glyph Picker. The ~1500ms budget allows for deeper reasoning than a Haiku-class model would provide." vocab={[{ term: "Deep Reasoner", definition: "The first-stage LLM that produces rich internal reasoning about the user's query in the context of their life patterns. It does not select glyphs or produce user-facing output." }, { term: "Two-stage architecture", definition: "Separating reasoning from glyph selection lets each model do what it's best at — the Deep Reasoner thinks freely, the Glyph Picker translates that thinking into symbols." }]} /> receives the assembled context and produces <DV value="internal reasoning" defense="The Deep Reasoner does not see the glyph inventory, does not select glyphs, and does not produce user-facing output. It reasons freely about the user's situation — what they're really asking, relevant patterns from their history, emotional context, and multiple perspectives the glyphs could reflect." vocab={[{ term: "Internal reasoning", definition: "Analysis text consumed only by the Glyph Picker. The user never sees this — it's Madie 'thinking aloud' before choosing how to respond." }, { term: "Unconstrained", definition: "No format requirements — the Deep Reasoner can produce paragraphs of reasoning, weigh trade-offs, and explore nuance without worrying about output format." }]} /> that feeds the Glyph Picker.</>,
        specs: [{ k: "Model", v: "OpenAI / Claude" }, { k: "Output", v: "Internal reasoning" }],
      },
      {
        label: "Glyph Picker",
        detail: "Haiku-class LLM",
        time: "~400ms",
        expanded: <>A second <DV value="Haiku-class LLM" defense="A separate, smaller LLM call handles glyph selection from the Deep Reasoner's 5 candidates. This two-stage approach isolates reasoning from selection, making each step independently testable. The Picker's prompt includes the 22-glyph inventory with semantic descriptions, so it can weigh visual coherence alongside semantic relevance." vocab={[{ term: "Two-stage pipeline", definition: "Splitting reasoning and selection into separate LLM calls — the first generates candidates, the second makes the final selection." }, { term: "Glyph inventory", definition: "The fixed set of 22 glyphs available to Madie, each with a name, visual description, and semantic field." }]} /> selects 3 glyphs from the <DV value="22-glyph inventory" defense="The 22-glyph set was designed to cover Madie's core emotional and thematic vocabulary without overwhelming the E-Ink display. Each glyph maps to a semantic cluster (e.g., 'growth', 'tension', 'connection'), and the Picker aims for complementary coverage — selecting glyphs from different clusters rather than reinforcing a single theme." vocab={[{ term: "Semantic cluster", definition: "A group of related meanings that a glyph represents — e.g., the 'growth' cluster includes progress, learning, and development." }, { term: "Complementary coverage", definition: "Selecting glyphs from different semantic clusters to provide a richer, more nuanced response." }]} />, balancing semantic relevance with visual coherence on the E-Ink display.</>,
        specs: [{ k: "Input", v: "5 candidates" }, { k: "Output", v: "3 glyphs" }],
      },
      {
        label: "Rule Constraint",
        detail: "Glyph validation",
        time: "~5ms",
        expanded: <>Validates the selected glyph combination against <DV value="constraint rules" defense="Rules prevent degenerate outputs: no duplicate glyphs, no more than 2 glyphs from the same semantic cluster, and the companion word must not exceed 15 characters (E-Ink rendering constraint). If validation fails, the Picker is re-invoked with the constraint violation as additional context — this happens in <2% of consultations." vocab={[{ term: "Constraint rules", definition: "A set of deterministic checks applied after LLM selection to ensure the output meets display and semantic requirements." }, { term: "Re-invocation", definition: "Calling the Glyph Picker again with additional context when the initial selection violates a constraint." }]} /> to ensure valid output. Checks include <DV value="no duplicate glyphs" defense="Duplicate glyphs waste the limited 3-glyph budget and provide no additional information. The rule also prevents the Picker from over-indexing on a single strong theme at the expense of breadth." vocab={[{ term: "Degenerate output", definition: "A response that fails to provide useful information — e.g., three identical glyphs or an empty companion word." }, { term: "Display budget", definition: "The fixed output format of 3 glyphs + 1 word, constrained by the E-Ink display's layout." }]} />, cluster diversity, and word length limits.</>,
        specs: [{ k: "Fail rate", v: "<2%" }, { k: "Word max", v: "15 chars" }],
      },
    ],
    footer: {
      label: "Output",
      detail: "3 glyphs + 1 word → E-Ink",
      expanded: <>The final output is <DV value="3 glyphs + 1 word" defense="This constrained format forces Madie to distill complex emotional context into a minimal, contemplative response. Three glyphs provide enough semantic space for nuance (primary theme + modifier + contrast) while remaining instantly parseable on the 1.54″ E-Ink display. The companion word anchors interpretation." vocab={[{ term: "Companion word", definition: "A single word (≤15 characters) displayed alongside the 3 glyphs to anchor their interpretation in natural language." }, { term: "E-Ink display", definition: "A low-power electronic paper display (1.54″, 200×200px) that retains its image without power — ideal for a glanceable, always-on interface." }]} /> rendered on the E-Ink display. The format is <DV value="deliberately minimal" defense="Madie's design philosophy rejects information density in favor of contemplative simplicity. The 3+1 format was validated in user testing: participants reported feeling 'understood' rather than 'analyzed', which is the core emotional goal of the device." vocab={[{ term: "Contemplative interface", definition: "A UI paradigm that prioritizes reflection over information density — showing less to encourage deeper engagement." }, { term: "Glanceable", definition: "An interface designed to convey its message in under 2 seconds of visual attention." }]} /> — designed for reflection, not information overload.</>,
      specs: [{ k: "Glyphs", v: "3" }, { k: "Word", v: "≤15 chars" }],
    },
  },
];

function LaneStepRow({ step, isLast, color }: { step: LaneStep; isLast: boolean; color: string }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasDetail = !!step.expanded;

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
        borderBottom: isLast ? "none" : `1px solid ${colors.rule}`,
        background: open ? `${color}04` : hovered && hasDetail ? colors.inkFaint : "transparent",
        transition: "all 0.2s ease",
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.xs,
        padding: `${spacing.sm}px ${spacing.sm}px`,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...typography.label, fontWeight: weights.medium, color: open ? color : colors.ink, lineHeight: 1.3, transition: "color 0.2s" }}>{step.label}</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{step.detail}</div>
        </div>
        <span style={{ ...typography.label, color, fontWeight: weights.medium, flexShrink: 0 }}>{step.time}</span>
        {hasDetail && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: hovered || open ? 0.5 : 0.2, flexShrink: 0 }}>
            <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {open && step.expanded && (
        <StepContext.Provider value={step.label}>
        <div style={{ padding: `0 ${spacing.sm}px ${spacing.sm}px` }}>
          <div style={{ ...typography.body, color: colors.ink2, marginBottom: step.specs?.length ? spacing.xs : 0 }}>{step.expanded}</div>
          {step.specs && step.specs.length > 0 && (
            <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
              {step.specs.map((s) => (
                <span key={s.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                  <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{s.k}</span>{s.v}
                </span>
              ))}
            </div>
          )}
        </div>
        </StepContext.Provider>
      )}
    </div>
  );
}

function LaneFooterRow({ footer, color }: { footer: LaneFooter; color: string }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasDetail = !!footer.expanded;

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
        padding: `${spacing.xs}px ${spacing.sm}px`,
        borderTop: `1px solid ${colors.rule}`,
        background: open ? `${color}08` : `${color}04`,
        cursor: hasDetail ? "pointer" : "default",
        transition: "all 0.2s ease",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: spacing.xs }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...typography.label, fontWeight: weights.medium, color, lineHeight: 1.3 }}>{footer.label}</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{footer.detail}</div>
        </div>
        {hasDetail && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: hovered || open ? 0.5 : 0.2, flexShrink: 0 }}>
            <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {open && footer.expanded && (
        <StepContext.Provider value={footer.label}>
        <div style={{ paddingTop: spacing.xs }}>
          <div style={{ ...typography.body, color: colors.ink2, marginBottom: footer.specs?.length ? spacing.xs : 0 }}>{footer.expanded}</div>
          {footer.specs && footer.specs.length > 0 && (
            <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
              {footer.specs.map((s) => (
                <span key={s.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                  <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{s.k}</span>{s.v}
                </span>
              ))}
            </div>
          )}
        </div>
        </StepContext.Provider>
      )}
    </div>
  );
}

function LaneColumn({ lane }: { lane: typeof SERVICE_LANES[number] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Route label + flow line */}
      <div style={{ textAlign: "center", padding: `${spacing.xs}px 0` }}>
        <div style={{ width: 1, height: 12, background: `${lane.color}40`, margin: "0 auto" }} />
        <div style={{ ...typography.label, fontWeight: weights.medium, color: lane.color, margin: `${spacing.xxs}px 0` }}>
          {lane.route} <span style={{ color: colors.ink3, fontWeight: weights.regular }}>({lane.protocol})</span>
        </div>
        <div style={{ width: 1, height: 12, background: `${lane.color}40`, margin: "0 auto" }} />
      </div>

      {/* Lane card */}
      <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: `${spacing.sm}px ${spacing.sm}px`, borderBottom: `1px solid ${colors.rule}` }}>
          <div style={{ ...typography.label, fontWeight: weights.medium, color: lane.color }}>{lane.title}</div>
          <div style={{ ...typography.stat, color: colors.ink3, marginTop: 2 }}>{lane.subtitle}</div>
        </div>

        {/* Steps */}
        <div style={{ flex: 1 }}>
          {lane.steps.map((step, i) => (
            <LaneStepRow key={step.label} step={step} isLast={i === lane.steps.length - 1} color={lane.color} />
          ))}
        </div>

        {/* Footer */}
        <LaneFooterRow footer={lane.footer} color={lane.color} />
      </div>
    </div>
  );
}

function ServiceTopology() {
  return (
    <div style={{ marginBottom: spacing.lg }}>
      {/* Gateway */}
      <div style={{
        padding: `${spacing.sm}px ${spacing.md}px`,
        border: `1px solid ${colors.rule}`,
        borderRadius: radius.sm,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <span style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink }}>API Gateway</span>
          <span style={{ ...typography.stat, color: colors.ink3, marginLeft: spacing.xs }}>Kong — mTLS • TLS 1.3 • Rate limiting</span>
        </div>
        <div style={{ display: "flex", gap: spacing.xxs }}>
          <Chip color={zone.privacy}>mTLS per-device</Chip>
          <Chip color={zone.cloud}>1 WS / device</Chip>
          <Chip color={zone.cloud}>5 consults/hr</Chip>
        </div>
      </div>

      {/* Three lanes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.sm, alignItems: "stretch" }}>
        {SERVICE_LANES.map((lane) => (
          <LaneColumn key={lane.id} lane={lane} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 2: CLOUD ARCHITECTURE
   ═══════════════════════════════════════════════════════════════════════════ */

function CloudArchitecture() {
  return (
    <div>
      <ZoneLabel color={zone.cloud}>Cloud Infrastructure</ZoneLabel>

      {/* Service Topology */}
      <H3 style={{ marginBottom: spacing.md }}>Service Topology</H3>
      <ServiceTopology />

      {/* Infrastructure */}
      <H3 style={{ marginBottom: spacing.md }}>Infrastructure & Cost</H3>
      <CostCards />
      <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
        <Chip color={zone.cloud}>GCP / GKE Autopilot</Chip>
        <Chip color={zone.cloud}>T4 GPU node pool</Chip>
        <Chip color={zone.cloud}>NATS JetStream</Chip>
        <Chip color={zone.cloud}>Qdrant vector DB</Chip>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 3: TIER COMPRESSION PIPELINE
   ═══════════════════════════════════════════════════════════════════════════ */

const TIERS = [
  {
    tier: 0, name: "Raw Audio Buffer", retention: "2s", location: "PSRAM", color: zone.audio,
    description: <>Circular buffer in PSRAM capturing continuous <DV value="Opus-encoded" defense="Opus is a lossy audio codec optimized for speech at low bitrates (16-24 kbps). The ESP32-S3 encodes audio into Opus frames before writing to the ring buffer, reducing memory consumption by ~10x compared to raw PCM while preserving speech intelligibility for downstream STT processing." vocab={[{ term: "Opus", definition: "An open, royalty-free audio codec designed for interactive speech and music, supporting bitrates from 6 kbps to 510 kbps with low latency." }]} /> audio frames. The <DV value="500ms pre-roll" defense="Voice Activity Detection (VAD) introduces a processing delay — by the time VAD confirms speech has started, the first ~200-500ms of the utterance has already passed. The pre-roll buffer continuously overwrites itself with the last 500ms of audio, ensuring the speech onset is captured retroactively when VAD triggers." vocab={[{ term: "pre-roll", definition: "A continuously overwriting circular buffer that retains recent audio so that speech detected by VAD includes the utterance onset that occurred before the detection trigger." }, { term: "VAD", definition: "Voice Activity Detection — an algorithm that distinguishes speech from silence or background noise, used to trigger recording only when someone is talking." }]} /> ensures no speech onset is lost when VAD triggers.</>,
    specs: [
      { k: "Size", v: "64KB ring buffer" },
      { k: "Format", v: "Opus-encoded frames" },
      { k: "Pre-roll", v: "500ms" },
    ],
    compressor: "Cloud STT + Tonal + Env",
    compressorDetail: "Three parallel cloud consumers process the raw audio stream simultaneously, each extracting a different signal dimension.",
  },
  {
    tier: 1, name: "Processed Signals", retention: "1h", location: "Flash", color: zone.audio,
    description: <>The richest tier — all cloud analysis results merged into a single <DV value="structured payload" defense="Each 5-second window produces a JSON object with normalized fields: transcript segments, tonal scores (valence/arousal/stress as floats), environment classification, motion state, and social context. This rigid schema ensures every downstream compressor receives consistent input regardless of which cloud services contributed data." vocab={[{ term: "structured payload", definition: "A JSON object with a fixed schema containing all signal dimensions from one time window, enabling uniform downstream processing." }]} /> by the <DV value="5-second aggregator" defense="The aggregator collects outputs from all three cloud consumers over a 5-second window, aligns them temporally, and merges them into a single Tier 1 record. The 5-second window balances granularity (short enough to capture conversational turns) against overhead (long enough to amortize network and processing costs)." vocab={[{ term: "aggregator", definition: "A service that collects, temporally aligns, and merges outputs from multiple parallel consumers into a single unified record per time window." }]} />. This is the raw material that all downstream compression operates on.</>,
    specs: [
      { k: "Speech", v: "Transcripts, keywords, topics, speaker ID" },
      { k: "Tonal", v: "Valence, arousal, stress scores" },
      { k: "Environment", v: "Scene class, ambient events, crowd density, noise floor" },
      { k: "Context", v: "Motion state, social_context[], consultation flags" },
    ],
    compressor: "Hourly Compressor",
    compressorDetail: "K8s Job aggregates the last hour of Tier 1 payloads, extracting dominant patterns and discarding raw signal data.",
  },
  {
    tier: 2, name: "Daily Digest", retention: "1d", location: "Flash", color: zone.storage,
    description: <>Hourly summaries compressed into a day-level view. The compressor identifies arcs and patterns that only emerge over hours — <DV value="emotional trajectories" defense="Individual hourly snapshots show point-in-time emotional states, but trajectories reveal how emotions evolved across the day: morning anxiety resolving into afternoon calm, or stress building through consecutive meetings. These arcs are invisible at the hourly level and only emerge when the daily compressor sequences hourly emotional summaries." vocab={[{ term: "emotional trajectory", definition: "The directional change in emotional state over time — not a single measurement but a sequence showing how valence, arousal, and stress shifted across hours." }]} />, <DV value="environment transitions" defense="The daily compressor tracks how the user moved between different environmental contexts throughout the day (home to commute to office to restaurant). These transitions correlate with emotional and social shifts, revealing patterns like 'stress increases after commute' that single-hour snapshots cannot capture." vocab={[{ term: "environment transition", definition: "A detected change in the user's ambient context — e.g., from quiet home to noisy commute — identified by comparing consecutive hourly environment classifications." }]} />, recurring interactions.</>,
    specs: [
      { k: "Emotional", v: "Dominant topics, emotional arc, key moments" },
      { k: "Environment", v: "Profile, transitions between contexts" },
      { k: "Social", v: "Speaker interaction map, motion patterns" },
    ],
    compressor: "Daily Compressor",
    compressorDetail: "Merges 24 hourly summaries into a single daily digest, identifying cross-hour patterns and discarding hourly granularity.",
  },
  {
    tier: 3, name: "Weekly Digest", retention: "1w", location: "Flash", color: zone.storage,
    description: <>Daily digests compressed into week-level patterns. This is where <DV value="behavioral trends" defense="Behavioral trends are habits and rhythms that repeat across days: weekly meeting stress cycles, weekend recovery patterns, recurring social dynamics with specific people. These trends require at least 5-7 daily data points to distinguish from noise, which is why they only emerge at the weekly compression tier." vocab={[{ term: "behavioral trend", definition: "A recurring pattern in the user's emotional, social, or environmental data that repeats across multiple days, distinguishable from random variation only with sufficient temporal data." }]} /> become visible — recurring topics, shifting relationships, <DV value="decision patterns" defense="Decision patterns capture how the user's choices correlate with context: consistently avoiding social situations after high-stress days, making impulsive commitments during elevated arousal, or deferring decisions when fatigued. The weekly compressor cross-references daily emotional states with recorded actions to surface these correlations." vocab={[{ term: "decision pattern", definition: "A recurring correlation between the user's emotional or environmental context and the choices they make, detectable only when multiple days of data are compared." }]} /> that repeat across days.</>,
    specs: [
      { k: "Patterns", v: "Week-level emotional patterns, recurring topics" },
      { k: "Shifts", v: "Relational shifts, decision trends" },
      { k: "Correlations", v: "Environment-mood correlations" },
    ],
    compressor: "Weekly Compressor + Theme Merger",
    compressorDetail: "Compresses weekly data and feeds it into the Theme Merger, which uses E5-small-v2 to generate 384-dim embeddings with time-decay weighting.",
  },
  {
    tier: 4, name: "Long-Term Themes", retention: "2yr", location: "Flash (encrypted)", color: zone.privacy,
    description: <>The most compressed representation — theme embeddings that capture the user&apos;s long-term patterns. Encrypted with a <DV value="separate eFuse key" defense="Tier 4 data uses a dedicated AES key burned into a separate eFuse block from the general NVS encryption key. This means crypto-shredding Tier 4 (destroying its key) does not affect other tiers, and compromising the NVS key does not expose theme embeddings. Defense in depth: even if one key is extracted, the other tiers remain protected." vocab={[{ term: "eFuse key isolation", definition: "Using separate one-time-programmable fuse blocks for different encryption keys, ensuring that compromise or destruction of one key does not affect data protected by other keys." }]} />. This is what the consultation pipeline queries via <DV value="semantic search" defense="The consultation pipeline converts the user's question into a 384-dim embedding using the same E5-small-v2 model, then performs cosine similarity search against stored theme embeddings. This retrieves thematically relevant life patterns regardless of exact wording — asking 'Am I stressed at work?' matches themes about workplace anxiety even if those exact words never appeared in the original audio." vocab={[{ term: "semantic search", definition: "A retrieval method that matches queries to stored data by meaning (vector similarity) rather than exact keyword overlap, enabling conceptual matching across different phrasings." }]} />.</>,
    specs: [
      { k: "4a", v: "Emotional Patterns" },
      { k: "4b", v: "Relational Patterns" },
      { k: "4c", v: "Decision Patterns" },
      { k: "4d", v: "Theme Embeddings (384-dim vectors)" },
    ],
  },
];

function TierPipeline() {
  const [expandedTier, setExpandedTier] = useState<number | null>(null);

  return (
    <div>
      <ZoneLabel color={zone.storage}>Context Compression Pipeline</ZoneLabel>

      <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.md }}>
        {TIERS.map((t, i) => (
          <div key={t.tier}>
            {/* Compressor connector */}
            {i > 0 && TIERS[i - 1].compressor && (
              <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, padding: `${spacing.sm}px ${spacing.md}px`, background: `${TIERS[i - 1].color}04`, borderTop: `1px solid ${colors.rule}`, borderBottom: `1px solid ${colors.rule}` }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M5 1L5 7M3 5L5 7L7 5" stroke={TIERS[i - 1].color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                </svg>
                <span style={{ ...typography.label, fontWeight: weights.medium, color: TIERS[i - 1].color }}>{TIERS[i - 1].compressor}</span>
                {TIERS[i - 1].compressorDetail && (
                  <span style={{ ...typography.stat, color: colors.ink3, marginLeft: "auto" }}>{TIERS[i - 1].compressorDetail}</span>
                )}
              </div>
            )}
            {/* Tier row */}
            <div
              onClick={() => setExpandedTier(expandedTier === t.tier ? null : t.tier)}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: spacing.md, padding: `${spacing.sm + 2}px ${spacing.md}px`, background: expandedTier === t.tier ? `${t.color}04` : "transparent", transition: "background 0.15s" }}
            >
              <span style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: weights.light, color: t.color, lineHeight: 1, minWidth: 28 }}>{t.tier}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...typography.h3, fontSize: 15, color: colors.ink }}>{t.name}</span>
              </div>
              <span style={{ ...typography.label, color: colors.ink3, flexShrink: 0 }}>{t.retention}</span>
              <span style={{ ...typography.label, color: t.color, flexShrink: 0 }}>{t.location}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expandedTier === t.tier ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: expandedTier === t.tier ? 0.5 : 0.25, flexShrink: 0 }}>
                <path d="M3 4.5L6 7.5L9 4.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {/* Expanded detail */}
            {expandedTier === t.tier && (
              <div style={{ padding: `0 ${spacing.md}px ${spacing.md}px`, paddingLeft: spacing.md + 28 + spacing.md }}>
                <div style={{ ...typography.body, color: colors.ink2, marginBottom: spacing.sm }}>{t.description}</div>
                <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
                  {t.specs.map((s) => (
                    <span key={s.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                      <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{s.k}</span>{s.v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Concurrency */}
      <div style={{ padding: `${spacing.sm}px ${spacing.md}px`, border: `1px solid ${colors.rule}`, borderRadius: radius.sm }}>
        <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink, marginBottom: spacing.xxs }}>Concurrency Model</div>
        <Body>
          <strong>StorageManager</strong> is the sole writer/deleter to LittleFS. All cloud
          write-backs and compression results flow through a <code>tier_write_queue</code> (depth 16).
          Consultation reads are also serialized through StorageManager. This eliminates all race
          conditions by design.
        </Body>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 4: COMPANION APP & SOCIAL EXCHANGE
   ═══════════════════════════════════════════════════════════════════════════ */

const APP_SCREENS = [
  { screen: "WiFi Provisioning", desc: "Secure network onboarding over BLE", detail: <>Device broadcasts BLE advertisement. App discovers it, initiates <DV value="SRP6a mutual authentication" defense="Secure Remote Password version 6a lets the device and app prove identity to each other without transmitting the WiFi password in any form — not even a hash. The protocol is zero-knowledge: an eavesdropper on the BLE link learns nothing about the password, and a compromised server cannot replay credentials." vocab={[{ term: "zero-knowledge", definition: "A proof protocol where one party demonstrates knowledge of a secret without revealing the secret itself or any information that could help derive it." }, { term: "eavesdropper", definition: "A passive attacker who captures BLE packets in transit, attempting to extract credentials from the observed traffic." }]} />, then performs <DV value="X25519 key agreement" defense="X25519 (Curve25519 Diffie-Hellman) derives a shared encryption key between the app and device without either side transmitting the key. This ephemeral key encrypts WiFi credentials in transit. Even if BLE traffic is recorded, the credentials cannot be decrypted without the private keys that never leave either device." vocab={[{ term: "ephemeral key", definition: "A temporary cryptographic key generated for a single session and discarded afterward, providing forward secrecy." }, { term: "Diffie-Hellman", definition: "A key agreement protocol that allows two parties to establish a shared secret over an insecure channel without transmitting the secret itself." }]} /> to encrypt WiFi credentials in transit. Credentials are stored in <DV value="eFuse-protected NVS" defense="The ESP32-S3's eFuse block stores a hardware-unique AES key that is burned into silicon during provisioning. This key encrypts the NVS flash partition using AES-XTS. The eFuse is read-once — software and JTAG cannot extract the key after burning, so even physical flash removal yields only ciphertext." vocab={[{ term: "eFuse", definition: "One-time-programmable fuses in the ESP32-S3 silicon that store cryptographic keys — once burned, they cannot be read back via software or debug interfaces." }, { term: "AES-XTS", definition: "A disk encryption mode using AES that provides strong protection for data at rest, specifically designed for storage media where sectors can be independently accessed." }]} /> on the device — never in app storage.</>, specs: [{ k: "Auth", v: "SRP6a mutual" }, { k: "Key exchange", v: "X25519" }, { k: "Storage", v: "eFuse NVS (AES-XTS)" }] },
  { screen: "Device Status", desc: "Live hardware dashboard over BLE", detail: <><DV value="Real-time telemetry" defense="The device pushes hardware metrics continuously rather than requiring the app to poll. Push-based telemetry eliminates polling latency and reduces BLE connection overhead — the app subscribes once and receives updates as they occur, typically every 1-2 seconds." vocab={[{ term: "push-based telemetry", definition: "A data delivery model where the device initiates transmissions on state change, eliminating the latency and overhead of repeated client-side polling." }, { term: "polling latency", definition: "The delay between a state change on the device and the app detecting it, which grows proportionally with the polling interval." }]} /> streamed via <DV value="BLE notify characteristics" defense="BLE GATT notify characteristics allow the device to push data to the app without the app requesting it. Each characteristic maps to one metric (battery, WiFi RSSI, pipeline state, storage, sync timestamp). The app subscribes to all five on connect. Notifications are ~20 bytes each, well within a single BLE packet." vocab={[{ term: "GATT characteristic", definition: "A data container in the BLE Generic Attribute Profile that holds a single value — subscribing to notifications lets a client receive automatic updates when the value changes." }, { term: "BLE packet", definition: "A single BLE transmission unit, typically up to 251 bytes in BLE 5.0, carrying one or more attribute values." }]} />. Battery level, WiFi signal strength, pipeline state (idle/recording/streaming), per-tier storage utilization, and last successful cloud sync timestamp.</>, specs: [{ k: "Transport", v: "BLE notify" }, { k: "Metrics", v: "Battery, WiFi, pipeline, storage, sync" }] },
  { screen: "Tier Viewer", desc: "Read-only access to compressed context", detail: <>Timeline view of Tier 2/3/4 summaries. Data is fetched from device over BLE, held <DV value="in-memory only" defense="The app allocates tier data in volatile memory and releases it on screen exit. No SQLite, no AsyncStorage, no file writes. This guarantees that closing the app destroys all tier data — there is no forensic artifact on the phone. Even a device backup or forensic extraction of the phone yields zero Nara content." vocab={[{ term: "volatile memory", definition: "RAM that loses its contents when the process exits, as opposed to persistent storage (files, databases) that survives app restarts." }, { term: "forensic artifact", definition: "Data remnants left on a device that can be recovered through forensic analysis, such as cached files, database entries, or swap pages." }]} /> during viewing, and discarded on screen exit. No caching, no persistence. The app never sees <DV value="Tier 0 or Tier 1 data" defense="Tier 0 (raw audio) and Tier 1 (transcripts, tonal scores) contain the most sensitive information — actual speech content and emotional analysis. The companion app is deliberately excluded from these tiers. Even if the phone is compromised, the attacker gains access only to compressed summaries (Tier 2+), never raw recordings or transcripts." vocab={[{ term: "Tier 0", definition: "Raw 16 kHz audio frames captured by the microphone — the most privacy-sensitive tier, retained only in the device's ring buffer for seconds." }, { term: "Tier 1", definition: "Structured analysis output (transcripts, tonal scores, environment classification) produced by the cloud pipeline from Tier 0 audio." }]} />.</>, specs: [{ k: "Access", v: "Read-only, Tier 2/3/4" }, { k: "Persistence", v: "In-memory only" }] },
  { screen: "Privacy Controls", desc: "User privacy preferences", detail: <>Hardware mic toggle (sends <DV value="GPIO command over BLE" defense="The mic mute is implemented as a hardware-level GPIO pin toggle, not a software flag. The app sends a BLE write command that the ESP32-S3 translates into a physical GPIO state change, cutting power to the MEMS microphone at the electrical level. Software cannot override a hardware mute — even a compromised firmware update cannot re-enable the mic while the GPIO pin is held low." vocab={[{ term: "GPIO", definition: "General Purpose Input/Output — a physical pin on the ESP32-S3 that can be programmatically set high or low to control external hardware like the microphone power rail." }, { term: "hardware mute", definition: "A mute mechanism that physically disconnects or depowers the microphone, as opposed to a software mute that merely discards audio samples." }]} />), configurable quiet hours (device stops recording during set windows), per-tier retention overrides, and manual <DV value="crypto-shredding trigger" defense="Crypto-shredding deletes the encryption key for a specific tier rather than overwriting the data itself. Since all tier data is encrypted with a per-tier AES key, destroying the key renders the ciphertext permanently unrecoverable. This is faster than secure erasure of flash (which requires multiple overwrite passes) and equally irreversible." vocab={[{ term: "crypto-shredding", definition: "A data destruction technique that renders encrypted data permanently unrecoverable by deleting the encryption key rather than the data itself." }, { term: "per-tier AES key", definition: "A unique AES encryption key assigned to each data tier, enabling selective destruction — shredding one tier's key leaves other tiers intact." }]} /> for any individual tier.</>, specs: [{ k: "Mic toggle", v: "GPIO over BLE" }, { k: "Shredding", v: "Per-tier, irreversible" }] },
  { screen: "Consent Settings", desc: "Per-category data opt-in", detail: <>Granular consent toggles: audio capture, environmental sensing, emotional analysis, biometric/voiceprint, and social exchange. <DV value="All default to disabled" defense="Opt-in rather than opt-out is a deliberate privacy-by-design choice. The device ships with every data category disabled and collects nothing until the user explicitly enables each toggle. This inverts the typical pattern where devices collect everything by default and rely on users to find and disable settings." vocab={[{ term: "privacy-by-design", definition: "An engineering approach where privacy protections are built into the system architecture from the start, rather than added as afterthoughts or user-configurable options." }, { term: "opt-in consent", definition: "A consent model requiring explicit affirmative action to enable data collection, as opposed to opt-out models that collect by default." }]} />. Changes are signed and sent to device over BLE. <DV value="Bystander notification mode" defense="When recording is active, the device can signal its presence to non-users through configurable indicators (LED pulse, periodic tone, or BLE beacon). This addresses the bystander consent problem — people near the device who did not choose to be recorded deserve awareness that audio capture is occurring." vocab={[{ term: "bystander consent", definition: "The ethical and legal requirement to inform people in the vicinity of a recording device, even if they are not the device owner or a paired user." }, { term: "BLE beacon", definition: "A periodic BLE advertisement broadcast that nearby phones can detect, used here to passively notify bystanders via a companion notification app." }]} /> configures how the device signals to others that recording is active.</>, specs: [{ k: "Default", v: "All disabled" }, { k: "Categories", v: "Audio, env, emotional, biometric, social" }] },
  { screen: "Social Manager", desc: "Trusted device management", detail: <>View paired devices, adjust <DV value="per-device sharing levels" defense="Each paired device is independently assigned a sharing level (0, 1, or 2). Level 0 shares only presence, Level 1 adds environment context, Level 2 adds topics and valence. Granular per-device control means you can share more with close friends and less with acquaintances, without an all-or-nothing choice." vocab={[{ term: "sharing level", definition: "A 3-tier permission (0/1/2) controlling how much social context data is exchanged with a specific paired device, enforced by the mutual minimum model." }, { term: "mutual minimum", definition: "The effective sharing level between two devices is always the lower of their independently chosen levels — neither device can force the other to share more." }]} /> (0/1/2), block or unpair devices. Blocked devices are added to a <DV value="deny list" defense="The deny list is stored in NVS on the device itself, not in the cloud or the app. When a BLE scan detects an advertisement from a denied device, the firmware drops it at the radio layer before any processing occurs. This is enforced in hardware-adjacent firmware — even a compromised app cannot override the device-side deny list." vocab={[{ term: "deny list", definition: "A persistent blocklist stored in device NVS containing the BLE MAC addresses of devices whose advertisements should be silently ignored." }, { term: "radio-layer filtering", definition: "Dropping unwanted BLE packets at the earliest processing stage, before they reach application logic, minimizing CPU and power cost." }]} /> — the device will ignore their BLE advertisements entirely.</>, specs: [{ k: "Actions", v: "Pair, adjust level, block, unpair" }, { k: "Enforcement", v: "Device-side deny list" }] },
  { screen: "OTA Firmware", desc: "Secure firmware updates", detail: <>Firmware images are <DV value="Ed25519-signed" defense="Every firmware binary is signed with an Ed25519 key held by the build server. The device stores the corresponding public key in eFuse — it cannot be changed after manufacturing. Before flashing, the bootloader verifies the signature against the eFuse public key. A forged or tampered image fails verification and is rejected before any code executes." vocab={[{ term: "Ed25519", definition: "An elliptic curve digital signature algorithm using Curve25519, providing 128-bit security with 64-byte signatures and constant-time verification resistant to timing attacks." }, { term: "eFuse public key", definition: "The Ed25519 verification key burned into the ESP32-S3's one-time-programmable fuses during manufacturing, ensuring only firmware signed by the authorized build key can boot." }]} /> and delivered over WiFi (not BLE — too slow). <DV value="Dual A/B OTA slots" defense="The ESP32-S3 flash is partitioned into two equal firmware slots (A and B). New firmware is written to the inactive slot while the current slot continues running. On reboot, the bootloader tries the new slot — if it fails health checks within 30 seconds, the bootloader automatically reverts to the previous slot. This guarantees the device is never bricked by a bad update." vocab={[{ term: "A/B partitioning", definition: "A firmware update strategy using two equal flash partitions so that one always holds a known-good image, enabling automatic rollback on boot failure." }, { term: "rollback", definition: "Automatic reversion to the previously running firmware if the newly flashed image fails to boot or pass health checks within a timeout window." }]} /> with automatic rollback on boot failure. The app triggers the update check; the device handles download and verification independently.</>, specs: [{ k: "Signing", v: "Ed25519" }, { k: "Delivery", v: "WiFi, dual A/B slots" }] },
];

function CompanionAndSocial() {
  const [expandedScreen, setExpandedScreen] = useState<string | null>(null);
  const [expandedSharing, setExpandedSharing] = useState<number | null>(null);
  const [expandedPacket, setExpandedPacket] = useState<string | null>(null);
  const [expandedTrust, setExpandedTrust] = useState<string | null>(null);

  return (
    <div>
      <ZoneLabel color={zone.app}>Companion App — React Native (Expo)</ZoneLabel>

      {/* App screens — two independent columns like BomGrid */}
      <div style={{ display: "flex", border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.lg }}>
        {[0, 1].map((col) => (
          <div key={col} style={{ flex: 1, borderRight: col === 0 ? `1px solid ${colors.rule}` : "none" }}>
            {APP_SCREENS.filter((_, i) => i % 2 === col).map((s, i, arr) => {
              const isOpen = expandedScreen === s.screen;
              return (
                <div key={s.screen}>
                  <div
                    onClick={() => setExpandedScreen(isOpen ? null : s.screen)}
                    style={{ cursor: "pointer", padding: `${spacing.sm}px ${spacing.md}px`, borderBottom: i < arr.length - 1 || isOpen ? `1px solid ${colors.rule}` : "none", background: isOpen ? `${zone.app}04` : "transparent", transition: "background 0.15s" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ ...typography.h3, fontSize: 14, color: isOpen ? zone.app : colors.ink }}>{s.screen}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: isOpen ? 0.5 : 0.25, flexShrink: 0 }}>
                        <path d="M3 4.5L6 7.5L9 4.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div style={{ ...typography.stat, color: colors.ink3, marginTop: 2 }}>{s.desc}</div>
                  </div>
                  {isOpen && (
                    <StepContext.Provider value={s.screen}>
                    <div style={{ padding: `${spacing.xs}px ${spacing.md}px ${spacing.md}px`, borderBottom: i < arr.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
                      <div style={{ ...typography.body, color: colors.ink2, marginBottom: spacing.sm }}>{s.detail}</div>
                      <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
                        {s.specs.map((sp) => (
                          <span key={sp.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                            <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{sp.k}</span>{sp.v}
                          </span>
                        ))}
                      </div>
                    </div>
                    </StepContext.Provider>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <ContentDivider />
      <ZoneLabel color={zone.social}>Social Exchange Protocol</ZoneLabel>

      {/* Three panels side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: spacing.sm, marginBottom: spacing.md, alignItems: "stretch" }}>
        {/* Sharing Levels */}
        <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden" }}>
          <div style={{ padding: `${spacing.sm}px ${spacing.sm}px`, borderBottom: `1px solid ${colors.rule}` }}>
            <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink }}>Sharing Levels</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink3, marginTop: 2 }}>Mutual minimum model</div>
          </div>
          {([
            { level: 0, label: "Presence only", fields: "BLE range detection", detail: <>Devices broadcast only a <DV value="Nara UUID" defense="A custom 128-bit BLE service UUID that identifies a device as a Nara. Other Nara devices scan for this UUID to detect presence. No payload is exchanged at Level 0 — the mere existence of the advertisement is the signal." vocab={[
              { term: "BLE service UUID", definition: "A universally unique identifier advertised in BLE packets that allows scanners to identify the type of service a device offers without connecting." },
              { term: "advertisement", definition: "A periodic BLE broadcast packet (every 100-1000 ms) that nearby devices can detect without establishing a connection." },
            ]} /> in their BLE advertisements. No data is exchanged — presence detection is purely passive scanning. This is the <DV value="mutual minimum" defense="Both devices independently choose a sharing level (0, 1, or 2). The effective level for any pair is the lower of the two choices. This ensures no device ever shares more than it consents to, even if the other device requests more." vocab={[
              { term: "mutual minimum", definition: "A consent model where the effective sharing level between two devices is always the lower of the two independently chosen levels — neither device can force the other to share more." },
            ]} /> floor — every paired device starts here.</>, specs: [{ k: "Data", v: "None" }, { k: "Range", v: "~10 m BLE" }] },
            { level: 1, label: "+ Environment", fields: "environment_class, presence_duration", detail: <>Adds <DV value="environment_class" defense="A coarse 12-value enum (e.g., home, office, café, transit, park) classified on-device by YAMNet from ambient audio. Coarse classification prevents location fingerprinting — 'café' doesn't reveal which café." vocab={[
              { term: "environment_class", definition: "One of 12 predefined scene labels derived from ambient audio classification, providing context without precise location data." },
              { term: "YAMNet", definition: "A TensorFlow audio event classifier trained on AudioSet, used here to map ambient sound into coarse environment categories." },
            ]} /> and <DV value="presence_duration" defense="The elapsed time both devices have been within BLE range, measured in seconds. This reveals interaction intensity (brief passing vs. sustained proximity) without timestamps or location history." vocab={[
              { term: "presence_duration", definition: "A running counter of how long two devices have been within BLE range of each other during the current encounter, reset when they separate." },
            ]} /> to the packet. This middle tier reveals where you are (coarsely) and how long you have been near someone, but not what you are discussing or how you feel.</>, specs: [{ k: "Fields", v: "2 added" }, { k: "Privacy", v: "No topics" }] },
            { level: 2, label: "+ Topics + Valence", fields: "topic_overlap_tags, emotional_valence", detail: <>The maximum sharing level adds <DV value="topic_overlap_tags" defense="Up to 5 short tags (max 32 chars each) representing conversation topics detected by the STT and NLP pipeline. Tags are generated on the cloud side and included only when both devices opt into Level 2. The 5-tag / 32-char constraint limits information density." vocab={[
              { term: "topic_overlap_tags", definition: "Short keyword tags (e.g., 'machine-learning', 'travel-plans') extracted from speech transcripts, representing shared conversation topics between two nearby users." },
            ]} /> and <DV value="emotional_valence" defense="A 3-level scale (+/neutral/−) derived from wav2vec2-emotion analysis. Three levels rather than a continuous score because coarse valence preserves privacy — it reveals general mood direction without exposing nuanced emotional states that could be manipulated." vocab={[
              { term: "emotional_valence", definition: "A simplified measure of emotional tone collapsed to three states: positive, neutral, or negative — intentionally coarse to limit emotional surveillance." },
              { term: "wav2vec2-emotion", definition: "A fine-tuned speech emotion recognition model that classifies vocal prosody into emotional categories, used here to derive the 3-level valence." },
            ]} />. This is the richest social signal Nara exchanges — still far less than a social media profile.</>, specs: [{ k: "Fields", v: "2 added" }, { k: "Max tags", v: "5 × 32 chars" }] },
          ] as const).map((l, i, arr) => {
            const isOpen = expandedSharing === l.level;
            return (
              <div key={l.level} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
                <div
                  onClick={() => setExpandedSharing(isOpen ? null : l.level)}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: spacing.xs, padding: `${spacing.sm}px`, transition: "background 0.15s" }}
                >
                  <span style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: weights.light, color: l.level === 0 ? colors.ink3 : zone.social, lineHeight: 1, minWidth: 12 }}>{l.level}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink, lineHeight: 1.3 }}>{l.label}</div>
                    <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{l.fields}</div>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: isOpen ? 0.5 : 0.2, flexShrink: 0 }}>
                    <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {isOpen && (
                  <StepContext.Provider value={l.label}>
                    <div style={{ padding: `0 ${spacing.sm}px ${spacing.sm}px`, paddingLeft: spacing.sm + 12 + spacing.xs }}>
                      <div style={{ ...typography.body, color: colors.ink2, marginBottom: spacing.xs }}>{l.detail}</div>
                      <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
                        {l.specs.map((sp) => (
                          <span key={sp.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                            <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{sp.k}</span>{sp.v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </StepContext.Provider>
                )}
              </div>
            );
          })}
        </div>

        {/* SocialContextPacket */}
        <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden" }}>
          <div style={{ padding: `${spacing.sm}px ${spacing.sm}px`, borderBottom: `1px solid ${colors.rule}` }}>
            <div style={{ ...typography.label, fontWeight: weights.medium, color: zone.social }}>SocialContextPacket</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink3, marginTop: 2 }}>Signed per-exchange payload</div>
          </div>
          {([
            { field: "environment_class", desc: "12-value enum", detail: <>A <DV value="12-value enum" defense="Twelve coarse scene categories (home, office, café, transit, park, gym, restaurant, store, outdoor, medical, education, other) provide enough context for social relevance without enabling location fingerprinting. Twelve was chosen because finer granularity (e.g., 50 AudioSet classes) leaks location identity — 'independent-coffee-shop' narrows to a specific venue, but 'café' does not." vocab={[
              { term: "scene category", definition: "A coarse label for the acoustic environment, derived from ambient audio classification rather than GPS or network-based location." },
              { term: "location fingerprinting", definition: "The ability to identify a specific venue from contextual data — overly specific environment labels enable this attack." },
            ]} /> classified on-device by <DV value="YAMNet" defense="A lightweight audio event classifier (TFLite, ~900 KB) that maps 521 AudioSet classes down to 12 environment categories via a lookup table. Runs on Core 1 during audio capture with negligible CPU overhead (~2 ms per 960 ms frame)." vocab={[
              { term: "YAMNet", definition: "Yet Another Mobile Network — a MobileNet-based audio classifier trained on Google's AudioSet, mapping raw audio to 521 event labels." },
              { term: "AudioSet", definition: "A large-scale dataset of 10-second YouTube clips labeled with 632 audio event categories, used to train general-purpose audio classifiers." },
            ]} /> from ambient audio. Coarse rather than fine-grained to prevent <DV value="venue identification" defense="If the environment label were specific enough (e.g., 'Starbucks-Reserve-Bar'), an adversary could cross-reference it with location databases to determine the user's exact position. Collapsing to 12 categories makes this attack infeasible." vocab={[
              { term: "venue identification", definition: "Determining a user's specific physical location by correlating contextual metadata with known venue characteristics." },
            ]} />.</>, specs: [{ k: "Categories", v: "12" }, { k: "Classifier", v: "YAMNet" }] },
            { field: "topic_overlap_tags", desc: "Max 5, 32 chars", detail: <>Up to <DV value="5 tags, 32 chars each" defense="The 5-tag limit caps the information bandwidth of each social exchange to ~160 bytes of topic data. More tags would allow reconstructing conversation content; fewer would lose semantic value. The 32-character limit per tag forces concise keywords rather than sentences, further limiting information leakage." vocab={[
              { term: "information bandwidth", definition: "The amount of meaningful data transmitted per exchange — deliberately constrained here to prevent social packets from becoming surveillance vectors." },
            ]} /> extracted from speech transcripts by the cloud NLP pipeline. Tags represent <DV value="shared conversation topics" defense="Tags are generated only from speech segments where both devices are in BLE range simultaneously, ensuring they reflect shared context rather than private conversations that happened to occur nearby." vocab={[
              { term: "shared conversation topics", definition: "Keyword tags derived from speech that occurred while two specific devices were within BLE range, representing mutual context rather than individual activity." },
            ]} /> — for example, &lsquo;machine-learning&rsquo;, &lsquo;weekend-hiking&rsquo;, or &lsquo;project-deadline&rsquo;.</>, specs: [{ k: "Max tags", v: "5" }, { k: "Max chars", v: "32 each" }] },
            { field: "emotional_valence", desc: "+/neutral/−", detail: <>A <DV value="3-level scale" defense="Collapsing continuous emotion scores to three discrete levels (+/neutral/−) is a deliberate privacy choice. A continuous score (0.0-1.0) would enable emotion tracking over time, revealing patterns like 'user becomes negative every Monday afternoon.' Three levels provide social context without enabling emotional surveillance." vocab={[
              { term: "emotional surveillance", definition: "Tracking fine-grained emotional states over time to build behavioral profiles — prevented here by using only three coarse levels." },
              { term: "continuous emotion score", definition: "A floating-point value representing emotional intensity, which would enable precise mood tracking if transmitted." },
            ]} /> derived from <DV value="wav2vec2-emotion" defense="A fine-tuned speech emotion model running in the cloud that classifies vocal prosody (pitch, rhythm, energy) into emotional categories. The continuous output is quantized to three levels before inclusion in the SocialContextPacket." vocab={[
              { term: "vocal prosody", definition: "The patterns of stress, rhythm, and intonation in speech that convey emotional state independent of word content." },
            ]} /> analysis. Positive, neutral, or negative — intentionally coarse to reveal general mood direction without exposing nuanced emotional states.</>, specs: [{ k: "Levels", v: "3" }, { k: "Source", v: "wav2vec2" }] },
            { field: "presence_duration", desc: "Time in range", detail: <>Elapsed time in seconds that both devices have been within <DV value="BLE range" defense="BLE 5.0 on the ESP32-S3 has an effective range of ~10 meters indoors. Presence duration is measured by counting consecutive BLE advertisement intervals (100 ms each) where the peer device is detected. The counter resets when the peer is absent for more than 30 seconds." vocab={[
              { term: "BLE range", definition: "The effective distance over which BLE advertisements can be reliably detected — approximately 10 meters indoors for the ESP32-S3 at 0 dBm transmit power." },
              { term: "advertisement interval", definition: "The time between consecutive BLE broadcast packets — set to 100 ms for Nara to balance discovery speed against power consumption." },
            ]} /> of each other. Reveals <DV value="interaction intensity" defense="A 30-second presence is a brief passing; a 45-minute presence suggests a sustained conversation or shared activity. This single scalar conveys social significance without recording what was said or where it happened." vocab={[
              { term: "interaction intensity", definition: "A qualitative measure of social engagement inferred from how long two people remain in physical proximity." },
            ]} /> — whether an encounter was a brief passing or a sustained interaction — without timestamps or location history.</>, specs: [{ k: "Unit", v: "seconds" }, { k: "Reset", v: "30 s absence" }] },
            { field: "packet_signature", desc: "Ed25519 signed", detail: <>Every SocialContextPacket is signed with <DV value="Ed25519" defense="Ed25519 provides 128-bit security with 64-byte signatures and fast verification (~70 us on ESP32-S3). The signing key is generated during first boot and stored in NVS. Each packet includes the signature so the receiver can verify the sender's identity and detect tampering." vocab={[
              { term: "Ed25519", definition: "An elliptic curve digital signature algorithm using Curve25519, chosen for its speed, small signature size, and resistance to timing attacks." },
              { term: "signing key", definition: "A private key stored in NVS that never leaves the device — only the corresponding public key is shared during the X25519 key exchange ceremony." },
            ]} /> using the device's private key. This prevents <DV value="packet spoofing" defense="Without signatures, a malicious device could forge SocialContextPackets claiming to be from a trusted peer. Ed25519 signatures bind each packet to the sender's identity, making forgery computationally infeasible (would require breaking 128-bit elliptic curve security)." vocab={[
              { term: "packet spoofing", definition: "Forging network packets with a false source identity to impersonate a trusted device or inject malicious data." },
            ]} /> — receivers verify every packet against the sender's public key before processing.</>, specs: [{ k: "Algorithm", v: "Ed25519" }, { k: "Signature", v: "64 bytes" }] },
          ] as const).map((f, i, arr) => {
            const isOpen = expandedPacket === f.field;
            return (
              <div key={f.field} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
                <div
                  onClick={() => setExpandedPacket(isOpen ? null : f.field)}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: spacing.xs, padding: `${spacing.sm}px`, transition: "background 0.15s" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink, lineHeight: 1.3 }}>{f.field}</div>
                    <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{f.desc}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: spacing.xxs }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: isOpen ? 0.5 : 0.2, flexShrink: 0 }}>
                      <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                {isOpen && (
                  <StepContext.Provider value={f.field}>
                    <div style={{ padding: `0 ${spacing.sm}px ${spacing.sm}px` }}>
                      <div style={{ ...typography.body, color: colors.ink2, marginBottom: spacing.xs }}>{f.detail}</div>
                      <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
                        {f.specs.map((sp) => (
                          <span key={sp.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                            <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{sp.k}</span>{sp.v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </StepContext.Provider>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust Model */}
        <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden" }}>
          <div style={{ padding: `${spacing.sm}px ${spacing.sm}px`, borderBottom: `1px solid ${colors.rule}` }}>
            <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink }}>Trust Model</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink3, marginTop: 2 }}>BLE pairing ceremony</div>
          </div>
          {([
            { step: "Discovery", value: "BLE advertising", detail: <>Devices broadcast a <DV value="Nara UUID" defense="A custom 128-bit BLE service UUID (registered in the Nara firmware) that uniquely identifies the device as a Nara. Scanners filter for this UUID to avoid processing irrelevant BLE traffic from other devices (headphones, fitness trackers, etc.)." vocab={[
              { term: "BLE service UUID", definition: "A 128-bit identifier included in BLE advertisement packets that allows scanning devices to filter for specific services without connecting." },
              { term: "BLE scanner", definition: "A device actively listening for BLE advertisement packets, filtering by UUID to find specific types of nearby devices." },
            ]} /> in BLE advertisement packets. Nearby Nara devices <DV value="scan for this UUID" defense="Active scanning runs continuously on Core 0 at a 100 ms scan window. When a matching UUID is detected, the scanner records the peer's MAC address and RSSI but does not initiate a connection — discovery is passive and connectionless." vocab={[
              { term: "scan window", definition: "The duration within each scan interval that the BLE radio actively listens for advertisements — set to 100 ms for reliable detection." },
              { term: "RSSI", definition: "Received Signal Strength Indicator — a measure of the received BLE signal power, used to estimate proximity (stronger signal means closer device)." },
            ]} /> to detect peers. Discovery is passive and connectionless — no data is exchanged until pairing is initiated.</>, specs: [{ k: "Method", v: "BLE scan" }, { k: "UUID", v: "Custom 128-bit" }] },
            { step: "First pairing", value: "Button press (5s)", detail: <>Both users must <DV value="simultaneously press a physical button" defense="Requiring simultaneous button presses within a 5-second window ensures both users explicitly consent to pairing. This physical ceremony prevents remote pairing attacks — an adversary cannot pair with your device without physical access and your active participation." vocab={[
              { term: "pairing ceremony", definition: "A deliberate physical ritual that establishes trust between two devices, requiring conscious action from both users to prevent unauthorized connections." },
            ]} /> within a <DV value="5-second window" defense="The 5-second window is wide enough for two humans to coordinate ('press now') but narrow enough to prevent accidental pairing. If the window were shorter (e.g., 1 s), coordination would be frustrating; if longer (e.g., 30 s), the risk of accidental pairing with a passing stranger increases." vocab={[
              { term: "pairing window", definition: "The time interval during which both devices must receive a button press for the pairing to succeed — a security/usability trade-off." },
            ]} />. This physical ceremony ensures mutual consent and prevents <DV value="remote pairing attacks" defense="Without a physical ceremony, a malicious device in BLE range could silently initiate pairing. The button press requirement means an attacker needs physical proximity AND the user's active cooperation, raising the attack cost from 'passive eavesdropping' to 'social engineering.'" vocab={[
              { term: "remote pairing attack", definition: "An attack where a malicious device initiates a BLE pairing without the user's knowledge or consent, potentially gaining access to exchange social data." },
            ]} />.</>, specs: [{ k: "Window", v: "5 seconds" }, { k: "Requires", v: "Both users" }] },
            { step: "Key exchange", value: "X25519 → public keys", detail: <>After the button ceremony, devices perform <DV value="X25519 key agreement" defense="X25519 (Curve25519 Diffie-Hellman) generates a shared secret from each device's ephemeral key pair. This curve was chosen for its speed on embedded platforms (~2 ms on ESP32-S3), resistance to timing attacks (constant-time implementation), and 128-bit security level." vocab={[
              { term: "X25519", definition: "An elliptic curve Diffie-Hellman function using Curve25519, designed by Daniel Bernstein for high performance and security on constrained devices." },
              { term: "Diffie-Hellman", definition: "A key agreement protocol that allows two parties to establish a shared secret over an insecure channel without transmitting the secret itself." },
            ]} />. Each device generates an ephemeral key pair, exchanges <DV value="public keys" defense="Only public keys are transmitted over BLE. The shared secret is derived independently on each device using its own private key and the peer's public key. Private keys never leave the device and are stored in NVS with flash encryption enabled." vocab={[
              { term: "ephemeral key pair", definition: "A temporary public/private key pair generated for a single key exchange session, providing forward secrecy if long-term keys are later compromised." },
              { term: "forward secrecy", definition: "A property where compromise of long-term keys does not compromise past session keys, because each session used unique ephemeral keys." },
            ]} /> over BLE, and derives a shared secret. The peer's public key is stored in NVS for future verification.</>, specs: [{ k: "Curve", v: "Curve25519" }, { k: "Security", v: "128-bit" }] },
            { step: "Ongoing auth", value: "Ed25519 packets", detail: <>After key exchange, every subsequent <DV value="SocialContextPacket is signed" defense="Per-packet Ed25519 signatures ensure that every piece of social data is authenticated. The receiver verifies the signature against the sender's stored public key before processing any fields. A single invalid signature causes the entire packet to be dropped." vocab={[
              { term: "per-packet signing", definition: "Applying a cryptographic signature to each individual data packet rather than to sessions or streams, ensuring integrity at the finest granularity." },
            ]} /> with the sender's Ed25519 private key. The receiver <DV value="verifies every packet" defense="Verification takes ~70 us on the ESP32-S3, negligible compared to the BLE transmission time. Verifying every packet (rather than sampling) prevents an attacker from injecting even a single forged packet into the stream." vocab={[
              { term: "signature verification", definition: "The mathematical process of confirming that a digital signature was produced by the claimed sender's private key, using only their public key." },
            ]} /> against the sender's stored public key before processing. Failed verification silently drops the packet.</>, specs: [{ k: "Verify", v: "~70 us" }, { k: "On fail", v: "Silent drop" }] },
            { step: "Anti-poisoning", value: "1 pkt/device/60s", detail: <>Two defenses prevent abuse: <DV value="schema validation" defense="Every incoming SocialContextPacket is validated against a strict schema before processing. Fields must match expected types and ranges (e.g., environment_class must be one of 12 enum values, topic_overlap_tags must be ≤5 items of ≤32 chars). Malformed packets are dropped before reaching application logic." vocab={[
              { term: "schema validation", definition: "Checking that incoming data conforms to a predefined structure (correct fields, types, and value ranges) before processing." },
            ]} /> rejects malformed packets, and <DV value="rate limiting" defense="Each peer device is limited to 1 packet per 60 seconds. This prevents flooding attacks where a malicious device sends thousands of packets to overwhelm processing, drain battery, or bias the social context with repeated data. The 60-second window matches natural social interaction cadence." vocab={[
              { term: "rate limiting", definition: "Restricting the number of packets accepted from a single source within a time window to prevent resource exhaustion and data flooding." },
              { term: "flooding attack", definition: "An attack where a malicious device sends an excessive volume of packets to overwhelm the receiver's processing capacity or storage." },
            ]} /> at 1 packet per device per 60 seconds prevents flooding. Together, these ensure a compromised peer cannot corrupt the device's social context or drain its battery.</>, specs: [{ k: "Rate", v: "1 pkt/60 s" }, { k: "Validation", v: "Strict schema" }] },
          ] as const).map((s, i, arr) => {
            const isOpen = expandedTrust === s.step;
            return (
              <div key={s.step} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
                <div
                  onClick={() => setExpandedTrust(isOpen ? null : s.step)}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: spacing.xs, padding: `${spacing.sm}px`, transition: "background 0.15s" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink, lineHeight: 1.3 }}>{s.step}</div>
                    <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.4, marginTop: 1 }}>{s.value}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: spacing.xxs }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: isOpen ? 0.5 : 0.2, flexShrink: 0 }}>
                      <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                {isOpen && (
                  <StepContext.Provider value={s.step}>
                    <div style={{ padding: `0 ${spacing.sm}px ${spacing.sm}px` }}>
                      <div style={{ ...typography.body, color: colors.ink2, marginBottom: spacing.xs }}>{s.detail}</div>
                      <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
                        {s.specs.map((sp) => (
                          <span key={sp.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                            <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{sp.k}</span>{sp.v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </StepContext.Provider>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration Path — pill chain */}
      <div style={{ display: "flex", alignItems: "center", gap: spacing.xxs, flexWrap: "wrap" }}>
        <span style={{ ...typography.label, color: colors.ink3, marginRight: spacing.xxs }}>Integration</span>
        {[
          { label: "External Context Buffer", color: zone.social },
          { label: "Tier 1", color: zone.audio },
          { label: "Tier 2–3", color: zone.storage },
          { label: "Tier 4b", color: zone.privacy },
        ].map((n, i, arr) => (
          <div key={n.label} style={{ display: "flex", alignItems: "center", gap: spacing.xxs }}>
            <span style={{ ...typography.label, fontWeight: weights.medium, color: n.color, padding: `3px ${spacing.xs}px 2px`, background: `${n.color}08`, borderRadius: radius.sm, border: `1px solid ${n.color}20`, whiteSpace: "nowrap" }}>{n.label}</span>
            {i < arr.length - 1 && (
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1 4H9M7 1.5L10 4L7 6.5" stroke={colors.ink3} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 5: PRIVACY & DATA LIFECYCLE
   ═══════════════════════════════════════════════════════════════════════════ */

function PrivacyLifecycle() {
  return (
    <div>
      <ZoneLabel color={zone.privacy}>Privacy & Data Lifecycle</ZoneLabel>

      {/* Right to Erasure */}
      <H3 style={{ marginBottom: spacing.md }}>Right to Erasure (GDPR Art. 17)</H3>
      <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.md }}>
        {/* Erasure flow as sequential steps */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
          {[
            { step: "1", label: "User requests deletion", actor: "Companion App", color: zone.app },
            { step: "2", label: "Delete backups + KEK", actor: "Cloud", color: zone.cloud },
            { step: "3", label: "Zero tier key sectors", actor: "Device", color: zone.device },
            { step: "4", label: "Signed receipt returned", actor: "Attestation", color: colors.help },
          ].map((s, i, arr) => (
            <div key={s.step} style={{ padding: `${spacing.sm}px ${spacing.sm}px`, borderRight: i < arr.length - 1 ? `1px solid ${colors.rule}` : "none", display: "flex", flexDirection: "column", gap: spacing.xxs }}>
              <div style={{ display: "flex", alignItems: "center", gap: spacing.xs }}>
                <span style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: weights.light, color: s.color, lineHeight: 1 }}>{s.step}</span>
                <span style={{ ...typography.label, color: s.color, fontWeight: weights.medium }}>{s.actor}</span>
              </div>
              <div style={{ ...typography.stat, color: colors.ink2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* Crypto-shredding explanation */}
        <div style={{ padding: `${spacing.sm}px`, borderTop: `1px solid ${colors.rule}`, background: `${zone.privacy}03` }}>
          <div style={{ ...typography.label, fontWeight: weights.medium, color: zone.privacy, marginBottom: spacing.xxs }}>Crypto-Shredding</div>
          <div style={{ ...typography.body, color: colors.ink2 }}>
            Each tier&apos;s data-at-rest is encrypted with a per-tier AES-256-GCM key stored in
            the ESP32&apos;s eFuse-protected key block. Deleting the tier key renders all data
            unrecoverable without a full flash wipe. Cloud backups use per-user envelope encryption —
            deleting the user&apos;s KEK shreds all cloud copies.
          </div>
        </div>
      </div>

      {/* Compliance Matrix */}
      <H3 style={{ marginBottom: spacing.sm }}>Compliance Matrix</H3>
      <div style={{ marginBottom: spacing.md }}>
        {[
          { concern: "Audio retention", policy: "Process and discard — never persisted in cloud", tone: "help" as const },
          { concern: "Speaker voiceprints", policy: "Ephemeral only, separate biometric consent", tone: "amber" as const },
          { concern: "Tier 4 themes", policy: "2-year rolling window, crypto-shredded", tone: "help" as const },
          { concern: "WiFi credentials", policy: "NVS encrypted (AES-XTS via eFuse)", tone: "help" as const },
          { concern: "Data export", policy: "GDPR Art. 20 — JSON + PDF, 48hr link", tone: "help" as const },
          { concern: "Bystander consent", policy: "Hardwired LED + optional audio chirp", tone: "amber" as const },
          { concern: "Data residency", policy: "Regional clusters (EU-West, US-East)", tone: "help" as const },
        ].map((c) => (
          <div
            key={c.concern}
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              alignItems: "center",
              padding: `${spacing.xs}px 0`,
              borderBottom: borders.rule,
              fontFamily: fonts.mono,
              fontSize: 10,
            }}
          >
            <StatusBadge label={c.concern} tone={c.tone} />
            <span style={{ ...typography.stat, color: colors.ink2 }}>{c.policy}</span>
          </div>
        ))}
      </div>

      {/* Bystander Notification */}
      <H3 style={{ marginBottom: spacing.md }}>Bystander Notification</H3>
      <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden" }}>
        {[
          { label: "Recording LED", status: "Hardwired", desc: "Wired in series with INMP441 VCC — physically impossible for mic to be on without LED illuminating. No firmware control.", tone: "harm" as const },
          { label: "Amber LED Pulse", status: "Active", desc: "2Hz blink whenever mic is active and audio is being transmitted to cloud. Driven by WiFi streamer task.", tone: "amber" as const },
          { label: "Audio Chirp", status: "Jurisdictional", desc: "Every 30s — firmware-enforced in two-party consent jurisdictions. Disabled elsewhere. Uses piezo buzzer (planned for PCB v2).", tone: "neutral" as const },
        ].map((n, i, arr) => (
          <div key={n.label} style={{ display: "flex", alignItems: "flex-start", gap: spacing.sm, padding: `${spacing.sm}px ${spacing.md}px`, borderBottom: i < arr.length - 1 ? `1px solid ${colors.rule}` : "none" }}>
            <StatusBadge label={n.status} tone={n.tone} filled style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ ...typography.stat, fontWeight: weights.medium, color: colors.ink }}>{n.label}</div>
              <div style={{ ...typography.body, color: colors.ink3, marginTop: 2 }}>{n.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED CSS — injected once for pulse/flow animations
   ═══════════════════════════════════════════════════════════════════════════ */

function AnimatedStyles() {
  return (
    <style>{`
      @keyframes archFlowDash {
        to { stroke-dashoffset: -20; }
      }
      @keyframes archPulseNode {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      @keyframes archGlow {
        0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
        50% { filter: drop-shadow(0 0 8px currentColor); }
      }
      @keyframes archFadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .arch-fadein {
        animation: archFadeIn 0.5s ease both;
      }
      .arch-fadein-1 { animation-delay: 0.1s; }
      .arch-fadein-2 { animation-delay: 0.2s; }
      .arch-fadein-3 { animation-delay: 0.3s; }
      .arch-fadein-4 { animation-delay: 0.4s; }
      .arch-fadein-5 { animation-delay: 0.5s; }
    `}</style>
  );
}

/* SVG Hero Diagram removed — replaced by PipelineFlow (React Flow) in pipeline-flow.tsx */
/* SvgNode, SvgFlow, HeroArchitectureDiagram deleted — see git history for original */


/* ─── Node detail popup (portal to body) ─── */

function NodePopup({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const info = NODE_INFO[nodeId];
  if (!info) return null;

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(26,22,18,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: colors.bg, borderRadius: radius.lg, border: `1px solid ${colors.ruleStrong}`, maxWidth: 560, width: "100%", maxHeight: "80vh", overflow: "auto", padding: "24px 28px 28px", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md }}>
          <div>
            <Eyebrow style={{ color: colors.ink3, marginBottom: spacing.xxs }}>Node Detail</Eyebrow>
            <H3 style={{ marginBottom: 0 }}>{info.title}</H3>
          </div>
          <button onClick={onClose} style={{ all: "unset", cursor: "pointer", ...typography.h3, color: colors.ink3, lineHeight: 1 }}>×</button>
        </div>
        <Body style={{ marginBottom: spacing.md, lineHeight: 1.7 }}>{info.explanation}</Body>
        <div style={{ marginBottom: spacing.md }}>
          <Label color={colors.help}>Inputs</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xxs }}>
            {info.inputs.map((inp, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: spacing.xs, ...typography.body, color: colors.ink2 }}>
                <span style={{ ...typography.stat, color: colors.help, flexShrink: 0, marginTop: 2 }}>→</span>{inp}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: spacing.md }}>
          <Label color={colors.ink}>What happens inside</Label>
          <div style={{ ...typography.body, color: colors.ink2, lineHeight: 1.7, padding: `${spacing.sm}px`, background: colors.inkFaint, borderRadius: radius.sm, border: `1px solid ${colors.rule}` }}>{info.processing}</div>
        </div>
        <div>
          <Label color={colors.harm}>Outputs</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.xxs }}>
            {info.outputs.map((out, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: spacing.xs, ...typography.body, color: colors.ink2 }}>
                <span style={{ ...typography.stat, color: colors.harm, flexShrink: 0, marginTop: 2 }}>←</span>{out}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    (document.fullscreenElement as HTMLElement) ?? document.body,
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 6: FULL SYSTEM DATA FLOW
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Data-flow pipeline definitions ───────────────────────────────────── */

interface SampleKV {
  readonly k: string;
  readonly v: string;
}

interface SampleRow {
  readonly field: string;
  readonly type: string;
  readonly example: string | readonly SampleKV[];
  readonly group?: string;
}

interface SamplePayload {
  readonly scenario: string;
  readonly rows: readonly SampleRow[];
}

interface PipelineStep {
  label: string;
  detail: string;
  color: string;
  timing?: string;
  expanded?: ReactNode;
  specs?: readonly { k: string; v: string }[];
  flowLabel?: string;
  sampleData?: SamplePayload;
}

interface PipelineDef {
  id: string;
  title: string;
  description: string;
  accent: string;
  steps: readonly PipelineStep[];
}

const PIPELINES: readonly PipelineDef[] = [
  {
    id: "capture",
    title: "Passive Capture",
    description: "Always-on ambient pipeline — mic to compressed tier in under 5 s.",
    accent: zone.audio,
    steps: [
      { label: "Mic", detail: "INMP441 I2S MEMS", color: zone.audio, flowLabel: "I2S DMA", expanded: <>Always-on MEMS microphone sampling at <DV value="16 kHz" defense="16 kHz is the native input rate for Deepgram, wav2vec2, and YAMNet — no resampling needed. It captures the full human voice range (up to 8 kHz per Nyquist) while using half the bandwidth and memory of 44.1 kHz. Going lower (8 kHz narrowband) would lose tonal nuance that wav2vec2-emotion needs for valence/arousal detection." vocab={[
  { term: "Nyquist", definition: "A signal must be sampled at twice its highest frequency to be perfectly reconstructed. Human speech tops out at ~8 kHz, so 16 kHz sampling captures everything." },
  { term: "Resampling", definition: "Converting audio from one sample rate to another. Introduces artifacts and costs CPU cycles — avoided by matching the mic's native rate to what the models expect." },
  { term: "Narrowband", definition: "Audio sampled at 8 kHz (telephone quality). Captures frequencies up to 4 kHz — sufficient for speech intelligibility but loses the upper harmonics that carry emotional tone." },
  { term: "wav2vec2", definition: "A self-supervised speech representation model by Meta. Learns features directly from raw audio waveforms, enabling downstream tasks like emotion recognition without hand-crafted features." },
]} />. <DV value="I2S DMA" defense="Direct Memory Access bypasses the CPU entirely — the I2S peripheral writes PCM frames straight to PSRAM. This frees both cores for VAD and encoding, and avoids buffer underruns during high-priority task preemption." vocab={[
  { term: "DMA", definition: "Direct Memory Access — a hardware feature that lets peripherals read/write memory without involving the CPU, freeing processor cycles for other tasks." },
  { term: "I2S peripheral", definition: "Inter-IC Sound — a serial bus protocol designed for connecting digital audio devices. The ESP32-S3 has dedicated I2S hardware that handles audio data transfer independently." },
  { term: "PSRAM", definition: "Pseudo-Static RAM — external memory (up to 16MB on ESP32-S3) that's slower than internal SRAM but far larger. Used for buffers that don't fit in the 512KB of on-chip SRAM." },
  { term: "preemption", definition: "When a higher-priority task interrupts a lower-priority one mid-execution. DMA avoids this problem because the transfer happens in hardware, not in a task that can be preempted." },
]} /> transfers PCM frames directly into a <DV value="64KB PSRAM ring buffer" defense="64KB at 16 kHz 16-bit mono holds ~2 seconds of audio — exactly the pre-roll needed for VAD onset capture. PSRAM (not SRAM) because the ESP32-S3 only has 512KB of internal SRAM, and the ring buffer must coexist with FreeRTOS stacks, WiFi buffers, and Opus encoder state." vocab={[
  { term: "SRAM", definition: "Static RAM — the ESP32-S3's fast on-chip memory (512KB). Limited and shared between FreeRTOS task stacks, WiFi drivers, and application state." },
  { term: "FreeRTOS", definition: "A real-time operating system for microcontrollers. Manages task scheduling, memory allocation, and inter-task communication on the ESP32." },
  { term: "Opus encoder", definition: "An open audio codec optimized for speech. Its encoder state consumes ~16KB of memory that must coexist with the ring buffer in the same address space." },
]} /> without CPU involvement. Hardwired recording LED illuminates whenever VCC is applied.</>, specs: [{ k: "Sample rate", v: "16 kHz" }, { k: "Format", v: "16-bit signed PCM" }, { k: "Buffer", v: "64KB PSRAM ring" }], sampleData: {
        scenario: "Tuesday 2:15 PM — three people are in a meeting room discussing Q3 deadlines. The INMP441 mic captures everything: voices, keyboard typing, HVAC hum, chair movement. The raw PCM stream flows into the ring buffer at 32KB/s.",
        rows: [
          { field: "Raw signal", type: "int16[]", group: "Audio capture", example: [{ k: "Rate", v: "16,000 samples/sec" }, { k: "Bit depth", v: "16-bit signed" }, { k: "Channels", v: "1 (mono)" }, { k: "Bandwidth", v: "32 KB/s continuous" }] },
          { field: "Ring buffer state", type: "CircularBuffer", group: "Audio capture", example: [{ k: "Size", v: "64 KB" }, { k: "Capacity", v: "~2 seconds of audio" }, { k: "Write head", v: "advancing at 32 KB/s" }, { k: "Pre-roll", v: "500 ms behind write head" }] },
          { field: "What's captured", type: "note", group: "Content at this moment", example: [{ k: "Voice", v: "Speaker B: \"The client demo is Thursday\"" }, { k: "Voice", v: "Speaker A: \"But the API isn't tested\"" }, { k: "Ambient", v: "keyboard typing (distant)" }, { k: "Ambient", v: "HVAC hum (constant)" }, { k: "Ambient", v: "chair creak (Speaker B shifting)" }] },
          { field: "Recording LED", type: "hardware", group: "Privacy", example: [{ k: "State", v: "illuminated (always on with mic)" }, { k: "Control", v: "hardwired — not software-controllable" }, { k: "Guarantee", v: "physically impossible to record without LED lit" }] },
        ],
      } },
      { label: "VAD", detail: "ESP-SR WakeNet, Core 0", color: zone.device, flowLabel: "speech flag", expanded: <>Voice Activity Detection runs on <DV value="Core 0" defense="Core 0 is dedicated to sensors and I/O — VAD, IMU polling, and audio capture. Core 1 handles encoding, networking, and storage. This hard partitioning eliminates cross-core contention and ensures VAD latency stays under 50ms even during WiFi operations." vocab={[
  { term: "contention", definition: "When multiple tasks compete for the same resource (CPU core, bus, memory). Causes unpredictable delays — eliminated here by pinning task categories to separate cores." },
  { term: "VAD", definition: "Voice Activity Detection — a lightweight model that distinguishes speech from silence. It gates the entire downstream pipeline: no speech detected means no WiFi, no encoding, no cloud processing." },
]} /> at <DV value="priority 5" defense="Priority 5 (out of configMAX_PRIORITIES=7) ensures VAD preempts IMU polling (priority 3) but yields to audio_capture (priority 6). This guarantees speech onset detection within one I2S DMA callback period." vocab={[
  { term: "configMAX_PRIORITIES", definition: "A FreeRTOS compile-time constant that sets the number of priority levels available. Set to 7 here, meaning tasks can be assigned priorities 0 (lowest) through 6 (highest)." },
  { term: "preempts", definition: "When a higher-priority task forcibly takes CPU time from a lower-priority one. Priority 5 VAD preempts priority 3 IMU polling, ensuring speech is never missed due to sensor reads." },
  { term: "DMA callback", definition: "A function the DMA hardware invokes each time a buffer transfer completes. The audio capture task runs at priority 6 so its callback is never delayed by VAD processing." },
]} />. When speech is detected, it sets a flag that wakes the WiFi radio. During silence, WiFi stays off — this single gate controls <DV value="40-50% of total power" defense="WiFi radio draws 80-120mA when active vs ~0mA when off. With baseline device consumption at ~80mA (ESP32 + mic + VAD), WiFi is the single largest variable consumer. VAD-gating means battery life is directly proportional to how much the user talks." vocab={[
  { term: "mA", definition: "Milliamps — a unit of electrical current. The WiFi radio alone draws 80-120mA, roughly doubling total device power consumption when active." },
  { term: "VAD-gating", definition: "Using Voice Activity Detection as a power gate — WiFi only turns on when speech is detected. This single optimization is the biggest lever on battery life." },
]} />.</>, specs: [{ k: "Engine", v: "ESP-SR WakeNet" }, { k: "Core", v: "0 (priority 5)" }, { k: "Latency", v: "<50ms onset" }], sampleData: {
        scenario: "Speaker B starts talking after a 4-second pause. The energy pre-filter catches the onset in <0.5ms, and the neural model confirms speech within ~20ms. The VAD sets the speech-active flag, waking the WiFi radio and enabling the Opus encoder.",
        rows: [
          { field: "Input", type: "PCM frames", group: "Detection", example: [{ k: "Source", v: "PSRAM ring buffer (non-destructive read)" }, { k: "Frame", v: "30ms chunks for classification" }] },
          { field: "Energy pre-filter", type: "gate", group: "Detection", example: [{ k: "Latency", v: "<0.5ms" }, { k: "Result", v: "energy above silence threshold — pass to neural model" }, { k: "Purpose", v: "reject obvious silence before expensive inference" }] },
          { field: "Neural inference", type: "ESP-SR", group: "Detection", example: [{ k: "Model", v: "ESP-SR WakeNet" }, { k: "Latency", v: "~20ms for this frame" }, { k: "Result", v: "speech detected — confidence 0.94" }] },
          { field: "Outputs", type: "flags", group: "Actions triggered", example: [{ k: "Speech flag", v: "set → Opus encoder begins consuming from ring buffer" }, { k: "WiFi signal", v: "power_mgr wakes WiFi radio (~300ms association)" }, { k: "Pre-roll", v: "encoder starts 500ms behind write head — captures word onset" }] },
          { field: "Power impact", type: "mA", group: "Actions triggered", example: [{ k: "Before speech", v: "~80 mA (ESP32 + mic + VAD)" }, { k: "After speech", v: "~160-180 mA (+ WiFi + Opus encoding)" }, { k: "Hold-off", v: "WiFi stays on 2s after last speech" }] },
        ],
      } },
      { label: "Opus Encode", detail: "16 kbps CBR", color: zone.audio, flowLabel: "encoded frames", expanded: <>Real-time Opus encoding at <DV value="16 kbps CBR" defense="16 kbps constant bitrate is the sweet spot for speech on constrained bandwidth. Opus at this rate achieves near-transparent speech quality (POLQA >4.0). CBR over VBR because it makes buffer management predictable — each 20ms frame is exactly ~40 bytes, simplifying ring buffer bookkeeping." vocab={[
  { term: "CBR", definition: "Constant Bit Rate — every frame uses the same number of bits regardless of audio complexity. Simplifies buffer math because frame sizes are predictable." },
  { term: "VBR", definition: "Variable Bit Rate — allocates more bits to complex audio passages and fewer to silence. Better compression overall, but unpredictable frame sizes complicate ring buffer management on a microcontroller." },
  { term: "POLQA", definition: "Perceptual Objective Listening Quality Analysis — an ITU standard (P.863) for measuring speech quality on a 1-5 scale. Scores above 4.0 are considered near-transparent (indistinguishable from uncompressed)." },
]} />. Frames are <DV value="20ms" defense="20ms is Opus's default frame size and the best trade-off between latency and compression efficiency. Shorter frames (2.5-10ms) waste bits on headers; longer frames (40-60ms) add latency without meaningful quality gain at 16 kbps." vocab={[
  { term: "frame size", definition: "The duration of audio encoded into a single compressed packet. Opus supports 2.5ms to 60ms frames — 20ms is the default sweet spot between overhead and latency." },
  { term: "compression efficiency", definition: "How much audio quality you get per bit. Longer frames amortize header overhead across more audio data, but 20ms already achieves near-optimal efficiency at 16 kbps." },
]} /> each, producing ~40 bytes per frame. Encoded frames replace raw PCM in the ring buffer to maximize available recording time before upload.</>, specs: [{ k: "Bitrate", v: "16 kbps CBR" }, { k: "Frame", v: "20ms / ~40 bytes" }], sampleData: {
        scenario: "VAD has flagged speech. The Opus encoder on Core 1 begins consuming PCM from the ring buffer, starting 500ms before the speech onset to capture the beginning of the utterance. Each 20ms of audio becomes a ~40-byte Opus frame.",
        rows: [
          { field: "Input", type: "PCM", group: "Encoding", example: [{ k: "Source", v: "ring buffer, starting at write_head − 500ms" }, { k: "Rate", v: "32 KB/s raw PCM" }, { k: "Core", v: "1 (priority 5)" }] },
          { field: "Output", type: "Opus frames", group: "Encoding", example: [{ k: "Frame size", v: "20ms of audio" }, { k: "Frame bytes", v: "~40 bytes (CBR)" }, { k: "Rate", v: "50 frames/sec → ~2 KB/s" }, { k: "Mode", v: "SILK (speech-optimized)" }] },
          { field: "Compression", type: "ratio", group: "Encoding", example: [{ k: "Raw", v: "256 kbps (32 KB/s)" }, { k: "Encoded", v: "16 kbps (2 KB/s)" }, { k: "Ratio", v: "16× reduction" }, { k: "Quality", v: "POLQA >4.0 (near-transparent)" }] },
          { field: "This segment", type: "note", group: "What's being encoded", example: [{ k: "Content", v: "Speaker B saying \"The client demo is Thursday, we can't move it\"" }, { k: "Duration", v: "~3.2 seconds of speech" }, { k: "Frames", v: "~160 Opus frames" }, { k: "Total", v: "~6.4 KB encoded" }] },
        ],
      } },
      { label: "WebSocket", detail: "TLS 1.3 tunnel to GCP", color: zone.cloud, flowLabel: "stream to cloud", expanded: <><DV value="Single persistent WebSocket" defense="One connection per device avoids the overhead of repeated TLS handshakes (each ~200ms + 2KB memory). WebSocket's bidirectional framing lets the server push Tier 1 payloads back on the same connection without polling. HTTP/2 was considered but adds head-of-line blocking complexity on the ESP32's single-stream use case." vocab={[
  { term: "TLS handshakes", definition: "The cryptographic negotiation that establishes a secure connection. Each handshake costs ~200ms and 2KB of memory — reusing one connection avoids repeating this for every message." },
  { term: "head-of-line blocking", definition: "When a single slow or lost packet stalls all other data on the same connection. HTTP/2 multiplexes streams over one TCP connection, making it vulnerable to this. WebSocket avoids it by using a single logical stream." },
]} /> connection per device through Kong API Gateway. <DV value="TLS 1.3" defense="TLS 1.3 eliminates the 1-RTT overhead of TLS 1.2 (0-RTT resumption on reconnect), reduces cipher negotiation to only secure options, and is required for mTLS certificate pinning. TLS 1.2 fallback is explicitly disabled." vocab={[
  { term: "0-RTT", definition: "Zero Round-Trip Time resumption — TLS 1.3 can resume a previous session and send encrypted data in the very first packet, eliminating the extra round-trip TLS 1.2 requires." },
  { term: "mTLS", definition: "Mutual TLS — both client and server present certificates to authenticate each other. Ensures only authorized Madie devices can connect to the cloud backend." },
  { term: "cipher negotiation", definition: "The process where client and server agree on encryption algorithms. TLS 1.3 removed all weak ciphers, so negotiation is faster and always results in a secure choice." },
]} /> with certificate pinning. Connection reuses <DV value="stored BSSID" defense="Storing the WiFi access point's BSSID in NVS skips the 802.11 scanning phase on reconnect, reducing WiFi association from ~2s to ~300ms. Critical for VAD-gated power cycling where WiFi connects/disconnects many times per day." vocab={[
  { term: "NVS", definition: "Non-Volatile Storage — a key-value store in flash memory that persists across reboots. Used here to remember the last WiFi access point so reconnection is instant." },
  { term: "802.11 scanning", definition: "The WiFi discovery phase where the radio listens on each channel for available networks. Takes ~2 seconds — skipped entirely when the BSSID (access point MAC address) is already known." },
]} /> for fast association (~300ms). Auto-reconnect with exponential backoff.</>, specs: [{ k: "Protocol", v: "WSS (TLS 1.3)" }, { k: "Association", v: "~300ms (stored BSSID)" }], sampleData: {
        scenario: "VAD detected speech 300ms ago. WiFi has associated using the stored BSSID. The WebSocket connection resumes its TLS 1.3 session (0-RTT). Opus frames begin streaming to Kong API Gateway.",
        rows: [
          { field: "Connection", type: "WebSocket", group: "Transport", example: [{ k: "Endpoint", v: "wss://api.madie.io/stream" }, { k: "TLS", v: "1.3 with 0-RTT resumption" }, { k: "Auth", v: "mTLS — device X.509 cert from NVS" }, { k: "Gateway", v: "Kong → NATS JetStream" }] },
          { field: "Stream", type: "Opus frames", group: "Transport", example: [{ k: "Direction", v: "device → cloud (upstream)" }, { k: "Rate", v: "~50 frames/sec (~2 KB/s)" }, { k: "Subject", v: "audio.<device_id>" }, { k: "Tagging", v: "frames tagged 'ambient' (not 'query')" }] },
          { field: "Return path", type: "Tier 1 payload", group: "Transport", example: [{ k: "Direction", v: "cloud → device (downstream)" }, { k: "Content", v: "Tier 1 payload from Aggregator" }, { k: "Same connection", v: "bidirectional — no separate return channel" }] },
          { field: "Buffering", type: "note", group: "Edge cases", example: [{ k: "WiFi not ready", v: "first ~15 frames buffered in PSRAM during association" }, { k: "Disconnect <5 min", v: "buffer in PSRAM (2MB ≈ 16 min)" }, { k: "Disconnect >5 min", v: "spill to flash (4MB ≈ 33 min)" }, { k: "Reconnect", v: "drain buffer at 50% bandwidth" }] },
        ],
      } },
      { label: "NATS Fan-out", detail: "JetStream pub/sub", color: zone.cloud, flowLabel: "3 consumers", expanded: <>Audio stream is published to a <DV value="NATS JetStream" defense="JetStream over Kafka because: 10x lower memory footprint (critical for cost at 100-device scale), built-in consumer replay without offset management, and native Go client matches the cloud services stack. At our message rate (~50 msgs/sec per device), Kafka's partitioning overhead is unnecessary." vocab={[
  { term: "Kafka", definition: "Apache Kafka — a distributed event streaming platform. Powerful but memory-heavy and operationally complex. Overkill at Madie's 100-device scale where NATS provides the same guarantees with far less overhead." },
  { term: "partitioning", definition: "Splitting a message stream across multiple brokers for parallelism. Kafka requires it for scaling; NATS JetStream handles Madie's throughput (~50 msgs/sec/device) on a single stream." },
]} /> subject. <DV value="Three durable consumers" defense="Three independent consumers (STT, Tonal, Environment) rather than a single sequential pipeline because: the three models have different latency profiles (STT ~800ms, Tonal ~100ms, Env ~50ms), and parallel execution reduces total wall-clock time from ~950ms to ~800ms (bottlenecked on STT)." vocab={[
  { term: "latency profiles", definition: "The characteristic processing time of each model. STT is slowest (~800ms) because it runs a large language model; tonal (~100ms) and environment (~50ms) are lightweight classifiers." },
  { term: "wall-clock time", definition: "The actual elapsed time from start to finish. Running three models in parallel means total time equals the slowest one (~800ms STT) rather than the sum of all three (~950ms)." },
]} /> subscribe independently — each receives every message. JetStream provides at-least-once delivery with <DV value="90-second retention" defense="90 seconds covers the worst-case consumer restart scenario: container pull (~30s) + model load (~20s) + replay buffer. Shorter retention risks data loss during rolling deployments; longer retention wastes memory on data that's already been aggregated." vocab={[
  { term: "container pull", definition: "Downloading a Docker container image from a registry when a new pod starts. Takes ~30 seconds and is the largest component of consumer restart time." },
  { term: "rolling deployments", definition: "Updating services by replacing pods one at a time rather than all at once. Ensures zero downtime but means individual consumers restart during the process — retention must cover this gap." },
]} /> for replay on consumer restart.</>, specs: [{ k: "Consumers", v: "3 (STT, Tonal, Env)" }, { k: "Retention", v: "90s replay window" }], sampleData: {
        scenario: "Opus frames arrive at NATS JetStream from Kong. Each frame is published to the audio.<device_id> subject. Three independent consumer groups subscribe — each receives every frame for parallel processing.",
        rows: [
          { field: "Published message", type: "Opus frame", group: "Fan-out", example: [{ k: "Subject", v: "audio.device_a1b2c3" }, { k: "Payload", v: "~40 bytes Opus frame" }, { k: "Rate", v: "~50 msgs/sec during speech" }, { k: "Retention", v: "90s TTL then evicted" }] },
          { field: "Consumer: stt", type: "Deepgram", group: "Fan-out", example: [{ k: "Receives", v: "same Opus frame" }, { k: "Latency", v: "~800ms to produce transcript" }, { k: "Output", v: "timestamped text + speaker diarization" }] },
          { field: "Consumer: tonal", type: "wav2vec2", group: "Fan-out", example: [{ k: "Receives", v: "same Opus frame" }, { k: "Latency", v: "~100ms" }, { k: "Output", v: "valence, arousal, stress scores" }] },
          { field: "Consumer: env", type: "YAMNet", group: "Fan-out", example: [{ k: "Receives", v: "same Opus frame" }, { k: "Latency", v: "~50ms" }, { k: "Output", v: "scene: office, events: typing, conversation" }] },
          { field: "Delivery guarantee", type: "note", group: "Reliability", example: [{ k: "Mode", v: "at-least-once per consumer group" }, { k: "Consumer lag", v: "if >90s behind, frames are dropped" }, { k: "Node failure", v: "remaining cluster nodes continue (3-node)" }] },
        ],
      } },
      { label: "Parallel Analysis", detail: "3 audio consumers + 3 STT derivatives", color: zone.cloud, timing: "GPU", flowLabel: "merge results", expanded: <>Three consumers process audio simultaneously on <DV value="T4 GPU nodes" defense="T4 over A100 because wav2vec2 and YAMNet inference fits in 16GB VRAM with room to batch. T4 spot instances on GKE cost ~$0.11/hr vs $1.10/hr for A100. At 100 devices, GPU cost is the largest line item — T4 keeps it under $2/device/mo for inference." vocab={[
  { term: "VRAM", definition: "Video RAM — GPU-dedicated memory. The T4 has 16GB, enough to hold wav2vec2 and YAMNet models simultaneously with room for batching multiple audio streams." },
  { term: "spot instances", definition: "Cloud VMs available at steep discounts (~70% off) because they use spare capacity. Can be preempted with 30s notice — acceptable here because JetStream replay covers the gap." },
  { term: "GKE", definition: "Google Kubernetes Engine — Google Cloud's managed Kubernetes service. Handles GPU node auto-scaling and spot instance lifecycle automatically." },
]} />: <DV value="Deepgram" defense="Deepgram Nova-2 over Whisper because: streaming support (Whisper is batch-only without complex chunking), built-in speaker diarization, 2x lower latency at equivalent WER, and managed API eliminates GPU allocation for STT. Cost: ~$0.0043/min vs self-hosted Whisper at ~$0.002/min but with ops overhead." vocab={[
  { term: "WER", definition: "Word Error Rate — the standard metric for transcription accuracy, measuring the percentage of words incorrectly transcribed. Lower is better; Nova-2 achieves ~8% on conversational speech." },
  { term: "diarization", definition: "Identifying who spoke when in a multi-speaker audio stream. Deepgram provides this natively, which Madie uses to build speaker interaction maps in Tier 1 payloads." },
  { term: "Whisper", definition: "OpenAI's open-source speech recognition model. Highly accurate but batch-only — it processes complete audio files rather than streaming, adding latency that's unacceptable for Madie's real-time pipeline." },
]} /> for speech-to-text (speaker ID, keywords, topics), <DV value="wav2vec2-emotion" defense="wav2vec2 fine-tuned on emotion recognition operates directly on raw audio waveforms — no feature engineering needed. It captures tonal cues (pitch contour, speaking rate, energy) that text-based sentiment analysis misses. Self-hosted because no managed API exists for continuous tonal analysis." vocab={[
  { term: "fine-tuned", definition: "A pre-trained model retrained on a specific dataset (here, emotion-labeled speech). Adapts wav2vec2's general audio understanding to recognize valence, arousal, and stress in voice." },
  { term: "pitch contour", definition: "The trajectory of vocal pitch over time. Rising pitch can signal questions or excitement; falling pitch signals statements or certainty. A key feature for emotion detection that text transcripts lose entirely." },
  { term: "sentiment analysis", definition: "Detecting emotional tone from text. Misses vocal cues like trembling, speaking rate, and volume — which is why Madie uses audio-level tonal analysis in addition to text processing." },
]} /> for tonal analysis (valence, arousal, stress), and <DV value="YAMNet" defense="YAMNet is a lightweight AudioSet classifier (~3MB model) that runs on CPU — no GPU needed. It classifies 521 sound events into coarse scene categories. We map these to 12 environment classes (office, outdoors, transit, etc.) for the social context packet." vocab={[
  { term: "AudioSet", definition: "Google's dataset of over 2 million labeled 10-second audio clips spanning 632 sound classes. YAMNet was trained on this, giving it broad sound recognition out of the box." },
  { term: "classifier", definition: "A model that assigns input data to predefined categories. YAMNet classifies audio segments into sound event types (speech, music, traffic, etc.) which Madie maps to environment contexts." },
]} /> for environmental classification. Once Deepgram produces transcripts, three additional processors run sequentially off that output: <DV value="Resemblyzer" defense="Resemblyzer generates d-vector speaker embeddings — 256-dimensional fingerprints that cluster by voice identity without requiring enrollment. Labels are anonymous (Speaker A, B, C), never names. Runs on CPU, ~300ms per segment. Gated by biometric consent — if consent is not granted, all segments are labeled unknown_speaker." vocab={[
  { term: "d-vector", definition: "A fixed-length numerical fingerprint of a voice, extracted by a neural network. Two audio clips from the same speaker produce similar d-vectors; different speakers produce dissimilar ones." },
  { term: "speaker embedding", definition: "A compact vector representation of a speaker's voice characteristics. Used to cluster speech segments by speaker without knowing who the speaker is." },
  { term: "biometric consent", definition: "GDPR Article 9 requires explicit opt-in before processing biometric data like voiceprints. If consent is revoked, Resemblyzer is disabled entirely and in-memory voiceprints are discarded." },
]} /> for anonymous speaker identification, <DV value="spaCy NER" defense="spaCy's en_core_web_trf (transformer-based) extracts named entities — people, organizations, locations, dates — from the transcript. These keywords are the building blocks for topic classification. Runs on CPU (~200ms per segment), ~500MB model loaded at pod startup." vocab={[
  { term: "NER", definition: "Named Entity Recognition — identifying and classifying proper nouns and key phrases in text. Extracts structured facts (who, where, when) from unstructured conversation." },
  { term: "en_core_web_trf", definition: "spaCy's largest English model, using a transformer backbone for highest accuracy. Heavier than the small/medium models but critical for reliable entity extraction in noisy conversational transcripts." },
]} /> for keyword and entity extraction, and <DV value="BART-MNLI" defense="Zero-shot classification via natural language inference — no training data needed for new topic categories. Maps extracted keywords to ~20 predefined topics (work, health, relationship, finances, etc.) with confidence scores. Runs on T4 GPU, ~300ms per keyword batch." vocab={[
  { term: "zero-shot", definition: "Classification without task-specific training data. The model reasons about whether a keyword belongs to a topic category using natural language understanding, not pattern matching." },
  { term: "natural language inference", definition: "Determining whether a hypothesis ('this is about work') is entailed by a premise ('meeting with the VP about Q3 targets'). BART-MNLI was trained on this task and repurposes it for classification." },
]} /> for topic classification. So while 3 consumers read from NATS in parallel, 6 total analysis streams feed the Aggregator.</>, specs: [{ k: "STT", v: "Deepgram" }, { k: "Tonal", v: "wav2vec2-emotion" }, { k: "Env", v: "YAMNet" }, { k: "STT →", v: "Speaker ID, Keywords, Topics" }], sampleData: {
        scenario: "A 5-second audio segment from the meeting arrives. Three NATS consumers process it in parallel. Once Deepgram produces the transcript (~800ms), three more processors run sequentially off that output. All 6 results feed the Aggregator.",
        rows: [
          { field: "Deepgram STT", type: "transcript", group: "Parallel — Audio Consumers (~800ms)", example: [{ k: "Text", v: "\"We can't — the client demo is locked in\"" }, { k: "Speaker", v: "B (via diarization)" }, { k: "Timestamps", v: "2:15:04.0 → 2:15:06.8" }, { k: "Confidence", v: "0.94" }] },
          { field: "wav2vec2-emotion", type: "tonal scores", group: "Parallel — Audio Consumers (~800ms)", example: [{ k: "Valence", v: "−0.4 (negative)" }, { k: "Arousal", v: "0.75 (high — assertive tone)" }, { k: "Stress", v: "0.3 (Speaker B is confident, not stressed)" }] },
          { field: "YAMNet", type: "scene + events", group: "Parallel — Audio Consumers (~800ms)", example: [{ k: "Scene", v: "office (0.92)" }, { k: "Events", v: "speech (primary), typing (background)" }, { k: "Crowd", v: "small group (3 people)" }, { k: "Noise floor", v: "42 dB" }] },

          { field: "Resemblyzer", type: "speaker labels", group: "Sequential — STT Derivatives (~800ms after STT)", example: [{ k: "Segment", v: "labeled Speaker B" }, { k: "Method", v: "d-vector clustering (256-dim)" }, { k: "Consent", v: "biometric consent granted — processing enabled" }, { k: "Latency", v: "~300ms" }] },
          { field: "spaCy NER", type: "keywords", group: "Sequential — STT Derivatives (~800ms after STT)", example: [{ k: "Event", v: "client demo" }, { k: "Temporal", v: "locked in (implies fixed)" }, { k: "Latency", v: "~200ms" }] },
          { field: "BART-MNLI", type: "topics", group: "Sequential — STT Derivatives (~800ms after STT)", example: [{ k: "work", v: "94% confidence" }, { k: "finances", v: "28% (secondary)" }, { k: "Method", v: "zero-shot classification" }, { k: "Latency", v: "~300ms" }] },

          { field: "Total wall-clock", type: "timing", group: "Pipeline timing", example: [{ k: "Parallel phase", v: "~800ms (bottlenecked on Deepgram)" }, { k: "Sequential phase", v: "~800ms (Speaker ID → Keywords → Topics)" }, { k: "Total", v: "~1.6s from audio frame to all 6 results" }, { k: "Fits within", v: "5-second aggregation window" }] },
        ],
      } },
      { label: "Aggregator", detail: "5-second sliding window merge", color: zone.cloud, flowLabel: "WS to device", expanded: <>Merges results from <DV value="6 analysis streams" defense="Three NATS consumers (Deepgram, wav2vec2, YAMNet) run in parallel on raw audio. Three more processors (Resemblyzer, spaCy NER, BART-MNLI) run sequentially off Deepgram's transcript output. The Aggregator waits for all 6 within its window — the sequential chain adds ~800ms on top of STT latency, but fits within the 5s window." vocab={[
  { term: "parallel vs sequential", definition: "The three audio consumers start simultaneously when NATS publishes a frame. The three STT derivatives must wait for Deepgram's transcript first, then run in sequence: Speaker ID → Keywords → Topics. Total sequential chain: ~800ms after STT completes." },
  { term: "partial payload", definition: "If any analyzer misses the window, the Aggregator ships what it has. A bitmask (stt_ok, tonal_ok, env_ok, spk_ok, kw_ok, topic_ok) tells the device which signals are present." },
]} /> within a <DV value="5-second sliding window" defense="5 seconds balances freshness against completeness. STT results arrive with ~800ms latency; the sequential derivatives (Speaker ID, Keywords, Topics) add another ~800ms. Tonal and environment results arrive in ~100ms. A 5s window ensures all 6 streams for a given audio segment have arrived before aggregation. Shorter windows (1-2s) risk incomplete merges; longer windows (10s+) add unnecessary latency to Tier 1 writes." vocab={[
  { term: "aggregation", definition: "Combining results from all 6 analysis streams — transcripts, speaker labels, keywords, topics, emotional scores, and environment tags — into a single coherent payload." },
  { term: "incomplete merges", definition: "When the aggregation window closes before all streams have reported for a given audio segment. Results in Tier 1 payloads missing data for that time slice, flagged via bitmask." },
]} />. Aligns timestamps, resolves conflicts (e.g. overlapping speaker segments), and produces a single structured <DV value="Tier 1 payload" defense="A structured JSON document containing all analysis results keyed by timestamp. Schema-versioned for backwards compatibility. Typical payload size: 2-4KB per 5-second window, or ~2.5MB/hour of continuous speech." vocab={[
  { term: "schema-versioned", definition: "Each payload includes a version number so the device and cloud can evolve the data format independently. Older payloads are still parseable by newer code without migration." },
  { term: "JSON", definition: "JavaScript Object Notation — a lightweight text-based data format. Chosen over binary formats (Protobuf, MessagePack) for debuggability; at 2-4KB per payload the size overhead is negligible." },
]} />. Sends result back to device over the same WebSocket.</>, specs: [{ k: "Window", v: "5 seconds" }, { k: "Streams", v: "6 (3 parallel + 3 sequential)" }, { k: "Output", v: "Tier 1 payload" }], sampleData: {
        scenario: "The 5-second window for the 2:15:04–2:15:09 segment closes. The Aggregator has received all 6 streams. It aligns them by timestamp, resolves a minor speaker label overlap, and produces a single Tier 1 payload sent back to the device.",
        rows: [
          { field: "Stream 1: STT", type: "status", group: "Inputs received (bitmask: all OK)", example: [{ k: "stt_ok", v: "true" }, { k: "Content", v: "transcript + timestamps for 2 utterances" }] },
          { field: "Stream 2: Tonal", type: "status", group: "Inputs received (bitmask: all OK)", example: [{ k: "tonal_ok", v: "true" }, { k: "Content", v: "valence/arousal/stress per segment" }] },
          { field: "Stream 3: Environment", type: "status", group: "Inputs received (bitmask: all OK)", example: [{ k: "env_ok", v: "true" }, { k: "Content", v: "office scene, typing + speech events" }] },
          { field: "Stream 4: Speaker ID", type: "status", group: "Inputs received (bitmask: all OK)", example: [{ k: "spk_ok", v: "true" }, { k: "Content", v: "Speaker B label applied to segment" }] },
          { field: "Stream 5: Keywords", type: "status", group: "Inputs received (bitmask: all OK)", example: [{ k: "kw_ok", v: "true" }, { k: "Content", v: "client demo, locked in" }] },
          { field: "Stream 6: Topics", type: "status", group: "Inputs received (bitmask: all OK)", example: [{ k: "topic_ok", v: "true" }, { k: "Content", v: "work 94%, finances 28%" }] },

          { field: "Merged payload", type: "Tier 1", group: "Output", example: [{ k: "Size", v: "~2.8 KB for this 5-second window" }, { k: "Format", v: "JSON, schema-versioned" }, { k: "Delivery", v: "same WebSocket used for audio upload" }, { k: "Rate", v: "~2.5 MB/hour of continuous speech" }] },
          { field: "Conflict resolution", type: "note", group: "Output", example: [{ k: "Resolved", v: "overlapping speaker segments between STT and Resemblyzer" }, { k: "Method", v: "Resemblyzer label takes precedence over STT diarization" }] },
        ],
      } },
      { label: "Tier 1 Write", detail: "Structured signals to flash", color: zone.storage, expanded: <><DV value="StorageManager" defense="A single FreeRTOS task that serializes all flash I/O through a queue (depth 16). This eliminates race conditions by design — no mutexes, no priority inversion, no torn writes. The trade-off is throughput, but at ~2.5MB/hour write rate, the queue never backs up." vocab={[
  { term: "queue", definition: "A FreeRTOS message queue that buffers write requests. Other tasks post to the queue; StorageManager dequeues and writes sequentially. Depth 16 means up to 16 writes can be buffered before producers block." },
  { term: "mutexes", definition: "Mutual exclusion locks used to protect shared resources from concurrent access. StorageManager avoids them entirely by funneling all I/O through a single task — simpler and deadlock-free." },
  { term: "priority inversion", definition: "When a high-priority task waits on a mutex held by a low-priority task, effectively running at the lower priority. A classic RTOS hazard that StorageManager's queue-based design sidesteps completely." },
]} /> receives the Tier 1 payload via tier_write_queue and writes it to <DV value="LittleFS" defense="LittleFS over SPIFFS because: wear leveling (critical for flash longevity on a device that writes continuously), power-loss resilience (no corruption on unexpected reboot), and directory support for organizing tiers into separate paths. SPIFFS is deprecated in ESP-IDF v5+." vocab={[
  { term: "SPIFFS", definition: "SPI Flash File System — an older embedded filesystem without wear leveling or directory support. Deprecated in ESP-IDF v5+ in favor of LittleFS." },
  { term: "wear leveling", definition: "Distributing writes evenly across all flash blocks so no single block wears out prematurely. Critical for Madie, which writes continuously — without it, flash sectors would fail within months." },
  { term: "power-loss resilience", definition: "The filesystem can recover to a consistent state after unexpected power loss (e.g., battery death mid-write). LittleFS uses copy-on-write semantics to guarantee this." },
]} /> on flash. StorageManager is the sole writer — no concurrent access. Old Tier 1 data is evicted after <DV value="1 hour" defense="1 hour retention balances context richness against flash wear. At ~2.5MB/hour, Tier 1 consumes ~2.5MB of the 12MB tier_store partition. Longer retention (4-8h) was tested but provided diminishing returns for consultation context quality while accelerating flash wear." vocab={[
  { term: "flash wear", definition: "Flash memory cells degrade after a finite number of write/erase cycles (~100K for NOR flash). Shorter retention means more frequent eviction writes, accelerating wear. 1 hour balances data freshness against longevity." },
  { term: "tier_store partition", definition: "A dedicated 12MB region of the 32MB flash chip reserved for tiered data storage. Partitioned at firmware build time via the ESP-IDF partition table." },
]} /> to stay within the <DV value="12MB tier_store partition" defense="12MB of the 32MB flash is allocated to tier_store. The remaining 20MB is split between dual OTA slots (8MB each), NVS (64KB), glyph_store (256KB), and ~11.5MB unallocated headroom for future features. 12MB supports ~5 hours of Tier 1 data if compression falls behind." vocab={[
  { term: "OTA slots", definition: "Over-The-Air update partitions — two 8MB slots that allow firmware updates without bricking the device. One runs the active firmware while the other receives the update; they swap on successful boot." },
  { term: "NVS", definition: "Non-Volatile Storage — a 64KB key-value store for configuration data (WiFi credentials, BSSID, device ID). Survives firmware updates and factory resets." },
  { term: "glyph_store", definition: "A 256KB partition holding the 22-glyph bitmap inventory displayed on the e-ink screen. Separate from tier_store so glyph updates don't affect data retention." },
]} />.</>, specs: [{ k: "Writer", v: "StorageManager (exclusive)" }, { k: "Retention", v: "1 hour" }, { k: "Partition", v: "12MB tier_store" }], sampleData: {
        scenario: "The Tier 1 payload for the 2:15–2:20 PM window arrives via WebSocket. StorageManager receives it through the tier_write_queue and writes it to the LittleFS partition on flash. This is the final step of the passive capture pipeline.",
        rows: [
          { field: "Payload received", type: "Tier 1", group: "Write operation", example: [{ k: "Size", v: "~2.8 KB" }, { k: "Window", v: "2:15:04 → 2:15:09 PM" }, { k: "Source", v: "Aggregator via WebSocket" }] },
          { field: "Write path", type: "LittleFS", group: "Write operation", example: [{ k: "Queue", v: "tier_write_queue (depth 16)" }, { k: "Writer", v: "StorageManager task (Core 1, priority 3)" }, { k: "Concurrency", v: "sole writer — no locks needed" }] },
          { field: "Storage state", type: "flash", group: "Partition budget", example: [{ k: "Partition", v: "tier_store (12 MB)" }, { k: "Tier 1 usage", v: "~2.5 MB/hour of speech" }, { k: "Current", v: "~1.2 MB used (28 min of speech today)" }, { k: "Headroom", v: "~10.8 MB free" }] },
          { field: "Retention", type: "timer", group: "Lifecycle", example: [{ k: "Keep for", v: "1 hour" }, { k: "Then", v: "uploaded to Hourly Compressor via gRPC" }, { k: "After compression", v: "Tier 1 data deleted, replaced by 2-4KB Tier 2 summary" }, { k: "Flash wear", v: "~100K write cycles per block, wear-leveled by LittleFS" }] },
        ],
      } },
    ],
  },
  {
    id: "consult",
    title: "Active Consultation",
    description: "User-initiated query from button press to e-ink display response.",
    accent: zone.cloud,
    steps: [
      { label: "Button ISR", detail: "Push-to-talk, release-to-send", color: zone.device, flowLabel: "hold = record", expanded: <>Momentary tactile switch on <DV value="GPIO 2" defense="GPIO 2 supports RTC wake from deep sleep and has hardware interrupt capability. It's on the RTC domain, meaning it can wake the ESP32 from any sleep state without external circuitry." vocab={[
  { term: "RTC wake", definition: "A low-power timer circuit that can rouse the chip from its deepest sleep state, using almost no energy while it waits." },
  { term: "deep sleep", definition: "A power-saving mode where the main processor shuts off entirely. Only a tiny circuit stays alive to listen for a wake-up signal like a button press." },
  { term: "RTC domain", definition: "A small subset of the chip's pins that remain powered during deep sleep, so they can detect events and wake the rest of the system." },
]} />. <DV value="Push-to-talk" defense="Push-to-talk gives the user full control over capture duration — hold the button while speaking, release when done. This eliminates the guesswork of fixed windows: short questions finish fast, longer context-setting queries get the time they need. The release edge is the unambiguous signal to stop recording and begin processing." vocab={[
  { term: "push-to-talk", definition: "An interaction pattern where the user holds a button to record and releases it to send. Common in walkie-talkies and voice messaging — intuitive and gives the user explicit control over recording duration." },
  { term: "fixed window", definition: "A predetermined recording duration (e.g. 3 seconds) that starts on button press. Risks cutting off long questions or wasting time on short ones." },
  { term: "release edge", definition: "The electrical transition when the button is released (rising edge). Used as the definitive signal that the user has finished speaking." },
]} /> interaction: pressing the button starts mic capture (falling edge), releasing it stops capture and triggers the cloud pipeline (rising edge). <DV value="50ms debounce" defense="50ms software debounce filters mechanical switch bounce (typically 5-20ms for tactile switches) with margin. Applied to both press and release edges to prevent false starts and premature sends. Hardware RC debounce was considered but adds BOM cost and board space for a problem software solves reliably." vocab={[
  { term: "switch bounce", definition: "When a physical button is pressed or released, the metal contacts vibrate and briefly make/break connection several times. Without filtering, the system registers phantom events." },
  { term: "RC debounce", definition: "A hardware filter using a resistor and capacitor to smooth out electrical noise from switch bounce. Effective but adds physical components to the board." },
  { term: "BOM cost", definition: "Bill of Materials cost — the total price of every physical component needed to build one unit of the device." },
]} /> on both edges prevents false triggers. The ISR sets a FreeRTOS event flag that wakes the consultation task on Core 1.</>, specs: [{ k: "GPIO", v: "2 (interrupt)" }, { k: "Debounce", v: "50ms both edges" }, { k: "Mode", v: "Push-to-talk" }] },
      { label: "Query Mic", detail: "Hold-to-capture, release-to-send", color: zone.audio, flowLabel: "opus stream", expanded: <>While the button is held, the mic captures audio for the user's spoken question using the same I2S → Opus pipeline as passive capture. <DV value="Variable duration" defense="Push-to-talk lets the user control exactly how long they speak — short questions ('How am I doing?') take ~1-2 seconds, longer context-setting queries ('I've been stressed since that meeting, what should I focus on?') take 5-8 seconds. A fixed window either truncates long questions or wastes time on short ones. The user's release is a more reliable end-of-query signal than any VAD heuristic." vocab={[
  { term: "push-to-talk", definition: "An interaction pattern where the user holds a button to record and releases it to send. Gives the user explicit control over recording duration — no guessing, no truncation." },
  { term: "VAD heuristic", definition: "Using Voice Activity Detection to guess when the user has finished speaking. Unreliable for consultations because natural pauses (thinking mid-sentence) can be misread as the end of the query." },
]} /> — recording starts on press and stops on release. Frames are tagged as 'query' rather than 'ambient' so the cloud routes them to the consultation pipeline. A <DV value="15-second hard cap" defense="15 seconds prevents accidental holds (button stuck, fell asleep on it) from draining battery and bandwidth. At 16 kbps Opus, 15 seconds is ~30KB — negligible for upload but covers even the most verbose consultation query. Beyond 15 seconds, the question is likely not a consultation." vocab={[
  { term: "hard cap", definition: "An absolute maximum enforced by firmware regardless of button state. If the button is still held at 15 seconds, recording stops and the captured audio is sent as-is." },
  { term: "accidental holds", definition: "Unintentional prolonged button presses — the device is in a pocket, the user's hand slipped, or the button is mechanically stuck. The cap prevents runaway recording." },
]} /> prevents runaway recording.</>, specs: [{ k: "Duration", v: "Variable (release-to-send)" }, { k: "Max", v: "15s hard cap" }, { k: "Encoding", v: "Opus 16 kbps" }] },
      { label: "Deepgram STT", detail: "Streaming transcription", color: zone.cloud, timing: "~800 ms", flowLabel: "transcript", expanded: <>Streaming transcription of the query audio. <DV value="Deepgram Nova-2" defense="Nova-2 achieves the lowest word error rate in its price tier (~8% WER on conversational speech). Streaming mode returns interim results as audio arrives, reducing perceived latency. The ~800ms total includes network round-trip and model inference." vocab={[
  { term: "WER", definition: "Word Error Rate — the percentage of words a speech-to-text model gets wrong. Lower is better; 8% means roughly 1 in 12 words may be misrecognized." },
  { term: "streaming mode", definition: "Processing audio in real time as it arrives, rather than waiting for the entire recording to finish. Produces partial results immediately." },
  { term: "inference", definition: "The act of running input data through a trained AI model to get a prediction or result — here, converting spoken audio into written text." },
]} /> returns interim results as audio streams in, with a final transcript once the button is released and the last frame arrives.</>, specs: [{ k: "Model", v: "Deepgram Nova-2" }, { k: "Mode", v: "Streaming with final" }] },
      { label: "E5 Embed", detail: "384-dim vector encode", color: zone.cloud, timing: "~50 ms", flowLabel: "query vector", expanded: <>The query transcript is encoded into a <DV value="384-dimensional vector" defense="384 dimensions is the output size of E5-small-v2. It's the smallest E5 variant that maintains >95% retrieval accuracy relative to E5-large (1024-dim). Smaller dimensions mean faster Qdrant search and lower storage cost per embedding in Tier 4." vocab={[
  { term: "retrieval accuracy", definition: "How often the system finds the truly most relevant results when searching. Higher accuracy means the device surfaces themes that actually match your question." },
  { term: "E5-large", definition: "A larger version of the E5 text-embedding model that produces 1024-dimensional vectors. More precise but slower and costlier to store and search." },
]} /> using <DV value="E5-small-v2" defense="E5-small-v2 is the same model used for Tier 4 theme embeddings — using the same encoder for queries and documents ensures they live in the same semantic space. Switching to a different query encoder would require re-embedding all stored themes." vocab={[
  { term: "encoder", definition: "A model that converts text into a numerical vector (list of numbers). Two pieces of text with similar meaning produce vectors that are close together." },
  { term: "semantic space", definition: "A mathematical space where meaning is represented as position. Words or sentences with similar meaning sit near each other in this space." },
  { term: "re-embedding", definition: "Running all previously stored text through a new encoder to regenerate their vectors. Necessary when switching models, since different encoders produce incompatible number representations." },
]} />. Query vectors and stored vectors share the same semantic space.</>, specs: [{ k: "Model", v: "E5-small-v2" }, { k: "Dimensions", v: "384" }] },
      { label: "Qdrant Search", detail: "ANN over Tier 4 themes", color: zone.cloud, timing: "~20 ms", flowLabel: "top-k themes", expanded: <>Approximate nearest neighbor search over the user's long-term theme embeddings (Tier 4 only — Tiers 1-3 are read directly by the Context Assembler in the next step) stored in <DV value="Qdrant" defense="Qdrant over Pinecone because: self-hosted on GKE (data residency compliance), native Rust performance, built-in payload filtering for per-user isolation, and no per-query pricing. At 100K devices with ~1000 themes each, Qdrant handles the index size on a single node." vocab={[
  { term: "GKE", definition: "Google Kubernetes Engine — a managed service for running containerized applications on Google Cloud. Self-hosting here means the data stays on infrastructure we control." },
  { term: "payload filtering", definition: "The ability to narrow a search by metadata (like user ID) before comparing vectors. Ensures one user's query only matches their own stored themes." },
  { term: "per-user isolation", definition: "Keeping each user's data logically separated so searches never leak results across accounts." },
]} />. <DV value="HNSW index" defense="Hierarchical Navigable Small World graphs provide sub-linear search time (O(log n)) with >95% recall at our index size. Exact brute-force search would be fast enough at ~1000 themes per user, but HNSW scales to the 100K-device target without degradation." vocab={[
  { term: "sub-linear", definition: "Search time grows slower than the number of items stored. Doubling the data does not double the search time — it barely increases." },
  { term: "brute-force", definition: "Comparing the query against every single stored item one by one. Simple but slow when the dataset grows large." },
  { term: "recall", definition: "The percentage of truly relevant results that the search actually finds. 95% recall means it misses only about 1 in 20 of the best matches." },
]} /> returns the top-k most semantically relevant themes to the query.</>, specs: [{ k: "Index", v: "HNSW" }, { k: "DB", v: "Qdrant" }] },
      { label: "Context Assembler", detail: "Reads all tiers, merges with query", color: zone.cloud, flowLabel: "prompt", expanded: <>Assembles the LLM prompt from four distinct sources, each providing a different temporal lens on the user's life. <DV value="Tier 1 (last hour)" defense="Tier 1 provides the freshest context — what the user was just talking about, their current emotional state, who they were with. Included in full because it's small (~2-4KB) and almost always relevant to a consultation. Read directly from flash via StorageManager." vocab={[
  { term: "freshest context", definition: "The most recent data available — conversation topics, emotional tone, and environment from the last hour. Gives the LLM a sense of 'right now' when interpreting the query." },
  { term: "StorageManager", definition: "The single FreeRTOS task responsible for all flash reads and writes. The Context Assembler requests Tier 1-3 data through it to avoid concurrent access issues." },
]} /> is included in full — it's the immediate context. <DV value="Tier 2 (today)" defense="Today's hourly summaries show how the day has unfolded — morning stress that eased by afternoon, a shift in topics after lunch, increasing social interaction. Up to 24 summaries (~48-96KB total) but only the most relevant are selected based on topic overlap with the query." vocab={[
  { term: "hourly summaries", definition: "Compressed snapshots of each hour — dominant topics, emotional arc, key moments. Built by the Hourly Compressor from raw Tier 1 signals." },
  { term: "topic overlap", definition: "How much the topics in an hourly summary match the topics in the user's query. Hours with high overlap are more relevant and get included; unrelated hours are skipped to save token budget." },
]} /> provides today's arc — the assembler selects the most relevant hourly summaries based on topic overlap with the query. <DV value="Tier 3 (this week)" defense="Weekly daily digests reveal multi-day patterns: a topic that's been building all week, an emotional trend across days, a relationship shift. Included as a condensed summary rather than raw digests to stay within the token budget. Particularly valuable for queries like 'how has my week been going?'" vocab={[
  { term: "daily digests", definition: "One-page summaries of each day — top themes, emotional trajectory, key interactions, activity profile. Built by the Daily Compressor from 24 hourly summaries." },
  { term: "multi-day patterns", definition: "Trends that only become visible across several days — recurring stress on workdays, improving mood through the week, or a topic that keeps coming up." },
]} /> adds the weekly perspective. And the <DV value="top-k Tier 4 themes" defense="k=5 by default — the 5 most relevant long-term themes from Qdrant semantic search. These are the user's deep patterns: stress triggers, relationship dynamics, decision habits built over months. They're what make Madie's response personal rather than generic. Higher k values were tested but added noise without improving response quality." vocab={[
  { term: "semantic search", definition: "Finding stored themes by meaning similarity rather than keyword matching. The query 'should I take this job?' can match a theme about 'career uncertainty and risk tolerance' even though they share no words." },
  { term: "token budget", definition: "The maximum amount of text that can be sent to the language model in one request. Exceeding it causes the model to ignore or reject input." },
  { term: "noise", definition: "Irrelevant or low-quality context mixed in with useful information. Too much noise confuses the language model and degrades response quality." },
]} /> from the previous Qdrant search step provide long-term personal context. <DV value="Template-based concat" defense="Simple template concatenation over RAG frameworks (LangChain, LlamaIndex) because: the context structure is fixed and predictable (always the same 4 tiers in the same order), there's no need for dynamic retrieval strategies, and eliminating framework dependencies reduces cloud container size and cold-start time." vocab={[
  { term: "RAG", definition: "Retrieval-Augmented Generation — a pattern where relevant documents are fetched from a database and injected into the AI prompt to ground its answers in real data." },
  { term: "LangChain", definition: "A popular open-source framework for building LLM-powered applications. Powerful but adds dependency weight and startup latency." },
  { term: "cold-start", definition: "The delay when a cloud service spins up a fresh container from scratch. Fewer dependencies mean faster cold-starts and quicker first responses." },
]} /> merges all four tiers with the query transcript into a single prompt, managing token budget by trimming lower-priority sections if the combined context exceeds the model's input limit.</>, specs: [{ k: "Tier 1", v: "Full (last hour)" }, { k: "Tier 2", v: "Relevant hours (today)" }, { k: "Tier 3", v: "Weekly summary" }, { k: "Tier 4", v: "Top-5 themes (Qdrant)" }, { k: "Method", v: "Template concat" }], sampleData: {
        scenario: 'Tuesday 2:20 PM — the user presses the consultation button during a tense meeting about Q3 deadlines and asks: "Should I push back on the deadline or just go along with it?" The Context Assembler gathers data from all four tiers to build the prompt the Deep Reasoner will see.',
        rows: [
          { field: "Query text", type: "string", group: "1 — Query (user's words)", example: [{ k: "Transcript", v: '"Should I push back on the deadline or just go along with it?"' }, { k: "Source", v: "Deepgram STT via /consult" }, { k: "Duration", v: "~3.2s of held button" }] },

          { field: "transcript_segments[]", type: "TimestampedText", group: "2 — Tier 1 (last hour, included in full)", example: [{ k: "2:05 PM", v: "Speaker B: \"The client demo is Thursday, we can't move it\"" }, { k: "2:10 PM", v: "Speaker A: \"But the API integration isn't tested yet\"" }, { k: "2:15 PM", v: "Speaker B: \"That's not my problem to solve\"" }] },
          { field: "emotional_scores[]", type: "ValenceArousalStress", group: "2 — Tier 1 (last hour, included in full)", example: [{ k: "Valence", v: "−0.3 (negative)" }, { k: "Arousal", v: "0.7 (activated)" }, { k: "Stress", v: "0.6 (elevated)" }, { k: "Trend", v: "rising over last 20 min" }] },
          { field: "scene + motion", type: "SceneTag + MotionClass", group: "2 — Tier 1 (last hour, included in full)", example: [{ k: "Scene", v: "office" }, { k: "Motion", v: "seated, fidgeting" }, { k: "Social", v: "3 speakers, 42 min duration" }] },
          { field: "topics[]", type: "ClassifiedTopic", group: "2 — Tier 1 (last hour, included in full)", example: [{ k: "work", v: "92%" }, { k: "finances", v: "34%" }] },

          { field: "10 AM summary", type: "HourlySummary", group: "3 — Tier 2 (today, most relevant hours)", example: [{ k: "Topics", v: "work 65%, health 20%" }, { k: "Mood", v: "neutral, calm" }, { k: "Scene", v: "office" }, { k: "Note", v: "productive morning, no stress" }] },
          { field: "1 PM summary", type: "HourlySummary", group: "3 — Tier 2 (today, most relevant hours)", example: [{ k: "Topics", v: "work 80%, finances 15%" }, { k: "Mood", v: "tense, rising arousal" }, { k: "Scene", v: "office" }, { k: "Note", v: "pre-meeting tension building" }] },
          { field: "Skipped hours", type: "note", group: "3 — Tier 2 (today, most relevant hours)", example: [{ k: "7 AM", v: "home, low relevance to query" }, { k: "8 AM", v: "transit, no topic overlap" }, { k: "9 AM", v: "office, general chat — skipped" }] },

          { field: "Monday digest", type: "DailyDigest", group: "4 — Tier 3 (this week, condensed)", example: [{ k: "Theme", v: "work pressure 74%" }, { k: "Mood", v: "stressed → calm by evening" }, { k: "Key", v: "Speaker B conflict about timeline" }] },
          { field: "Week pattern", type: "WeeklySummary", group: "4 — Tier 3 (this week, condensed)", example: [{ k: "Recurring", v: "work pressure every weekday so far" }, { k: "Trend", v: "stress escalating Mon → Tue" }, { k: "Speaker B", v: "contentious in 3 of 4 interactions" }] },

          { field: "work_pressure", type: "ThemeRecord", group: "5 — Tier 4 (top-5 from Qdrant, similarity-ranked)", example: [{ k: "Similarity", v: "0.91" }, { k: "Weight", v: "1.00 (reinforced)" }, { k: "Summary", v: "chronic deadline stress, peaks Thu before demos" }] },
          { field: "career_uncertainty", type: "ThemeRecord", group: "5 — Tier 4 (top-5 from Qdrant, similarity-ranked)", example: [{ k: "Similarity", v: "0.84" }, { k: "Weight", v: "1.00 (new)" }, { k: "Summary", v: '"should I stay?" pattern — 3 consults in 2 weeks' }] },
          { field: "relationship_with_B", type: "ThemeRecord", group: "5 — Tier 4 (top-5 from Qdrant, similarity-ranked)", example: [{ k: "Similarity", v: "0.79" }, { k: "Weight", v: "0.88" }, { k: "Summary", v: "power dynamic — user concedes, stress persists 2-3 days after" }] },
          { field: "avoidance_pattern", type: "ThemeRecord", group: "5 — Tier 4 (top-5 from Qdrant, similarity-ranked)", example: [{ k: "Similarity", v: "0.72" }, { k: "Weight", v: "0.95" }, { k: "Summary", v: "confrontation deferred until forced — 80% avoidance rate" }] },
          { field: "evening_recovery", type: "ThemeRecord", group: "5 — Tier 4 (top-5 from Qdrant, similarity-ranked)", example: [{ k: "Similarity", v: "0.61" }, { k: "Weight", v: "0.95" }, { k: "Summary", v: "walks and cafe visits as coping — stress drops 40%" }] },

          { field: "Total prompt size", type: "tokens", group: "Assembled prompt", example: [{ k: "Query", v: "~20 tokens" }, { k: "Tier 1", v: "~400 tokens" }, { k: "Tier 2", v: "~300 tokens (2 relevant hours)" }, { k: "Tier 3", v: "~200 tokens (condensed)" }, { k: "Tier 4", v: "~500 tokens (5 themes)" }, { k: "Total", v: "~1,420 tokens" }, { k: "Budget", v: "2,048 max" }] },
          { field: "Output routing", type: "note", group: "Assembled prompt", example: [{ k: "Sent to", v: "Deep Reasoner AND Glyph Picker" }, { k: "Reason", v: "Glyph Picker needs context for situational nuance, not just reasoning output" }] },
        ],
      } },
      { label: "Deep Reasoner", detail: "Full analysis, never shown to user", color: zone.cloud, timing: "~1.5 s", flowLabel: "internal reasoning", expanded: <>The first stage of a <DV value="two-stage LLM architecture" defense="Splitting reasoning from glyph selection lets each model do what it's best at. The Deep Reasoner uses a large model (OpenAI / Claude) for unconstrained analysis — it reasons freely about the user's situation without worrying about output format. The Glyph Picker then translates that reasoning into symbols. A single-stage approach was tested but produced worse glyph selections: constraining output format degraded reasoning quality." vocab={[
  { term: "two-stage", definition: "A pipeline where one model reasons deeply and a second model translates that reasoning into the final output format. Separates 'thinking' from 'expressing' so neither task compromises the other." },
  { term: "unconstrained analysis", definition: "The Deep Reasoner has no format requirements — it can produce paragraphs of reasoning, weigh trade-offs, and explore nuance. This freedom produces richer analysis than forcing a model to simultaneously reason and select glyphs." },
]} />. The Deep Reasoner takes the full context package and produces <DV value="comprehensive internal reasoning" defense="The reasoning output covers: what the user is actually asking (which may differ from their literal words), relevant patterns from their history, emotional context, and potential perspectives the glyphs could reflect. This output is rich, detailed, and never shown to the user — it exists solely as input for the Glyph Picker." vocab={[
  { term: "internal reasoning", definition: "Analysis text produced by the first-stage LLM. The user never sees this — it's an intermediate artifact consumed by the Glyph Picker. Think of it as Madie 'thinking aloud' before choosing how to respond." },
  { term: "potential perspectives", definition: "Different angles from which to interpret the user's situation. The Deep Reasoner surfaces multiple framings so the Glyph Picker can compose a nuanced narrative arc rather than a flat answer." },
]} /> about the user's question in the context of their life patterns. The Deep Reasoner does not select glyphs, does not see the glyph inventory, and does not produce user-facing output. It reasons freely without format constraints.</>, specs: [{ k: "Model", v: "OpenAI / Claude" }, { k: "Output", v: "Internal reasoning (not user-facing)" }, { k: "Budget", v: "~1500ms" }], sampleData: {
        scenario: 'The Deep Reasoner receives the assembled context and produces ~200-500 tokens of internal reasoning about the user\'s question "Should I push back on the deadline or just go along with it?" This output is never shown to the user — it exists solely to inform the Glyph Picker.',
        rows: [
          { field: "System prompt", type: "string", group: "Input", example: [{ k: "Role", v: "You are a reflective companion analyzing a person's situation" }, { k: "Constraint", v: "Reason about emotional undercurrents, not logistics" }, { k: "Focus", v: "Identify what the person is really asking beneath the surface question" }, { k: "Format", v: "Structured reasoning — no glyphs, no output formatting" }] },
          { field: "Context package", type: "AssembledPrompt", group: "Input", example: [{ k: "From", v: "Context Assembler (previous step)" }, { k: "Size", v: "~1,420 tokens" }, { k: "Contains", v: "query + Tier 1-4 data" }] },

          { field: "Surface analysis", type: "reasoning", group: "Output — Internal Reasoning (~350 tokens)", example: [{ k: "Literal question", v: "whether to push back on a work deadline" }, { k: "But actually", v: "this is about the user's relationship with Speaker B and their pattern of avoidance" }, { k: "Evidence", v: "user has deferred confrontation with B in 80% of prior cases" }] },
          { field: "Emotional read", type: "reasoning", group: "Output — Internal Reasoning (~350 tokens)", example: [{ k: "Current state", v: "elevated stress (0.6), negative valence, high arousal — the body is activated" }, { k: "Pattern", v: "stress with B persists 2-3 days after unresolved conflict" }, { k: "Contrast", v: "when user does push back, valence improves +0.2 within 48h (from career consults)" }, { k: "Coping", v: "user will likely seek recovery walk tonight — stress drops 40%" }] },
          { field: "Temporal context", type: "reasoning", group: "Output — Internal Reasoning (~350 tokens)", example: [{ k: "Today", v: "stress escalated from calm morning to tense afternoon" }, { k: "This week", v: "work pressure appeared every weekday — not a one-off" }, { k: "Long-term", v: "career uncertainty is a new theme — \"should I stay?\" appearing in consults" }, { k: "Intersection", v: "the deadline question may be a proxy for the bigger career question" }] },
          { field: "Perspective directions", type: "reasoning", group: "Output — Internal Reasoning (~350 tokens)", example: [{ k: "Framing 1", v: "this is about boundaries — the user knows what they want but hesitates to assert it" }, { k: "Framing 2", v: "this is about the cost of peace — going along avoids conflict but extends the stress pattern" }, { k: "Framing 3", v: "this is about self-trust — the user's own judgment says push back, but they're seeking permission" }, { k: "Nudge direction", v: "reflect the user's own clarity back to them, not the logistics of the deadline" }] },

          { field: "What's NOT here", type: "note", group: "Boundaries", example: [{ k: "No glyphs", v: "the Deep Reasoner never sees the glyph inventory" }, { k: "No advice", v: "it doesn't say \"push back\" or \"go along\" — it reasons about the emotional landscape" }, { k: "No user output", v: "this entire block is consumed only by the Glyph Picker" }, { k: "No names", v: "speakers are A, B, C — never identified by name" }] },
        ],
      } },
      { label: "Glyph Picker", detail: "3 glyphs + 1 word as narrative arc", color: zone.cloud, timing: "~400 ms", flowLabel: "3 glyphs + 1 word", expanded: <>The second stage receives the Deep Reasoner's full analysis, the same multi-tier context, and the complete <DV value="22-glyph inventory" defense="The full inventory with all metadata — labels, tags, interpretations, stories — is sent to the Glyph Picker so it can reason over the meaning and versatility of each glyph. A glyph with seven interpretations can be cast in seven different narrative roles; a glyph with one interpretation is a dead symbol." vocab={[
  { term: "glyph inventory", definition: "The fixed set of 22 symbolic icons the device can display. Each glyph carries multiple interpretations and a narrative backstory that the Glyph Picker uses to select contextually appropriate symbols." },
  { term: "interpretations", definition: "Each glyph has multiple possible meanings — a figure reaching out could mean connection, longing, or letting go. The Glyph Picker chooses the glyph whose interpretations best fit the consultation context." },
]} /> with all metadata. In a single call, it selects <DV value="3 glyphs" defense="3 glyphs ordered as a narrative arc: setup, tension, resolution. This structure mirrors a minimal story — it creates a sense of movement and meaning rather than a static label. 2 glyphs felt too sparse in user testing; 4+ created visual clutter on the 200×200 display." vocab={[
  { term: "narrative arc", definition: "A three-beat story structure: setup introduces the situation, tension highlights the core conflict or question, resolution offers a perspective or direction. The three glyphs embody these beats." },
  { term: "setup, tension, resolution", definition: "The first glyph grounds the user in their situation, the second surfaces the central friction, and the third offers a way to hold or move through it. Order matters." },
  { term: "200×200", definition: "The e-ink screen resolution in pixels — 200 pixels wide by 200 pixels tall. A compact canvas that limits how many elements can be shown clearly." },
]} /> ordered as a narrative arc (setup, tension, resolution) and chooses <DV value="1 word (max 15 chars)" defense="A single word acts as tonal punctuation to the glyph arc — not a summary, not a label, but a lens. 'Breathe.' 'Almost.' 'Enough.' The word gives the sequence just enough semantic gravity to land while remaining open enough that the user completes the meaning. 15-char limit ensures it fits the e-ink display in large type." vocab={[
  { term: "tonal punctuation", definition: "The word doesn't describe what the glyphs mean — it sets the emotional tone for how to read them. It's the difference between seeing the same three glyphs with 'Breathe' versus 'Now' versus 'Careful.'" },
  { term: "lens", definition: "A conceptual frame that shapes how you read the glyphs. The word does not describe the situation — it offers a perspective on it." },
]} />. A <DV value="Rule Constraint Layer" defense="A deterministic validation gate (~5ms) that checks: exactly 3 valid glyph IDs from current inventory, no repeated glyphs, word is 1-12 ASCII characters, narrative order preserved. On failure, retries the Glyph Picker up to 2 times. If all retries fail, falls back to top-3 glyphs by relevance_score plus the most common noun from the Deep Reasoner's output." vocab={[
  { term: "deterministic", definition: "No AI involved — pure programmatic checks against a schema. Either the output conforms or it doesn't. No ambiguity, no hallucination." },
  { term: "relevance_score fallback", definition: "A safety net that bypasses the Glyph Picker entirely. Uses pre-computed relevance scores from the glyph inventory to select glyphs mechanically. Degraded narrative quality but guaranteed valid output." },
]} /> validates the output before it reaches the display.</>, specs: [{ k: "Model", v: "Haiku-class LLM" }, { k: "Input", v: "Reasoning + context + glyph inventory" }, { k: "Output", v: "3 glyphs + 1 word" }, { k: "Validation", v: "Rule Constraint (~5ms)" }], sampleData: {
        scenario: 'The Glyph Picker receives three inputs: the Deep Reasoner\'s internal analysis (about boundaries, avoidance patterns, and self-trust), the same multi-tier context, and the full 22-glyph inventory with metadata. It composes a 3-glyph narrative arc + 1 word in a single LLM call.',
        rows: [
          { field: "Deep Reasoner output", type: "string", group: "Input 1 — Reasoning", example: [{ k: "~350 tokens", v: "full internal analysis from previous step" }, { k: "Key insight", v: "user knows what they want but seeks permission to assert it" }, { k: "Nudge direction", v: "reflect the user's own clarity back" }] },
          { field: "Context package", type: "AssembledPrompt", group: "Input 2 — Multi-tier Context", example: [{ k: "Same as", v: "Deep Reasoner's input — sent to both stages" }, { k: "Why", v: "Glyph Picker needs situational nuance, not just reasoning" }] },

          { field: "glyph_shoreline_004", type: "GlyphMeta", group: "Input 3 — Glyph Inventory (22 glyphs, showing 3 selected)", example: [{ k: "Labels", v: "boundary, transition, threshold" }, { k: "Tags", v: "contemplative, liminal, calm" }, { k: "Interpretations", v: "standing at the edge of a decision · the space between what was and what comes next · permission to not cross over yet" }, { k: "Selection count", v: "14 (previously chosen)" }, { k: "Relevance", v: "0.73" }] },
          { field: "glyph_uphill_007", type: "GlyphMeta", group: "Input 3 — Glyph Inventory (22 glyphs, showing 3 selected)", example: [{ k: "Labels", v: "effort, resistance, persistence" }, { k: "Tags", v: "strained, determined, heavy" }, { k: "Interpretations", v: "pushing against something that won't move easily · the weight of carrying someone else's expectations · choosing the harder path because you know it matters" }, { k: "Selection count", v: "9" }, { k: "Relevance", v: "0.68" }] },
          { field: "glyph_hands_open_012", type: "GlyphMeta", group: "Input 3 — Glyph Inventory (22 glyphs, showing 3 selected)", example: [{ k: "Labels", v: "release, acceptance, offering" }, { k: "Tags", v: "open, surrendered, honest" }, { k: "Interpretations", v: "letting go of control without letting go of care · showing what you hold rather than hiding it · the vulnerability of an open hand versus a fist" }, { k: "Selection count", v: "11" }, { k: "Relevance", v: "0.71" }] },
          { field: "Other 19 glyphs", type: "GlyphMeta[]", group: "Input 3 — Glyph Inventory (22 glyphs, showing 3 selected)", example: [{ k: "Also sent", v: "the full metadata for all 22 glyphs" }, { k: "Total", v: "~1,200 tokens of glyph metadata" }, { k: "Reason", v: "Picker must see all options to compose the best narrative arc" }] },

          { field: "glyph_sequence", type: "string[3]", group: "Output — Glyph Selection", example: [{ k: "Setup", v: "glyph_shoreline_004 — standing at the edge of a decision" }, { k: "Tension", v: "glyph_uphill_007 — pushing against something that won't move easily" }, { k: "Resolution", v: "glyph_hands_open_012 — showing what you hold rather than hiding it" }] },
          { field: "word", type: "string", group: "Output — Companion Word", example: [{ k: "Word", v: '"Yours"' }, { k: "Max length", v: "15 characters" }, { k: "Role", v: "tonal punctuation — not a label, not advice" }, { k: "Why this word", v: 'the decision is already the user\'s — the word reflects ownership back' }] },
          { field: "narrative_thread", type: "string", group: "Output — Internal Trace (not displayed)", example: [{ k: "Thread", v: "from threshold to effort to openness — the arc moves from hesitation through the cost of action to the release of speaking plainly" }, { k: "Visibility", v: "logged for debugging, never shown to user" }] },

          { field: "Validation checks", type: "RuleConstraint", group: "Rule Constraint Layer (~5ms)", example: [{ k: "3 glyph IDs", v: "pass — all exist in current inventory" }, { k: "No duplicates", v: "pass — all 3 are distinct" }, { k: "Word length", v: 'pass — "Yours" is 5 characters (max 15)' }, { k: "Single word", v: "pass — no spaces or punctuation" }, { k: "Result", v: "validated — sent to device" }] },
          { field: "Fallback (not triggered)", type: "note", group: "Rule Constraint Layer (~5ms)", example: [{ k: "If validation failed", v: "retry Glyph Picker up to 2 times" }, { k: "If all retries fail", v: "top-3 glyphs by relevance_score + most common noun from Deep Reasoner" }, { k: "Fail rate", v: "<2% of consultations" }] },
        ],
      } },
      { label: "E-Ink Display", detail: "Text response rendered", color: zone.app, expanded: <>The 3 glyphs and 1 word are transmitted back to the device over WebSocket. The <DV value="e-ink display" defense="E-ink over OLED/LCD because: zero power to hold an image (critical for a device that displays the same content for hours), sunlight readability, and the 1-bit aesthetic aligns with the glyph system's symbolic visual language. The 200×200 resolution is the smallest that renders glyphs with sufficient detail." vocab={[
  { term: "OLED", definition: "Organic Light-Emitting Diode display — vibrant and fast-refreshing but consumes power continuously while showing an image." },
  { term: "LCD", definition: "Liquid Crystal Display — common in phones and monitors. Requires a backlight that draws constant power, unlike e-ink." },
  { term: "1-bit aesthetic", definition: "A visual style using only pure black and pure white — no grays or colors. Creates a stark, graphic look that suits symbolic glyph artwork." },
  { term: "sunlight readability", definition: "E-ink reflects ambient light like paper, remaining legible in direct sunlight where backlit screens wash out." },
]} /> renders them using <DV value="partial refresh (~200ms)" defense="Partial refresh updates only changed pixels, avoiding the full-screen flash (ghosting inversion) that takes ~2s. 200ms is fast enough to feel responsive after the 2.8s cloud round-trip. Full refresh is reserved for boot and zone transitions where ghosting cleanup matters." vocab={[
  { term: "ghosting inversion", definition: "A cleanup cycle where the display flashes black-then-white to erase faint remnants (ghosts) of the previous image left behind by partial updates." },
  { term: "full-screen flash", definition: "The visible black-white blink during a full e-ink refresh. Necessary to clear ghosting but takes ~2 seconds and is visually disruptive." },
]} />. The display holds the image with zero power until the next consultation or zone transition.</>, specs: [{ k: "Display", v: "200×200 1-bit e-ink" }, { k: "Refresh", v: "~200ms partial" }] },
    ],
  },
  {
    id: "compress",
    title: "Compression Cascade",
    description: "Progressive distillation from raw signals to long-term themes.",
    accent: zone.storage,
    steps: [
      { label: "Tier 1", detail: "Processed signals", color: zone.audio, timing: "1 h", flowLabel: "hourly cron", expanded: <>The richest data tier — all cloud analysis results merged by the aggregator. Retained for <DV value="1 hour" defense="1 hour balances context richness against flash wear. At ~2.5MB/hour, Tier 1 consumes ~2.5MB of the 12MB partition. Longer retention provides diminishing returns for consultation quality while accelerating flash wear cycles." vocab={[{ term: "flash wear", definition: "Flash memory degrades after repeated write/erase cycles. Minimizing unnecessary writes extends the device's physical lifespan." }, { term: "partition", definition: "A reserved section of flash memory dedicated to a specific tier's data, preventing one tier from consuming another's storage budget." }, { term: "context richness", definition: "The amount of detail preserved in a data tier. Raw signals are richest; each compression step trades detail for longer retention." }]} /> before compression. Contains transcripts, tonal scores, keywords, topics, speaker labels, environment class, ambient events, motion state, and social context.</>, specs: [{ k: "Retention", v: "1 hour" }, { k: "Location", v: "Flash (LittleFS)" }], sampleData: {
        scenario: "Tuesday 2:15 PM — the user is in a tense meeting about Q3 deadlines. Speaker B is pushing back on the timeline. The user has been fidgeting for the last 20 minutes. A colleague (Speaker C) briefly joins.",
        rows: [
          { field: "transcript_segments[]", type: "TimestampedText", group: "Speech", example: [{ k: "2:15 PM", v: '"I think we should push the deadline"' }, { k: "Speaker", v: "A" }, { k: "2:15 PM", v: '"We can\'t — the client demo is locked in"' }, { k: "Speaker", v: "B" }] },
          { field: "speaker_labels[]", type: "SpeakerTag", group: "Speech", example: [{ k: "Sequence", v: "A → B → A → B → C → A → B" }, { k: "Turns", v: "7" }, { k: "Duration", v: "3 min" }] },
          { field: "keywords[]", type: "NamedEntity", group: "Speech", example: [{ k: "Event", v: "Q3 targets" }, { k: "Person", v: "Sarah" }, { k: "Event", v: "client demo" }, { k: "Date", v: "Thursday" }] },
          { field: "topics[]", type: "ClassifiedTopic", group: "Speech", example: [{ k: "work", v: "92%" }, { k: "finances", v: "34%" }] },
          { field: "emotional_scores[]", type: "ValenceArousalStress", group: "Emotion", example: [{ k: "Valence", v: "−0.3 (negative)" }, { k: "Arousal", v: "0.7 (activated)" }, { k: "Stress", v: "0.6 (elevated)" }] },
          { field: "scene_classifications[]", type: "SceneTag", group: "Environment", example: [{ k: "Scene", v: "office" }] },
          { field: "ambient_events[]", type: "EventTag", group: "Environment", example: [{ k: "Sound", v: "typing" }, { k: "Sound", v: "distant conversation" }, { k: "Sound", v: "HVAC hum" }, { k: "Sound", v: "chair creak" }] },
          { field: "motion_states[]", type: "MotionClass", group: "Body", example: [{ k: "Posture", v: "seated" }, { k: "Activity", v: "fidgeting" }, { k: "Source", v: "MPU-6050" }] },
          { field: "social_context[]", type: "SocialPacket", group: "Social", example: [{ k: "Scene", v: "office" }, { k: "Topics", v: "work, deadline" }, { k: "Mood", v: "negative" }, { k: "Duration", v: "42 min" }] },
          { field: "consultation_flags[]", type: "ConsultationMark", group: "Meta", example: [{ k: "Time", v: "2:20 PM" }, { k: "Weight", v: "elevated" }, { k: "Action", v: "user pressed consult button" }] },
        ],
      } },
      { label: "Hourly Compress", detail: "Cloud summarisation", color: zone.storage, flowLabel: "summary", expanded: <><DV value="K8s Job" defense="K8s Jobs with scale-to-zero rather than always-on pods because compression is bursty — one job per device per hour, running for ~2-5 seconds. At 100 devices, this means ~100 jobs/hour vs 100 idle pods. Scale-to-zero saves ~$50/mo at the 100-device tier." vocab={[{ term: "scale-to-zero", definition: "Infrastructure that spins down to zero running instances when idle, so you only pay for actual computation time rather than keeping servers on standby." }, { term: "pods", definition: "The smallest deployable unit in Kubernetes — a container (or group of containers) that runs one instance of a workload." }, { term: "bursty", definition: "A workload pattern with short spikes of activity separated by long idle periods, making always-on infrastructure wasteful." }]} /> triggered every hour. Reads the last hour of Tier 1 payloads, extracts dominant patterns (top topics, emotional arc, key moments), and produces a Tier 2 hourly summary.</>, specs: [{ k: "Trigger", v: "Hourly cron" }, { k: "Runtime", v: "K8s Job (scale-to-zero)" }], sampleData: {
        scenario: "Compressing the 2 PM hour from the meeting scenario above. ~120KB of Tier 1 signals are distilled into a ~3KB hourly summary — a 40x compression that preserves the emotional arc and key moments while discarding raw transcripts.",
        rows: [
          { field: "Input size", type: "bytes", group: "Compression", example: [{ k: "Size", v: "~120KB" }, { k: "Source", v: "12 × 5-second payloads from active speech" }] },
          { field: "Output size", type: "bytes", group: "Compression", example: [{ k: "Size", v: "~3KB" }, { k: "Format", v: "Tier 2 hourly summary" }] },
          { field: "Ratio", type: "scalar", group: "Compression", example: [{ k: "Ratio", v: "~40× reduction" }] },
          { field: "Preserved", type: "summary", group: "What survives", example: [{ k: "Topics", v: "work at 72%" }, { k: "Arc", v: "neutral → stressed → tense" }, { k: "Moment", v: "stress spike at 2:15 PM" }, { k: "Social", v: "Speaker B dominated (62%)" }] },
          { field: "Discarded", type: "summary", group: "What's lost", example: [{ k: "Lost", v: "raw transcript text" }, { k: "Lost", v: "individual timestamps" }, { k: "Lost", v: "per-segment emotional scores" }, { k: "Lost", v: "ambient event details" }, { k: "Lost", v: "motion micro-states" }] },
        ],
      } },
      { label: "Tier 2", detail: "Daily digest", color: zone.storage, timing: "1 day", flowLabel: "daily cron", expanded: <><DV value="24 hourly summaries" defense="Accumulating 24 summaries before daily compression allows the daily compressor to identify patterns that span the full day — morning-to-evening emotional trajectories, work-to-home environment transitions, recurring social interaction windows." vocab={[{ term: "daily compressor", definition: "A scheduled cloud job that merges 24 hourly summaries into one daily digest, identifying patterns that only emerge over a full day." }, { term: "emotional trajectories", definition: "The arc of how someone's emotional state shifts over time — for example, stress building through the workday then easing in the evening." }, { term: "environment transitions", definition: "Moments when the device detects a change in surroundings (e.g., office to commute to home), tracked by the YAMNet audio classifier." }]} /> accumulated over one day. Contains dominant topics, emotional arcs, key moments, environment profiles, transitions, speaker interaction maps, and motion patterns.</>, specs: [{ k: "Retention", v: "1 day" }, { k: "Contents", v: "24 hourly summaries" }], sampleData: {
        scenario: "One hourly summary from the same Tuesday — the 2 PM slot. This is what the daily compressor will read when it merges all 24 hours at end of day.",
        rows: [
          { field: "hour_index", type: "uint8", group: "Time", example: [{ k: "Hour", v: "14" }, { k: "Time", v: "2:00 PM" }] },
          { field: "dominant_topics[]", type: "TopicWeight", group: "Content", example: [{ k: "work", v: "72%" }, { k: "health", v: "18%" }, { k: "finances", v: "10%" }] },
          { field: "emotional_arc", type: "EmotionalArc", group: "Emotion", example: [{ k: "Start", v: "calm" }, { k: "Peak", v: "stressed (negative, high energy)" }, { k: "End", v: "settling (neutral)" }] },
          { field: "key_moments[]", type: "MomentRecord", group: "Highlights", example: [{ k: "2:15 PM", v: "emotional spike — stress peak during deadline discussion" }, { k: "2:20 PM", v: "consultation — user asked for advice mid-meeting" }] },
          { field: "environment_profile", type: "SceneDistribution", group: "Context", example: [{ k: "office", v: "85%" }, { k: "transit", v: "10%" }, { k: "outdoor", v: "5%" }] },
          { field: "speaker_interaction_map", type: "SpeakerGraph", group: "Social", example: [{ k: "Speaker A", v: "35%" }, { k: "Speaker B", v: "52% (dominant)" }, { k: "Speaker C", v: "13%" }, { k: "Turns", v: "47 total, avg 4.2s" }] },
          { field: "motion_patterns", type: "MotionSummary", group: "Body", example: [{ k: "seated", v: "70%" }, { k: "walking", v: "20%" }, { k: "fidgeting", v: "10%" }] },
        ],
      } },
      { label: "Daily Compress", detail: "Cloud summarisation", color: zone.storage, flowLabel: "digest", expanded: <>Merges 24 hourly summaries into a single daily digest. Identifies cross-hour patterns — emotional trajectories that span the day, recurring interaction patterns, environment transition sequences.</>, specs: [{ k: "Trigger", v: "Daily cron" }, { k: "Input", v: "24 hourly summaries" }], sampleData: {
        scenario: "End-of-day compression for Tuesday. The compressor reads all 24 hourly summaries (~72KB total) and produces a single 5KB daily digest. Cross-hour patterns emerge: morning was calm, stress built through afternoon meetings, eased during the evening commute.",
        rows: [
          { field: "Input size", type: "bytes", group: "Compression", example: [{ k: "Size", v: "~72KB" }, { k: "Source", v: "24 hourly summaries × ~3KB each" }] },
          { field: "Output size", type: "bytes", group: "Compression", example: [{ k: "Size", v: "~5KB" }, { k: "Format", v: "daily digest" }] },
          { field: "Ratio", type: "scalar", group: "Compression", example: [{ k: "Ratio", v: "~14× reduction" }] },
          { field: "Preserved", type: "summary", group: "What survives", example: [{ k: "Arc", v: "day-level emotional trajectory" }, { k: "Themes", v: "top 3 with salience scores" }, { k: "Social", v: "Speaker B: tense, deadline" }, { k: "Places", v: "home → office → cafe → home" }, { k: "Consults", v: "3" }] },
          { field: "Discarded", type: "summary", group: "What's lost", example: [{ k: "Lost", v: "per-hour breakdowns" }, { k: "Lost", v: "individual key moments" }, { k: "Lost", v: "motion micro-patterns" }, { k: "Lost", v: "speaker turn counts" }, { k: "Lost", v: "scene distributions" }] },
        ],
      } },
      { label: "Tier 3", detail: "Weekly digest", color: zone.storage, timing: "1 wk", flowLabel: "theme merger", expanded: <><DV value="7 daily digests" defense="Weekly granularity is where behavioral trends emerge — topics that recur across days, relationships that shift over a week, decision patterns tied to weekly rhythms (workday vs weekend). Monthly compression was tested but the signal-to-noise ratio degraded at that timescale." vocab={[{ term: "weekly granularity", definition: "Compressing data at the week level — coarse enough to reveal recurring patterns but fine enough to preserve meaningful behavioral detail." }, { term: "behavioral trends", definition: "Recurring patterns in how someone acts over time, such as consistently discussing certain topics on workdays or shifting social interactions on weekends." }, { term: "signal-to-noise ratio", definition: "The proportion of useful information versus irrelevant detail. Over-compressing at monthly scale loses too much signal." }]} /> accumulated over one week. This is where behavioral trends become visible — recurring topics, shifting relationships, decision patterns that repeat weekly.</>, specs: [{ k: "Retention", v: "1 week" }, { k: "Contents", v: "7 daily digests" }], sampleData: {
        scenario: "One daily digest entry from Tuesday in a stressful work week. The weekly compressor will read 7 of these to identify patterns: work_pressure appeared every weekday, relationship tension with Speaker B escalated through the week.",
        rows: [
          { field: "date", type: "Date", group: "Time", example: [{ k: "Date", v: "Tuesday, April 7 2026" }] },
          { field: "environment_transitions[]", type: "SceneTimeline", group: "Context", example: [{ k: "7:30 AM", v: "home" }, { k: "8:15 AM", v: "transit" }, { k: "8:45 AM", v: "office" }, { k: "5:30 PM", v: "transit" }, { k: "6:00 PM", v: "cafe" }, { k: "7:30 PM", v: "home" }] },
          { field: "emotional_pattern", type: "DailyEmotionalArc", group: "Emotion", example: [{ k: "Morning", v: "neutral → slightly positive" }, { k: "Midday", v: "neutral → stressed (peak at 2 PM)" }, { k: "Evening", v: "stressed → calm (recovery after walk)" }] },
          { field: "dominant_themes[]", type: "ThemeWeight", group: "Content", example: [{ k: "work pressure", v: "81% salience" }, { k: "relationship tension", v: "45%" }, { k: "health awareness", v: "22%" }] },
          { field: "key_interactions[]", type: "InteractionSummary", group: "Social", example: [{ k: "Speaker B", v: "23 turns, tense, about deadlines" }, { k: "Speaker C", v: "8 turns, warm, about lunch plans" }] },
          { field: "activity_profile", type: "DailyMotionSummary", group: "Body", example: [{ k: "walking", v: "22%" }, { k: "seated", v: "65%" }, { k: "fidgeting", v: "8%" }, { k: "resting", v: "5%" }] },
          { field: "consultation_count", type: "uint8", group: "Meta", example: [{ k: "Count", v: "3 consultations today" }] },
        ],
      } },
      { label: "Weekly Compress", detail: "Theme extraction", color: zone.privacy, flowLabel: "embeddings", sampleData: {
        scenario: "End-of-week compression. The Theme Merger processes 7 daily digests and identifies which themes are new, reinforced, or fading. 'work_pressure' was reinforced all 5 weekdays so its decay resets. 'travel_planning' from 2 months ago received no new data and decays further.",
        rows: [
          { field: "Input size", type: "bytes", group: "Compression", example: [{ k: "Total", v: "~35KB" }, { k: "Source", v: "7 daily digests × ~5KB each" }] },
          { field: "Themes reinforced", type: "ThemeUpdate[]", group: "Theme Merger", example: [{ k: "work pressure", v: "appeared 5/5 weekdays → weight reset to 1.0" }, { k: "sleep quality", v: "appeared 4/7 days → weight reset to 1.0" }] },
          { field: "Themes created", type: "ThemeUpdate[]", group: "Theme Merger", example: [{ k: "career uncertainty", v: 'new — emerged from repeated "should I stay?" consultations' }] },
          { field: "Themes decayed", type: "ThemeUpdate[]", group: "Theme Merger", example: [{ k: "travel planning", v: "0.40 → 0.33 (no data in 8 weeks)" }, { k: "fitness routine", v: "0.25 → 0.21 (no data in 10 weeks)" }] },
          { field: "Embeddings generated", type: "float[384]", group: "Embedding", example: [{ k: "Model", v: "E5-small-v2" }, { k: "Dimensions", v: "384" }, { k: "Inference", v: "~50ms per embedding" }, { k: "New vector", v: "career uncertainty" }] },
          { field: "Decay weights", type: "WeightMap", group: "Embedding", example: [{ k: "work pressure", v: "1.00 — reinforced" }, { k: "career uncertainty", v: "1.00 — new" }, { k: "sleep quality", v: "0.92 — reinforced 2 wks ago" }, { k: "travel planning", v: "0.33 — fading (8 wks)" }, { k: "fitness routine", v: "0.21 — fading (10 wks)" }] },
        ],
      }, expanded: <>The most sophisticated compression step. Feeds weekly data into the Theme Merger, which uses <DV value="E5-small-v2" defense="E5-small-v2 produces 384-dim embeddings — the smallest E5 variant that maintains >95% retrieval accuracy vs E5-large. Using the same model for theme embeddings and consultation queries ensures semantic alignment without cross-encoder reranking." vocab={[{ term: "retrieval accuracy", definition: "How often the search system returns the correct, most relevant results. Higher accuracy means better consultation responses." }, { term: "E5-large", definition: "The larger sibling of E5-small-v2 with 1024-dim output. More accurate but slower and costlier — overkill for this use case." }, { term: "cross-encoder reranking", definition: "A second-pass model that re-scores search results for relevance. Unnecessary when the query and stored embeddings use the same encoder." }]} /> to generate <DV value="384-dim embeddings" defense="384 dimensions is the native output of E5-small-v2. Lower-dimensional projections (128, 256) were tested but reduced theme retrieval recall by 8-12%. The storage cost per theme (~1.5KB) is negligible relative to the text summaries." vocab={[{ term: "lower-dimensional projections", definition: "Reducing the number of dimensions in an embedding to save storage, at the cost of losing some semantic detail." }, { term: "recall", definition: "The percentage of truly relevant themes that the search actually finds. An 8-12% recall drop means missing important personal context." }, { term: "storage cost", definition: "The flash memory consumed per theme embedding. At ~1.5KB per theme, even thousands of themes fit comfortably in 32MB flash." }]} /> with <DV value="time-decay weighting" defense="Exponential decay with half-life of 12 weeks without reinforcement. A pattern that is never reinforced fades to 50% weight in 3 months, 25% in 6 months, and effectively zero (<1%) within 18 months. Patterns that are reinforced by new data resist decay — a recurring weekly stress trigger stays strong as long as it keeps appearing. This ensures the embedding space drifts to reflect the user's current state rather than historical averages." vocab={[{ term: "exponential decay", definition: "A weighting curve where older data loses influence over time — after one half-life, a theme carries half its original weight. Reinforced themes reset their decay clock." }, { term: "half-life", definition: "The time it takes for an unreinforced theme's weight to drop to 50%. At 12 weeks, a 3-month-old theme with no new supporting data has only 50% influence." }, { term: "embedding space", definition: "The mathematical space where themes and queries are represented as vectors. Nearby points are semantically similar." }, { term: "reinforcement", definition: "When new weekly data contains patterns that match an existing theme, that theme's decay clock resets and its weight is restored. Persistent life patterns stay strong; transient ones fade naturally." }]} />.</>, specs: [{ k: "Model", v: "E5-small-v2" }, { k: "Embeddings", v: "384-dim, time-decay weighted" }] },
      { label: "Tier 4", detail: "Long-term themes + embeddings", color: zone.privacy, timing: "2 yr", sampleData: {
        scenario: "The user's identity model after 4 months of daily wear. This is what makes Madie personal — stress triggers learned from hundreds of hours, relationship dynamics tracked across thousands of conversations, decision habits inferred from patterns the user may not consciously recognize. Total size: ~180KB across four sub-stores, encrypted with a dedicated eFuse key.",
        rows: [
          { field: "stress_triggers", type: "string[]", group: "4a — Emotional Patterns (8–15 KB)", example: [{ k: "Trigger", v: "deadline pressure" }, { k: "Trigger", v: "conflict with Speaker B" }, { k: "Trigger", v: "Sunday evening anticipation" }, { k: "Trigger", v: "unread messages piling up" }, { k: "Trigger", v: "financial conversations" }] },
          { field: "mood_cycles", type: "CyclePattern[]", group: "4a — Emotional Patterns (8–15 KB)", example: [{ k: "Weekly", v: "stress rises Mon–Wed, peaks Thu, drops Fri afternoon" }, { k: "Daily", v: "low energy mornings, peak focus 10 AM–noon, post-lunch dip" }, { k: "Seasonal", v: "insufficient data (need 12+ months)" }] },
          { field: "emotional_baselines", type: "AffectProfile", group: "4a — Emotional Patterns (8–15 KB)", example: [{ k: "Baseline", v: "slightly anxious" }, { k: "Valence avg", v: "−0.08 (mildly negative)" }, { k: "Arousal avg", v: "0.45 (moderate)" }, { k: "Trend", v: 'improving — was "anxious" 8 weeks ago' }] },
          { field: "valence_trends", type: "TrendLine", group: "4a — Emotional Patterns (8–15 KB)", example: [{ k: "4 weeks ago", v: "−0.15 avg" }, { k: "3 weeks ago", v: "−0.12 avg" }, { k: "2 weeks ago", v: "−0.09 avg" }, { k: "Last week", v: "−0.05 avg" }, { k: "Direction", v: "improving (+0.03/week)" }] },
          { field: "arousal_patterns", type: "ContextMap", group: "4a — Emotional Patterns (8–15 KB)", example: [{ k: "office + Speaker B", v: "high arousal (0.7 avg)" }, { k: "cafe alone", v: "low arousal (0.2 avg)" }, { k: "home evening", v: "moderate (0.4 avg)" }, { k: "transit", v: "low (0.25 avg)" }] },
          { field: "coping_indicators", type: "CopingMap[]", group: "4a — Emotional Patterns (8–15 KB)", example: [{ k: "evening walks", v: "stress drops 40% within 30 min" }, { k: "cafe visits", v: "valence shifts +0.3 avg" }, { k: "consultation", v: "sought after conflict 70% of the time" }, { k: "music listening", v: "arousal normalizes within 15 min" }] },

          { field: "speaker_B", type: "RelationProfile", group: "4b — Relational Patterns (10–20 KB)", example: [{ k: "Label", v: "Speaker B (anonymous — no name stored)" }, { k: "Frequency", v: "daily on weekdays, absent weekends" }, { k: "Valence", v: "tense → neutral (improving over 4 weeks)" }, { k: "Turn-taking", v: "B dominates 62% avg, user concedes" }, { k: "Topics", v: "work, deadlines, project planning" }, { k: "Trend", v: "less contentious — arousal dropped 15%" }, { k: "Consult trigger", v: "user consults Madie after 38% of B interactions" }] },
          { field: "speaker_C", type: "RelationProfile", group: "4b — Relational Patterns (10–20 KB)", example: [{ k: "Label", v: "Speaker C (anonymous)" }, { k: "Frequency", v: "2–3x per week" }, { k: "Valence", v: "warm, consistent (+0.4 avg)" }, { k: "Turn-taking", v: "balanced 48/52%" }, { k: "Topics", v: "personal, health, weekend plans" }, { k: "Trend", v: "stable over 16 weeks" }] },
          { field: "speaker_D", type: "RelationProfile", group: "4b — Relational Patterns (10–20 KB)", example: [{ k: "Label", v: "Speaker D (anonymous)" }, { k: "Frequency", v: "1x per week (Saturdays)" }, { k: "Valence", v: "positive, energizing (+0.5 avg)" }, { k: "Turn-taking", v: "user leads 58%" }, { k: "Topics", v: "hobbies, career ambitions, personal growth" }, { k: "Trend", v: "deepening — interaction length up 20% over 8 weeks" }] },
          { field: "social_dynamics", type: "GroupDynamic[]", group: "4b — Relational Patterns (10–20 KB)", example: [{ k: "B + user", v: "competitive, task-focused" }, { k: "C + user", v: "supportive, personal" }, { k: "B + C + user", v: "user is mediator, arousal drops vs B-only" }, { k: "Isolation", v: "solo periods >4h correlate with low valence next day" }] },

          { field: "uncertainty_types", type: "string[]", group: "4c — Decision Patterns (5–10 KB)", example: [{ k: "Type", v: "career direction — recurring 3+ months" }, { k: "Type", v: "financial commitments — avoided consistently" }, { k: "Type", v: "relationship boundaries with B — unresolved" }] },
          { field: "reasoning_habits", type: "HabitProfile", group: "4c — Decision Patterns (5–10 KB)", example: [{ k: "Under stress", v: "defers decisions, seeks consultation" }, { k: "When calm", v: "more decisive, shorter consult sessions" }, { k: "Pattern", v: "revisits same question ~3x before acting" }, { k: "Timing", v: "most decisions made Tue–Thu (not Mon/Fri)" }] },
          { field: "consultation_topics", type: "TopicFreq[]", group: "4c — Decision Patterns (5–10 KB)", example: [{ k: "career", v: "34% of all consultations" }, { k: "relationships", v: "28%" }, { k: "stress management", v: "22%" }, { k: "health", v: "16%" }] },
          { field: "decision_outcomes", type: "OutcomeMap[]", group: "4c — Decision Patterns (5–10 KB)", example: [{ k: "After career consults", v: "valence improves +0.2 within 48h (relief)" }, { k: "After B conflict", v: "stress persists 2–3 days (unresolved)" }, { k: "After health consults", v: "motion activity increases next day (action taken)" }] },
          { field: "avoidance_patterns", type: "string[]", group: "4c — Decision Patterns (5–10 KB)", example: [{ k: "financial decisions", v: "deferred 80% — consulted 6x, acted 1x" }, { k: "confrontation with B", v: "avoided until forced by external deadline" }, { k: "doctor appointment", v: "mentioned 4x in consults, not yet scheduled" }] },

          { field: "work_pressure", type: "384-dim vector", group: "4d — Theme Embeddings (50–200 KB)", example: [{ k: "Weight", v: "1.00 (reinforced this week)" }, { k: "Age", v: "14 weeks" }, { k: "Reinforced", v: "12 of last 14 weeks" }, { k: "Matches", v: "deadlines, work stress, time pressure, project anxiety" }, { k: "Size", v: "~1.5KB" }] },
          { field: "career_uncertainty", type: "384-dim vector", group: "4d — Theme Embeddings (50–200 KB)", example: [{ k: "Weight", v: "1.00 (new this week)" }, { k: "Age", v: "this week" }, { k: "Origin", v: 'repeated "should I stay?" consultations' }, { k: "Matches", v: "job changes, career direction, professional identity" }, { k: "Size", v: "~1.5KB" }] },
          { field: "relationship_with_B", type: "384-dim vector", group: "4d — Theme Embeddings (50–200 KB)", example: [{ k: "Weight", v: "0.88 (reinforced 3 weeks ago)" }, { k: "Age", v: "11 weeks" }, { k: "Matches", v: "conflict, workplace tension, power dynamics, assertiveness" }, { k: "Size", v: "~1.5KB" }] },
          { field: "evening_recovery", type: "384-dim vector", group: "4d — Theme Embeddings (50–200 KB)", example: [{ k: "Weight", v: "0.95 (reinforced last week)" }, { k: "Age", v: "9 weeks" }, { k: "Matches", v: "relaxation, decompression, self-care, alone time" }, { k: "Size", v: "~1.5KB" }] },
          { field: "travel_planning", type: "384-dim vector", group: "4d — Theme Embeddings (50–200 KB)", example: [{ k: "Weight", v: "0.33 (fading)" }, { k: "Age", v: "20 weeks" }, { k: "Stale", v: "8 weeks with no new data" }, { k: "Matches", v: "vacation, trips, adventure, time off" }, { k: "Projection", v: "will reach ~0 at 18 months if unreinforced" }] },
          { field: "fitness_routine", type: "384-dim vector", group: "4d — Theme Embeddings (50–200 KB)", example: [{ k: "Weight", v: "0.21 (fading)" }, { k: "Age", v: "16 weeks" }, { k: "Stale", v: "10 weeks with no new data" }, { k: "Matches", v: "exercise, gym, running, physical health" }, { k: "Projection", v: "will drop below threshold in ~6 weeks" }] },
        ],
      }, expanded: <>The most compressed representation — <DV value="four sub-stores" defense="Separating themes into 4a (Emotional), 4b (Relational), 4c (Decision), 4d (Semantic Vectors) enables per-category crypto-shredding. A user can delete their relational patterns without losing emotional history. It also allows the consultation pipeline to weight categories differently per query type." vocab={[{ term: "per-category crypto-shredding", definition: "Destroying the encryption key for just one sub-store, making that category of data permanently unreadable while leaving other categories intact." }, { term: "consultation pipeline", definition: "The end-to-end flow that processes a user's spoken question, searches their stored themes, and generates a glyph+word response." }]} /> of theme embeddings. Encrypted with a <DV value="separate eFuse key" defense="A dedicated encryption key for Tier 4 (separate from Tier 1-3 keys) means crypto-shredding Tier 4 doesn't affect other tiers, and vice versa. eFuse storage ensures the key survives firmware updates and can only be destroyed, never read back." vocab={[{ term: "encryption key", definition: "A secret value used to scramble data so it can only be read by someone who holds the same key. Destroying the key makes the data permanently unreadable." }, { term: "firmware updates", definition: "Software updates pushed to the device's flash memory. eFuse keys are stored in a separate hardware region that firmware writes cannot touch." }, { term: "crypto-shredding", definition: "Deleting data by destroying its encryption key rather than erasing the data itself — faster, more thorough, and verifiable." }]} />. <DV value="2-year rolling window" defense="2 years captures enough history for meaningful long-term pattern recognition (seasonal emotional cycles, annual relationship dynamics) while ensuring data doesn't persist indefinitely. The rolling window crypto-shreds themes older than 2 years automatically." vocab={[{ term: "seasonal emotional cycles", definition: "Recurring mood patterns tied to time of year — such as winter low energy or summer social expansiveness — that require a full year of data to detect." }, { term: "annual relationship dynamics", definition: "How someone's social patterns shift across a year, including holiday gatherings, work-cycle rhythms, and recurring life events." }]} /> with crypto-shredding.</>, specs: [{ k: "Retention", v: "2-year rolling" }, { k: "Encryption", v: "Separate eFuse key" }, { k: "Sub-stores", v: "4a-4d" }] },
    ],
  },
];

/* ── Step row with timeline dot ──────────────────────────────────────── */

function StepRow({ step, isLast }: { step: PipelineStep; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
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
        {hasDetail && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", opacity: open ? 0.5 : 0.2, flexShrink: 0 }}>
            <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke={colors.ink} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {/* Expanded content */}
      {open && step.expanded && (
        <StepContext.Provider value={step.label}>
        <div style={{ marginTop: spacing.xs, paddingLeft: 6 + spacing.xs }}>
          <div style={{ ...typography.body, color: colors.ink2, marginBottom: (step.specs?.length || step.sampleData?.rows.length) ? spacing.xs : 0 }}>{step.expanded}</div>
          {(step.specs?.length || step.sampleData?.rows.length) ? (
            <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
              {step.specs?.map((s) => (
                <span key={s.k} style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${colors.rule}`, background: colors.inkFaint, color: colors.ink, fontWeight: weights.medium, whiteSpace: "nowrap" }}>
                  <span style={{ color: colors.ink3, fontWeight: weights.regular, marginRight: 4 }}>{s.k}</span>{s.v}
                </span>
              ))}
              {step.sampleData && step.sampleData.rows.length > 0 && (
                <span
                  onClick={(e) => { e.stopPropagation(); setSampleOpen(true); }}
                  style={{ ...typography.stat, padding: `3px ${spacing.xs}px 2px`, borderRadius: radius.sm, border: `1px solid ${zone.storage}40`, background: `${zone.storage}08`, color: zone.storage, fontWeight: weights.medium, whiteSpace: "nowrap", cursor: "pointer" }}
                >
                  Sample Data
                </span>
              )}
            </div>
          ) : null}
          {sampleOpen && step.sampleData && (
            <SampleDataModal label={step.label} payload={step.sampleData} onClose={() => setSampleOpen(false)} />
          )}
        </div>
        </StepContext.Provider>
      )}
    </div>
  );
}

/* ── Pipeline card with accent bar ───────────────────────────────────── */

function PipelineCard({ pipeline }: { pipeline: PipelineDef }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.rule}`,
        borderRadius: radius.sm,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ padding: `${spacing.md}px ${spacing.md}px ${spacing.sm}px`, display: "flex", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...typography.h2, fontSize: 20, marginBottom: spacing.xxs }}>{pipeline.title}</div>
          <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.ink2, lineHeight: 1.5 }}>{pipeline.description}</div>
        </div>
        <div style={{ ...typography.h2, fontSize: 24, color: pipeline.accent, opacity: 0.35, lineHeight: 1, flexShrink: 0 }}>{pipeline.steps.length}</div>
      </div>

      {/* Steps */}
      <div style={{ borderTop: `1px solid ${colors.rule}`, flex: 1 }}>
        {pipeline.steps.map((step, i) => (
          <StepRow key={step.label} step={step} isLast={i === pipeline.steps.length - 1} />
        ))}
      </div>
    </div>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────── */

function SystemDataFlow({ onZoneClick }: { onZoneClick: (tab: string) => void }) {
  return (
    <div>
      <ZoneLabel color={colors.ink}>End-to-End Data Flow</ZoneLabel>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: spacing.sm,
          alignItems: "stretch",
        }}
      >
        {PIPELINES.map((p) => (
          <PipelineCard key={p.id} pipeline={p} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { key: "overview", label: "System Overview" },
  { key: "device", label: "Device" },
  { key: "cloud", label: "Cloud" },
  { key: "tiers", label: "Tiers" },
  { key: "social", label: "App & Social" },
  { key: "privacy", label: "Privacy" },
] as const;

export default function ArchitecturePage() {
  const [tab, setTab] = useState<string>("overview");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", padding: `${spacing.xxl}px ${spacing.xl}px ${spacing.xxl + spacing.xl}px` }}>
      <AnimatedStyles />

      <div className="arch-fadein">
        <Eyebrow style={{ marginBottom: spacing.xs }}>Project Nara</Eyebrow>
        <Title style={{ marginBottom: spacing.xs }}>System Architecture</Title>
        <Body style={{ maxWidth: 640, marginBottom: 32 }}>
          A portable context engine that captures ambient audio, compresses it through
          progressive tiers, and responds to consultations with 3 glyphs and 1 word on an E-Ink display.
        </Body>
      </div>

      {/* Key Stats */}
      <div
        className="arch-fadein arch-fadein-1"
        style={{
          display: "flex",
          gap: spacing.lg,
          marginBottom: 32,
          paddingBottom: spacing.md,
          borderBottom: borders.rule,
          flexWrap: "wrap",
        }}
      >
        <MiniStat label="Nodes" value="51" />
        <MiniStat label="Cloud Services" value="22" />
        <MiniStat label="Consultation Latency" value="~2.8s" />
        <MiniStat label="Battery (duty-cycled)" value="~8h" />
        <MiniStat label="Flash" value="32MB" />
        <MiniStat label="PSRAM" value="16MB" />
      </div>

      {/* Navigation */}
      <div className="arch-fadein arch-fadein-2">
        <Tabs
          options={TABS.map((t) => ({ key: t.key, label: t.label }))}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="arch-fadein arch-fadein-3" style={{ paddingTop: spacing.lg + spacing.xxs }}>
        {tab === "overview" && (
          <div>
            <SystemDataFlow onZoneClick={setTab} />
            <div style={{ marginTop: 48 }}>
              <Suspense fallback={<div style={{ height: 1000, display: "flex", alignItems: "center", justifyContent: "center", ...typography.body, color: colors.ink3 }}>Loading diagram...</div>}>
                <PipelineFlowLazy onNodeClick={setSelectedNode} />
              </Suspense>
            </div>
            {selectedNode && (
              <NodePopup nodeId={selectedNode} onClose={() => setSelectedNode(null)} />
            )}
          </div>
        )}
        {tab === "device" && <DeviceArchitecture />}
        {tab === "cloud" && <CloudArchitecture />}
        {tab === "tiers" && <TierPipeline />}
        {tab === "social" && <CompanionAndSocial />}
        {tab === "privacy" && <PrivacyLifecycle />}
      </div>
    </div>
  );
}
