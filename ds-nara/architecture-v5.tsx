"use client";

import { type ReactNode, type CSSProperties, useState, lazy, Suspense, createContext, useContext } from "react";
/* createPortal — now handled by Modal from DS */
const PipelineFlowLazy = lazy(() => import("./pipeline-flow-v5").then(m => ({ default: m.PipelineFlow })));
import {
  colors,
  fonts,
  weights,
  spacing,
  radius,
  borders,
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
  ExpandableRow,
  ExpandableListCard,
  SpecTag,
  SpecTagRow,
  SpecRow,
  Modal,
  ModalHeader,
  Chip,
  NodeBox,
  ZoneLabel,
  FlowArrow,
} from "./components";

/* ═══════════════════════════════════════════════════════════════════════════
   PALETTE — domain colors for the architecture zones
   ═══════════════════════════════════════════════════════════════════════════ */

import { zone } from "./architecture-tokens";
import { NODE_INFO } from "./node-info-v5";

/* ═══════════════════════════════════════════════════════════════════════════
   TINY REUSABLE PRIMITIVES — now imported from DS:
   ZoneLabel, FlowArrow, Chip, NodeBox, SpecRow, SpecTag, SpecTagRow,
   Modal, ModalHeader, ExpandableRow, ExpandableListCard
   ═══════════════════════════════════════════════════════════════════════════ */

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
  return (
    <Modal onClose={onClose}>
      <ModalHeader eyebrow={context ?? "Value Defense"} title={value} onClose={onClose} />
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
    </Modal>
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

  return (
    <Modal onClose={onClose} maxWidth={900} padding={spacing.xl} maxHeight="85vh">
      <ModalHeader eyebrow="Sample Payload" title={label} titleSize={22} onClose={onClose} style={{ marginBottom: spacing.xs }} />

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
    </Modal>
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

/* Chip, NodeBox, SpecRow — now imported from DS */

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
    scale: "Free tier", cost: "$0", unit: "/mo", pct: 0,
    breakdown: [
      { item: "Supabase (free)", cost: "$0", note: "50K MAU, 500MB DB, 1GB storage, 500K Edge Function invocations" },
      { item: "Deepgram STT", cost: "$0", note: "$200 free credits for new accounts" },
      { item: "LLM API (OpenAI/Claude)", cost: "~$0.02", note: "Per device/day — compression + consultations" },
    ],
    notes: "Supabase free tier covers early development and beta testing with up to ~50 devices. The only variable cost is the LLM API for compression and consultations.",
  },
  {
    scale: "Supabase Pro", cost: "$25", unit: "/mo base", pct: 37,
    breakdown: [
      { item: "Supabase Pro", cost: "$25", note: "100K MAU, 8GB DB, 100GB storage, unlimited Edge Functions" },
      { item: "Deepgram STT", cost: "$0.0043/min", note: "Pay-as-you-go after free credits" },
      { item: "LLM API", cost: "~$0.02", note: "Per device/day — ~3 compression calls + consultations" },
      { item: "Supabase compute", cost: "$10", note: "Additional compute add-on if needed" },
    ],
    notes: "Pro tier supports hundreds of devices. The dominant variable cost is Deepgram STT (~$2.50/device/mo at 10 hr/day). LLM costs are negligible at ~$0.60/device/mo.",
  },
  {
    scale: "At scale (1K+)", cost: "~$3", unit: "/device/mo", pct: 19,
    breakdown: [
      { item: "Supabase Team/Enterprise", cost: "$1.00", note: "Amortized across devices" },
      { item: "Deepgram STT", cost: "$1.00", note: "Volume discount (~$0.0025/min)" },
      { item: "LLM API", cost: "$0.60", note: "Compression + consultations" },
      { item: "Tonal / Env APIs", cost: "$0.20", note: "External analysis APIs" },
      { item: "Network / storage", cost: "$0.20", note: "Supabase bandwidth + storage" },
    ],
    notes: "At 1K+ devices, Supabase costs amortize well. Deepgram volume pricing kicks in. Total is dramatically lower than the over-engineered alternative because there is no GPU node pool, vector DB, or K8s control plane to pay for.",
  },
];

function CostBreakdownModal({ tier, onClose }: { tier: typeof COST_TIERS[number]; onClose: () => void }) {
  return (
    <Modal onClose={onClose} maxWidth={560}>
      <ModalHeader
        eyebrow={tier.scale}
        title={<>~{tier.cost}<span style={{ ...typography.label, color: colors.ink3, marginLeft: spacing.xxs }}>{tier.unit}</span></>}
        titleSize={28}
        onClose={onClose}
        style={{ marginBottom: spacing.md }}
      />

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
    </Modal>
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
    route: "/ingest-audio",
    protocol: "Edge Function",
    color: zone.audio,
    title: "Audio Ingestion",
    subtitle: "Supabase Edge Function",
    steps: [
      {
        label: "STT — Deepgram",
        detail: "Speaker ID → Keywords → Topics",
        time: "real-time",
        expanded: <>Deepgram Nova-2 provides <DV value="streaming STT" defense="Streaming (not batch) enables real-time tonal overlay — each utterance is available within 300ms, so the Tonal and Environment pipelines can align their windows to the same audio segment." vocab={[{ term: "Streaming STT", definition: "Speech-to-text that returns partial results as audio arrives, rather than waiting for the full recording." }, { term: "Speaker diarization", definition: "Identifying which speaker said what in multi-speaker audio." }]} /> with <DV value="speaker diarization" defense="Diarization lets Madie distinguish the wearer's voice from ambient conversation, which is critical for accurate tonal analysis — stress detected on a bystander's speech would corrupt the wearer's emotional timeline." vocab={[{ term: "Diarization", definition: "The process of partitioning an audio stream into segments according to speaker identity." }, { term: "Nova-2", definition: "Deepgram's production STT model offering high accuracy with low latency." }]} />. Chosen over Whisper for its native streaming API and lower p99 latency.</>,
        specs: [{ k: "Model", v: "Nova-2" }, { k: "Latency", v: "<300ms p99" }],
      },
      {
        label: "Tonal Analysis",
        detail: "Valence / arousal / stress via API",
        time: "async",
        expanded: <>Extracts <DV value="valence / arousal / stress" defense="These three axes capture the core affective dimensions defined by Russell's circumplex model. Valence (positive vs. negative) and arousal (calm vs. excited) together map most emotional states; stress is added as a separate axis because it is the primary signal Madie uses for glyph selection." vocab={[{ term: "Valence", definition: "The pleasantness dimension of emotion — positive (happy, content) vs. negative (sad, angry)." }, { term: "Arousal", definition: "The activation dimension — high (excited, tense) vs. low (calm, drowsy)." }, { term: "Circumplex model", definition: "Russell's model mapping emotions onto a 2D plane of valence and arousal." }]} /> from the audio stream. Runs as an <DV value="external API call" defense="Self-hosting wav2vec2 requires a GPU instance running 24/7 — expensive and complex for a Supabase-only architecture. An external tonal analysis API (e.g., Hume AI, or a dedicated microservice) accepts audio segments and returns valence/arousal/stress scores. The async pattern means the Edge Function fires the request and collects the result within the 5s aggregation window, avoiding blocking the STT pipeline." vocab={[{ term: "External API", definition: "A third-party hosted service that processes audio and returns emotion scores, eliminating the need to self-host ML models." }, { term: "Async processing", definition: "The Edge Function dispatches the API call without waiting synchronously — results are collected before the aggregation window closes." }]} /> rather than self-hosted wav2vec2, keeping the infrastructure serverless.</>,
        specs: [{ k: "Window", v: "5s" }, { k: "Axes", v: "3" }],
      },
      {
        label: "Environment Classification",
        detail: "Scene classification via API",
        time: "async",
        expanded: <>Scene classification via an <DV value="audio classification API" defense="YAMNet-style classification (trained on AudioSet's 527 classes) is available as a hosted API, removing the need for on-device or self-hosted inference. The API accepts a 5-second audio segment and returns scene labels (e.g., 'office', 'cafe', 'outdoors') with confidence scores. This gives Madie environmental context without managing ML infrastructure." vocab={[{ term: "YAMNet", definition: "Yet Another Mobile Network — a lightweight audio event classifier built on MobileNet v1, trained on AudioSet. Used here via a hosted API rather than self-hosted." }, { term: "AudioSet", definition: "A large-scale dataset of over 2 million human-labeled 10-second audio clips spanning 527 sound event classes." }]} /> provides environmental awareness. The API categorizes the acoustic scene into <DV value="12 core categories" defense="Rather than exposing all 527 AudioSet classes, the API maps results into 12 categories relevant to a wearable context: home, office, transit, cafe, outdoors-urban, outdoors-nature, gym, social-gathering, quiet, noisy, music, and unknown. This simplification reduces downstream storage and makes Tier 1 payloads more consistent." vocab={[{ term: "Scene classification", definition: "Categorizing the overall acoustic environment (e.g., cafe, park, office) from the mixture of sound events." }, { term: "Category mapping", definition: "Reducing hundreds of fine-grained audio classes into a manageable set of meaningful scene labels." }]} /> relevant to wearable context.</>,
        specs: [{ k: "Categories", v: "12" }, { k: "Backbone", v: "API" }],
      },
    ],
    footer: {
      label: "5s Aggregation → Postgres",
      detail: "INSERT into tier_1_signals",
      expanded: <>Collects STT, Tonal, and Environment outputs into a single <DV value="5s window" defense="The 5-second cadence is the fundamental clock of the ingestion pipeline. It is long enough for tonal analysis to produce a stable reading and for environment classification to capture a meaningful scene snapshot, yet short enough that emotional shifts are not lost. The aggregated payload is ~2KB, written directly to Postgres." vocab={[{ term: "Tier 1 payload", definition: "The raw, time-stamped aggregation of STT transcript, tonal axes, and environment tags — the highest-resolution data tier." }, { term: "Aggregation window", definition: "A fixed time interval over which multiple data streams are collected and merged into a single output record." }]} /> payload. Each window is tagged with speaker ID, timestamp, and a confidence score before being inserted into the <DV value="tier_1_signals table" defense="A Postgres table with RLS policies scoped to the device's auth.uid(). Rows are automatically cleaned up by a pg_cron job after 1 hour. Indexes on device_id and created_at ensure fast reads for both the compression pipeline and consultation context fetch." vocab={[{ term: "RLS", definition: "Row Level Security — Postgres policies that restrict which rows a user can read/write based on their authentication context." }, { term: "pg_cron", definition: "A Postgres extension that runs SQL statements on a cron schedule, used here for automatic tier retention cleanup." }]} /> and pushed to the device over Supabase Realtime.</>,
      specs: [{ k: "Cadence", v: "5s" }, { k: "Storage", v: "Postgres" }],
    },
  },
  {
    id: "compress",
    route: "pg_cron",
    protocol: "Edge Function",
    color: zone.storage,
    title: "Context Compression",
    subtitle: "Edge Functions + pg_cron",
    steps: [
      {
        label: "Hourly",
        detail: "Tier 1 → Tier 2 summary",
        time: "scheduled",
        expanded: <>A <DV value="Supabase Edge Function" defense="pg_cron triggers a Supabase Edge Function on the hour. The function queries the last hour of tier_1_signals (~720 rows), runs an LLM summarization call to extract dominant emotion, top topics, and environment mode, then INSERTs a single Tier 2 record. Edge Functions scale to zero between runs — no idle compute cost." vocab={[{ term: "Edge Function", definition: "A Deno-based serverless function hosted by Supabase, triggered by HTTP requests or pg_cron schedules. Scales to zero when not in use." }, { term: "Tier 2", definition: "Hourly summary records — one per hour — containing LLM-summarized emotion, topic, and environment data." }]} /> triggered by pg_cron processes ~720 Tier 1 windows into a single Tier 2 record using <DV value="LLM summarization" defense="Rather than rule-based aggregation (averaging scores, counting keywords), the hourly job sends the 720 windows to an LLM (OpenAI or Claude) with a structured prompt. The LLM identifies the dominant emotional arc, extracts key topics with context, and produces a natural-language summary. This captures nuance that statistical aggregation misses — e.g., 'stress spiked during the 2pm meeting but resolved after a walk'." vocab={[{ term: "LLM summarization", definition: "Using a large language model to compress many data points into a coherent narrative summary, preserving semantic meaning that statistical aggregation would lose." }, { term: "Data reduction", definition: "The ratio of input size to output size after compression — ~700:1 means 720 input records become 1 output record." }]} />. This achieves ~700:1 data reduction while preserving semantic context.</>,
        specs: [{ k: "Input", v: "~720 windows" }, { k: "Reduction", v: "~700:1" }],
      },
      {
        label: "Daily",
        detail: "Tier 2 → Tier 3 digest",
        time: "scheduled",
        expanded: <>Merges up to 24 Tier 2 records into a <DV value="daily digest" defense="The daily digest captures cross-hour patterns that hourly summaries miss: Was stress elevated only in the morning, or sustained all day? Did topics shift from work to personal after 6pm? The LLM receives all 24 hourly summaries and produces a single Tier 3 record that narrates the day's emotional arc and key themes." vocab={[{ term: "Daily digest", definition: "A Tier 3 record summarizing an entire day — emotional arcs, topic clusters, and environment transitions, produced by LLM synthesis of 24 hourly summaries." }, { term: "Emotional arc", definition: "The trajectory of emotional state across a time period, showing how valence and arousal change." }]} /> that captures <DV value="cross-hour patterns" defense="By examining all 24 hourly summaries together, the daily job identifies patterns invisible at the hourly level: morning-to-evening stress gradients, recurring topic clusters at specific times, and environment transitions that correlate with mood shifts. These arc-level patterns are what weekly compression eventually distills into themes." vocab={[{ term: "Cross-hour patterns", definition: "Trends and correlations that only become visible when examining an entire day of hourly summaries together." }, { term: "Stress gradient", definition: "The directional change in stress levels across a time period — rising, falling, or sustained." }]} />. Individual utterances are discarded; emotional arcs and topic clusters are preserved.</>,
        specs: [{ k: "Input", v: "≤24 T2" }, { k: "Output", v: "1 T3" }],
      },
      {
        label: "Weekly",
        detail: "Tier 3 → Tier 4 themes",
        time: "scheduled",
        expanded: <>The weekly job clusters 7 daily digests into <DV value="Tier 4 themes" defense="Themes are natural-language labels (e.g., 'work deadline stress', 'social reconnection') generated by the LLM from a week of daily digests. Each theme carries an emotion summary and a strength score. Weekly granularity is the sweet spot — daily themes are too noisy (a single bad meeting skews the picture), while monthly themes are too delayed for timely consultation responses." vocab={[{ term: "Tier 4 theme", definition: "A named, semantically coherent pattern extracted from a week of daily digests — the highest-level unit of Madie's memory, stored with an emotion summary and strength score." }, { term: "Theme extraction", definition: "The LLM identifies recurring patterns across 7 daily digests and names them as discrete themes." }]} /> using LLM-based <DV value="theme extraction" defense="The LLM receives 7 daily digests and identifies 2-5 recurring themes by clustering topics, emotional patterns, and environmental contexts. Unlike statistical clustering (k-means on embeddings), LLM extraction produces human-readable theme names with explanatory context — making them directly usable in the consultation pipeline's prompt without further processing." vocab={[{ term: "Strength score", definition: "A 0-1 value indicating how prominently a theme appeared across the week — themes with higher strength are prioritized in consultation context." }, { term: "Semantic clustering", definition: "Grouping related concepts by meaning rather than keyword overlap, enabling the LLM to identify themes like 'career uncertainty' from discussions about jobs, interviews, and salary." }]} />. These themes become the long-term memory that the consultation pipeline draws from.</>,
        specs: [{ k: "Input", v: "7 T3" }, { k: "Output", v: "2-5 themes" }],
      },
    ],
    footer: {
      label: "LLM Summarization",
      detail: "OpenAI / Claude API call for compression",
      expanded: <>All three compression tiers use <DV value="LLM summarization" defense="Rule-based compression (averaging scores, counting keywords) loses semantic nuance. LLM summarization preserves meaning: it can distinguish 'stressed about a specific deadline' from 'generally anxious', or note that 'work topics dominated but with a positive tone'. The cost is minimal — ~$0.01/day per device across all three compression tiers combined." vocab={[{ term: "LLM summarization", definition: "Using a large language model to compress structured data into natural-language summaries that preserve semantic meaning and context." }, { term: "Rule-based compression", definition: "Aggregation using deterministic rules (averages, counts, thresholds) — fast and cheap but loses nuance and context." }]} /> rather than rule-based aggregation. This is a <DV value="deliberate cost trade-off" defense="At ~$0.01/day per device, LLM compression costs less than the engineering time to build and maintain equivalent rule-based pipelines. The LLM adapts to new signal types without code changes — adding a new Tier 1 field (e.g., heart rate) requires only a prompt update, not a new aggregation function. At scale (100K devices), this becomes ~$1K/month — still cheaper than a dedicated ML engineering team." vocab={[{ term: "Prompt-driven adaptation", definition: "Adding new capabilities by updating the LLM prompt rather than writing new code — enabling rapid iteration on compression logic." }, { term: "Cost per device", definition: "The total API cost divided by active devices — the key unit economics metric for Madie's cloud infrastructure." }]} /> — LLM intelligence at commodity API prices.</>,
      specs: [{ k: "Model", v: "OpenAI / Claude" }, { k: "Cost", v: "~$0.01/day" }],
    },
  },
  {
    id: "consult",
    route: "/consult",
    protocol: "Edge Function",
    color: zone.cloud,
    title: "Consultation Pipeline",
    subtitle: "~2.8s end-to-end",
    steps: [
      {
        label: "Query STT — Deepgram",
        detail: "Deepgram Nova-2",
        time: "~800ms",
        expanded: <>Reuses the same <DV value="Deepgram Nova-2" defense="Using the same STT provider for both stream ingestion and consultation queries ensures consistent transcription quality and vocabulary handling. The ~800ms latency includes network round-trip to Deepgram's API — acceptable since it runs in parallel with the user's natural pause after speaking." vocab={[{ term: "Nova-2", definition: "Deepgram's production STT model, chosen for its balance of accuracy and latency." }, { term: "Endpointing", definition: "Detecting when a speaker has finished their utterance, triggering final transcription." }]} /> model as the Stream lane. Query transcription is the latency bottleneck at <DV value="~800ms" defense="800ms is the p95 latency for a typical 3–8 second query. Deepgram's endpointing adds ~200ms after the user stops speaking. This is the single largest contributor to the 2.4s end-to-end budget, but attempts to replace it with on-device STT (Whisper-tiny) produced unacceptable word error rates above 15%." vocab={[{ term: "p95 latency", definition: "The 95th percentile response time — 95% of requests complete within this duration." }, { term: "Word error rate", definition: "The percentage of words incorrectly transcribed — insertions, deletions, and substitutions divided by total reference words." }]} />, but it runs during the user's natural pause.</>,
        specs: [{ k: "p95", v: "800ms" }, { k: "WER", v: "<8%" }],
      },
      {
        label: "Fetch Context",
        detail: "Postgres indexed queries",
        time: "~10ms",
        expanded: <>Queries recent <DV value="tier context from Postgres" defense="Queries recent Tier 1 signals, today's Tier 2 daily digest, this week's Tier 3 weekly digest, and top Tier 4 themes by strength. All from Postgres via indexed queries — no vector search needed. The tier compression pipeline distills each time horizon into a small, structured record, so a simple primary-key lookup retrieves everything the LLM needs." vocab={[{ term: "Indexed query", definition: "A database query that uses pre-built indexes (B-tree on device_id + timestamp) for O(log n) lookup, avoiding full table scans." }, { term: "Primary-key lookup", definition: "Retrieving a record by its unique identifier — the fastest possible database operation, typically under 1ms." }]} /> across all four tiers. The total context fits within <DV value="<4K tokens" defense="Tier 1 recent signals contribute ~500 tokens, Tier 2 daily digest ~1K tokens, Tier 3 weekly digest ~1K tokens, and Tier 4 top themes ~500 tokens. Combined with the system prompt and user query, the total stays under 4K tokens — well within the LLM's context window and fast to process. No vector search or embedding step is needed because the tier structure already provides temporal relevance." vocab={[{ term: "Context assembly", definition: "Gathering data from multiple tiers and formatting it into a prompt the LLM can process in a single request." }, { term: "Temporal relevance", definition: "The tier structure inherently provides recency-weighted context — Tier 1 is minutes old, Tier 2 is hours old, Tier 3 is days old, Tier 4 is weeks old." }]} /> — compact enough for fast LLM inference.</>,
        specs: [{ k: "Tables", v: "4" }, { k: "Tokens", v: "<4K" }],
      },
            {
        label: "Deep Reasoner",
        detail: "OpenAI / Claude",
        time: "~1500ms",
        expanded: <>A <DV value="full-size model" defense="The Deep Reasoner uses OpenAI or Claude — a model large enough for unconstrained reasoning about the user's situation. It takes the full context package and produces comprehensive internal analysis that the user never sees. This output exists solely as input for the Glyph Picker." vocab={[{ term: "Deep Reasoner", definition: "The first-stage LLM that produces rich internal reasoning about the user's query in the context of their life patterns. It does not select glyphs or produce user-facing output." }, { term: "Two-stage architecture", definition: "Separating reasoning from glyph selection lets each model do what it's best at — the Deep Reasoner thinks freely, the Glyph Picker translates that thinking into symbols." }]} /> receives the assembled context and produces <DV value="internal reasoning" defense="The Deep Reasoner does not see the glyph inventory, does not select glyphs, and does not produce user-facing output. It reasons freely about the user's situation — what they're really asking, relevant patterns from their history, emotional context, and multiple perspectives the glyphs could reflect." vocab={[{ term: "Internal reasoning", definition: "Analysis text consumed only by the Glyph Picker. The user never sees this — it's Maddi 'thinking aloud' before choosing how to respond." }, { term: "Unconstrained", definition: "No format requirements — the Deep Reasoner can produce paragraphs of reasoning, weigh trade-offs, and explore nuance without worrying about output format." }]} /> that feeds the Glyph Picker.</>,
        specs: [{ k: "Model", v: "OpenAI / Claude" }, { k: "Output", v: "Internal reasoning" }],
      },
      {
        label: "Glyph Picker",
        detail: "Haiku-class LLM",
        time: "~400ms",
        expanded: <>A second <DV value="Haiku-class LLM" defense="A separate, smaller LLM call handles glyph selection. This two-stage approach isolates reasoning from selection, making each step independently testable. The Picker's prompt includes the Deep Reasoner's analysis plus the 22-glyph inventory with semantic descriptions, so it can weigh visual coherence alongside semantic relevance." vocab={[{ term: "Two-stage pipeline", definition: "Splitting reasoning and selection into separate LLM calls — the first generates deep analysis, the second translates it into symbols." }, { term: "Glyph inventory", definition: "The fixed set of 22 glyphs available to Maddi, each with labels, tags, interpretations, and stories." }]} /> selects 3 glyphs from the <DV value="22-glyph inventory" defense="The 22-glyph set covers Maddi's core emotional and thematic vocabulary. Each glyph maps to a semantic cluster (e.g., 'growth', 'tension', 'connection'), and the Picker aims for complementary coverage — selecting glyphs from different clusters rather than reinforcing a single theme." vocab={[{ term: "Semantic cluster", definition: "A group of related meanings that a glyph represents — e.g., the 'growth' cluster includes progress, learning, and development." }, { term: "Complementary coverage", definition: "Selecting glyphs from different semantic clusters to provide a richer, more nuanced response." }]} /> plus 1 companion word, arranging them as a narrative arc: setup, tension, resolution.</>,
        specs: [{ k: "Input", v: "Reasoner output + 22 glyphs" }, { k: "Output", v: "3 glyphs + 1 word" }],
      },
      {
        label: "Rule Constraint",
        detail: "Glyph validation",
        time: "~5ms",
        expanded: <>Validates the selected glyph combination against <DV value="constraint rules" defense="Rules prevent degenerate outputs: no duplicate glyphs, no more than 2 glyphs from the same semantic cluster, and the companion word must not exceed 15 characters (E-Ink rendering constraint). If validation fails, the LLM is re-invoked with the constraint violation as additional context — this happens in <2% of consultations." vocab={[{ term: "Constraint rules", definition: "A set of deterministic checks applied after LLM selection to ensure the output meets display and semantic requirements." }, { term: "Re-invocation", definition: "Calling the Glyph Picker again with additional context when the initial selection violates a constraint." }]} /> to ensure valid output. Checks include <DV value="no duplicate glyphs" defense="Duplicate glyphs waste the limited 3-glyph budget and provide no additional information. The rule also prevents the model from over-indexing on a single strong theme at the expense of breadth." vocab={[{ term: "Degenerate output", definition: "A response that fails to provide useful information — e.g., three identical glyphs or an empty companion word." }, { term: "Display budget", definition: "The fixed output format of 3 glyphs + 1 word, constrained by the E-Ink display's layout." }]} />, cluster diversity, and word length limits.</>,
        specs: [{ k: "Fail rate", v: "<2%" }, { k: "Word max", v: "15 chars" }],
      },
    ],
    footer: {
      label: "Output: 3 glyphs + 1 word → E-Ink",
      detail: "Pushed to device via Supabase Realtime",
      expanded: <>The final output is <DV value="3 glyphs + 1 word" defense="This constrained format forces Madie to distill complex emotional context into a minimal, contemplative response. Three glyphs provide enough semantic space for nuance (primary theme + modifier + contrast) while remaining instantly parseable on the 1.54-inch E-Ink display. The companion word anchors interpretation." vocab={[{ term: "Companion word", definition: "A single word (max 15 characters) displayed alongside the 3 glyphs to anchor their interpretation in natural language." }, { term: "E-Ink display", definition: "A low-power electronic paper display (1.54-inch, 200x200px) that retains its image without power — ideal for a glanceable, always-on interface." }]} /> rendered on the E-Ink display. The format is <DV value="deliberately minimal" defense="Madie's design philosophy rejects information density in favor of contemplative simplicity. The 3+1 format was validated in user testing: participants reported feeling 'understood' rather than 'analyzed', which is the core emotional goal of the device." vocab={[{ term: "Contemplative interface", definition: "A UI paradigm that prioritizes reflection over information density — showing less to encourage deeper engagement." }, { term: "Glanceable", definition: "An interface designed to convey its message in under 2 seconds of visual attention." }]} /> — designed for reflection, not information overload.</>,
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
          <span style={{ ...typography.label, fontWeight: weights.medium, color: colors.ink }}>Supabase Auth</span>
          <span style={{ ...typography.stat, color: colors.ink3, marginLeft: spacing.xs }}>JWT • Row Level Security • Device API Keys</span>
        </div>
        <div style={{ display: "flex", gap: spacing.xxs }}>
          <Chip color={zone.cloud}>JWT auth</Chip>
          <Chip color={zone.cloud}>RLS policies</Chip>
          <Chip color={zone.cloud}>Device API keys</Chip>
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
      <ZoneLabel color={zone.cloud}>Cloud — Supabase</ZoneLabel>

      {/* Service Topology */}
      <H3 style={{ marginBottom: spacing.md }}>Service Topology</H3>
      <ServiceTopology />

      {/* Infrastructure */}
      <H3 style={{ marginBottom: spacing.md }}>Infrastructure & Cost</H3>
      <CostCards />
      <div style={{ display: "flex", gap: spacing.xxs, flexWrap: "wrap" }}>
        <Chip color={zone.cloud}>Postgres + RLS</Chip>
        <Chip color={zone.cloud}>Edge Functions</Chip>
        <Chip color={zone.cloud}>pg_cron</Chip>
        <Chip color={zone.cloud}>Supabase Realtime</Chip>
        <Chip color={zone.cloud}>Supabase Storage</Chip>
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
   SECTION 4: COMPANION APP
   ═══════════════════════════════════════════════════════════════════════════ */

const APP_SCREENS = [
  { screen: "WiFi Provisioning", desc: "Secure network onboarding over BLE", detail: <>Device broadcasts BLE advertisement. App discovers it, initiates <DV value="SRP6a mutual authentication" defense="Secure Remote Password version 6a lets the device and app prove identity to each other without transmitting the WiFi password in any form — not even a hash. The protocol is zero-knowledge: an eavesdropper on the BLE link learns nothing about the password, and a compromised server cannot replay credentials." vocab={[{ term: "zero-knowledge", definition: "A proof protocol where one party demonstrates knowledge of a secret without revealing the secret itself or any information that could help derive it." }, { term: "eavesdropper", definition: "A passive attacker who captures BLE packets in transit, attempting to extract credentials from the observed traffic." }]} />, then performs <DV value="X25519 key agreement" defense="X25519 (Curve25519 Diffie-Hellman) derives a shared encryption key between the app and device without either side transmitting the key. This ephemeral key encrypts WiFi credentials in transit. Even if BLE traffic is recorded, the credentials cannot be decrypted without the private keys that never leave either device." vocab={[{ term: "ephemeral key", definition: "A temporary cryptographic key generated for a single session and discarded afterward, providing forward secrecy." }, { term: "Diffie-Hellman", definition: "A key agreement protocol that allows two parties to establish a shared secret over an insecure channel without transmitting the secret itself." }]} /> to encrypt WiFi credentials in transit. Credentials are stored in <DV value="eFuse-protected NVS" defense="The ESP32-S3's eFuse block stores a hardware-unique AES key that is burned into silicon during provisioning. This key encrypts the NVS flash partition using AES-XTS. The eFuse is read-once — software and JTAG cannot extract the key after burning, so even physical flash removal yields only ciphertext." vocab={[{ term: "eFuse", definition: "One-time-programmable fuses in the ESP32-S3 silicon that store cryptographic keys — once burned, they cannot be read back via software or debug interfaces." }, { term: "AES-XTS", definition: "A disk encryption mode using AES that provides strong protection for data at rest, specifically designed for storage media where sectors can be independently accessed." }]} /> on the device — never in app storage.</>, specs: [{ k: "Auth", v: "SRP6a mutual" }, { k: "Key exchange", v: "X25519" }, { k: "Storage", v: "eFuse NVS (AES-XTS)" }] },
  { screen: "Device Status", desc: "Live hardware dashboard over BLE", detail: <><DV value="Real-time telemetry" defense="The device pushes hardware metrics continuously rather than requiring the app to poll. Push-based telemetry eliminates polling latency and reduces BLE connection overhead — the app subscribes once and receives updates as they occur, typically every 1-2 seconds." vocab={[{ term: "push-based telemetry", definition: "A data delivery model where the device initiates transmissions on state change, eliminating the latency and overhead of repeated client-side polling." }, { term: "polling latency", definition: "The delay between a state change on the device and the app detecting it, which grows proportionally with the polling interval." }]} /> streamed via <DV value="BLE notify characteristics" defense="BLE GATT notify characteristics allow the device to push data to the app without the app requesting it. Each characteristic maps to one metric (battery, WiFi RSSI, pipeline state, storage, sync timestamp). The app subscribes to all five on connect. Notifications are ~20 bytes each, well within a single BLE packet." vocab={[{ term: "GATT characteristic", definition: "A data container in the BLE Generic Attribute Profile that holds a single value — subscribing to notifications lets a client receive automatic updates when the value changes." }, { term: "BLE packet", definition: "A single BLE transmission unit, typically up to 251 bytes in BLE 5.0, carrying one or more attribute values." }]} />. Battery level, WiFi signal strength, pipeline state (idle/recording/streaming), per-tier storage utilization, and last successful cloud sync timestamp.</>, specs: [{ k: "Transport", v: "BLE notify" }, { k: "Metrics", v: "Battery, WiFi, pipeline, storage, sync" }] },
  { screen: "Tier Viewer", desc: "Read-only access to compressed context", detail: <>Timeline view of Tier 2/3/4 summaries. Data is fetched from device over BLE, held <DV value="in-memory only" defense="The app allocates tier data in volatile memory and releases it on screen exit. No SQLite, no AsyncStorage, no file writes. This guarantees that closing the app destroys all tier data — there is no forensic artifact on the phone. Even a device backup or forensic extraction of the phone yields zero Nara content." vocab={[{ term: "volatile memory", definition: "RAM that loses its contents when the process exits, as opposed to persistent storage (files, databases) that survives app restarts." }, { term: "forensic artifact", definition: "Data remnants left on a device that can be recovered through forensic analysis, such as cached files, database entries, or swap pages." }]} /> during viewing, and discarded on screen exit. No caching, no persistence. The app never sees <DV value="Tier 0 or Tier 1 data" defense="Tier 0 (raw audio) and Tier 1 (transcripts, tonal scores) contain the most sensitive information — actual speech content and emotional analysis. The companion app is deliberately excluded from these tiers. Even if the phone is compromised, the attacker gains access only to compressed summaries (Tier 2+), never raw recordings or transcripts." vocab={[{ term: "Tier 0", definition: "Raw 16 kHz audio frames captured by the microphone — the most privacy-sensitive tier, retained only in the device's ring buffer for seconds." }, { term: "Tier 1", definition: "Structured analysis output (transcripts, tonal scores, environment classification) produced by the cloud pipeline from Tier 0 audio." }]} />.</>, specs: [{ k: "Access", v: "Read-only, Tier 2/3/4" }, { k: "Persistence", v: "In-memory only" }] },
  { screen: "Privacy Controls", desc: "Mic toggle and data deletion", detail: <>Hardware mic toggle sends a <DV value="GPIO command over BLE" defense="The mic mute is implemented as a hardware-level GPIO pin toggle, not a software flag. The app sends a BLE write command that the ESP32-S3 translates into a physical GPIO state change, cutting power to the MEMS microphone at the electrical level. Software cannot override a hardware mute — even a compromised firmware update cannot re-enable the mic while the GPIO pin is held low." vocab={[{ term: "GPIO", definition: "General Purpose Input/Output — a physical pin on the ESP32-S3 that can be programmatically set high or low to control external hardware like the microphone power rail." }, { term: "hardware mute", definition: "A mute mechanism that physically disconnects or depowers the microphone, as opposed to a software mute that merely discards audio samples." }]} /> to physically cut mic power. A single <DV value="delete-all action" defense="Crypto-shredding destroys every per-tier AES key simultaneously, rendering all stored data permanently unrecoverable in a single operation. This is the nuclear option — no per-tier granularity in v1, just a full wipe. Faster than secure flash erasure and equally irreversible." vocab={[{ term: "crypto-shredding", definition: "A data destruction technique that renders encrypted data permanently unrecoverable by deleting the encryption key rather than the data itself." }]} /> triggers crypto-shredding across all tiers.</>, specs: [{ k: "Mic toggle", v: "GPIO over BLE" }, { k: "Delete", v: "All tiers, irreversible" }] },
  { screen: "OTA Firmware", desc: "Secure firmware updates", detail: <>Firmware images are <DV value="Ed25519-signed" defense="Every firmware binary is signed with an Ed25519 key held by the build server. The device stores the corresponding public key in eFuse — it cannot be changed after manufacturing. Before flashing, the bootloader verifies the signature against the eFuse public key. A forged or tampered image fails verification and is rejected before any code executes." vocab={[{ term: "Ed25519", definition: "An elliptic curve digital signature algorithm using Curve25519, providing 128-bit security with 64-byte signatures and constant-time verification resistant to timing attacks." }, { term: "eFuse public key", definition: "The Ed25519 verification key burned into the ESP32-S3's one-time-programmable fuses during manufacturing, ensuring only firmware signed by the authorized build key can boot." }]} /> and delivered over WiFi (not BLE — too slow). <DV value="Dual A/B OTA slots" defense="The ESP32-S3 flash is partitioned into two equal firmware slots (A and B). New firmware is written to the inactive slot while the current slot continues running. On reboot, the bootloader tries the new slot — if it fails health checks within 30 seconds, the bootloader automatically reverts to the previous slot. This guarantees the device is never bricked by a bad update." vocab={[{ term: "A/B partitioning", definition: "A firmware update strategy using two equal flash partitions so that one always holds a known-good image, enabling automatic rollback on boot failure." }, { term: "rollback", definition: "Automatic reversion to the previously running firmware if the newly flashed image fails to boot or pass health checks within a timeout window." }]} /> with automatic rollback on boot failure. The app triggers the update check; the device handles download and verification independently.</>, specs: [{ k: "Signing", v: "Ed25519" }, { k: "Delivery", v: "WiFi, dual A/B slots" }] },
];

function CompanionApp() {
  const [expandedScreen, setExpandedScreen] = useState<string | null>(null);

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

      {/* Crypto-Shredding */}
      <H3 style={{ marginBottom: spacing.md }}>Crypto-Shredding</H3>
      <div style={{ padding: `${spacing.sm}px`, border: `1px solid ${colors.rule}`, borderRadius: radius.sm, background: `${zone.privacy}03`, marginBottom: spacing.md }}>
        <div style={{ ...typography.body, color: colors.ink2, lineHeight: 1.7 }}>
          Each tier&apos;s data-at-rest is encrypted with a per-tier AES-256-GCM key stored in
          the ESP32&apos;s eFuse-protected key block. Deleting the tier key renders all data
          unrecoverable without a full flash wipe. Cloud backups use per-user envelope encryption —
          deleting the user&apos;s KEK shreds all cloud copies.
        </div>
        <div style={{ ...typography.body, color: colors.ink2, lineHeight: 1.7, marginTop: spacing.xs }}>
          Cloud-side: Supabase Postgres encryption at rest. Per-user deletion via cascade deletes.
        </div>
      </div>

      {/* Right to Erasure */}
      <H3 style={{ marginBottom: spacing.md }}>Right to Erasure (GDPR Art. 17)</H3>
      <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.md }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
          {[
            { step: "1", label: "App \"Delete All\"", actor: "Companion App", color: zone.app },
            { step: "2", label: "Supabase CASCADE delete", actor: "Cloud", color: zone.cloud },
            { step: "3", label: "Device wipe tier_store + glyph_store", actor: "Device", color: zone.device },
            { step: "4", label: "Confirmed", actor: "Done", color: colors.help },
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
      </div>

      {/* Recording LED Indicator */}
      <H3 style={{ marginBottom: spacing.md }}>Recording LED Indicator</H3>
      <div style={{ border: `1px solid ${colors.rule}`, borderRadius: radius.sm, overflow: "hidden", marginBottom: spacing.md }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
          <StatusBadge label="Hardwired" tone="harm" filled style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ ...typography.stat, fontWeight: weights.medium, color: colors.ink }}>Recording LED</div>
            <div style={{ ...typography.body, color: colors.ink3, marginTop: 2 }}>Wired in series with INMP441 VCC — physically impossible for mic to be on without LED illuminating. No firmware control.</div>
          </div>
        </div>
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

  return (
    <Modal onClose={onClose} maxWidth={560} maxHeight="80vh" padding={28}>
      <ModalHeader eyebrow="Node Detail" title={info.title} titleSize={18} onClose={onClose} style={{ marginBottom: spacing.md }} />
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
    </Modal>
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
    description: "Always-on ambient pipeline — mic to Supabase in under 5s.",
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
      { label: "WebSocket", detail: "TLS 1.3 to Supabase", color: zone.cloud, flowLabel: "stream to cloud", expanded: <><DV value="Single persistent WebSocket" defense="One connection per device avoids the overhead of repeated TLS handshakes (each ~200ms + 2KB memory). WebSocket's bidirectional framing lets the server push Tier 1 payloads back on the same connection without polling. HTTP/2 was considered but adds head-of-line blocking complexity on the ESP32's single-stream use case." vocab={[
  { term: "TLS handshakes", definition: "The cryptographic negotiation that establishes a secure connection. Each handshake costs ~200ms and 2KB of memory — reusing one connection avoids repeating this for every message." },
  { term: "head-of-line blocking", definition: "When a single slow or lost packet stalls all other data on the same connection. HTTP/2 multiplexes streams over one TCP connection, making it vulnerable to this. WebSocket avoids it by using a single logical stream." },
]} /> connection per device to Supabase. <DV value="TLS 1.3" defense="TLS 1.3 eliminates the 1-RTT overhead of TLS 1.2 (0-RTT resumption on reconnect), reduces cipher negotiation to only secure options, and is required for mTLS certificate pinning. TLS 1.2 fallback is explicitly disabled." vocab={[
  { term: "0-RTT", definition: "Zero Round-Trip Time resumption — TLS 1.3 can resume a previous session and send encrypted data in the very first packet, eliminating the extra round-trip TLS 1.2 requires." },
  { term: "mTLS", definition: "Mutual TLS — both client and server present certificates to authenticate each other. Ensures only authorized Madie devices can connect to the cloud backend." },
  { term: "cipher negotiation", definition: "The process where client and server agree on encryption algorithms. TLS 1.3 removed all weak ciphers, so negotiation is faster and always results in a secure choice." },
]} /> with certificate pinning. Connection reuses <DV value="stored BSSID" defense="Storing the WiFi access point's BSSID in NVS skips the 802.11 scanning phase on reconnect, reducing WiFi association from ~2s to ~300ms. Critical for VAD-gated power cycling where WiFi connects/disconnects many times per day." vocab={[
  { term: "NVS", definition: "Non-Volatile Storage — a key-value store in flash memory that persists across reboots. Used here to remember the last WiFi access point so reconnection is instant." },
  { term: "802.11 scanning", definition: "The WiFi discovery phase where the radio listens on each channel for available networks. Takes ~2 seconds — skipped entirely when the BSSID (access point MAC address) is already known." },
]} /> for fast association (~300ms). Auto-reconnect with exponential backoff.</>, specs: [{ k: "Protocol", v: "WSS (TLS 1.3)" }, { k: "Association", v: "~300ms (stored BSSID)" }], sampleData: {
        scenario: "VAD detected speech 300ms ago. WiFi has associated using the stored BSSID. The WebSocket connection resumes its TLS 1.3 session (0-RTT). Opus frames begin streaming to Supabase.",
        rows: [
          { field: "Connection", type: "WebSocket", group: "Transport", example: [{ k: "Endpoint", v: "wss://api.madie.io/stream" }, { k: "TLS", v: "1.3 with 0-RTT resumption" }, { k: "Auth", v: "mTLS — device X.509 cert from NVS" }, { k: "Gateway", v: "Supabase Edge Function" }] },
          { field: "Stream", type: "Opus frames", group: "Transport", example: [{ k: "Direction", v: "device → cloud (upstream)" }, { k: "Rate", v: "~50 frames/sec (~2 KB/s)" }, { k: "Tagging", v: "frames tagged 'ambient' (not 'query')" }] },
          { field: "Return path", type: "Tier 1 payload", group: "Transport", example: [{ k: "Direction", v: "cloud → device (downstream)" }, { k: "Content", v: "Tier 1 signal from Edge Function" }, { k: "Same connection", v: "bidirectional — no separate return channel" }] },
          { field: "Buffering", type: "note", group: "Edge cases", example: [{ k: "WiFi not ready", v: "first ~15 frames buffered in PSRAM during association" }, { k: "Disconnect <5 min", v: "buffer in PSRAM (2MB ≈ 16 min)" }, { k: "Disconnect >5 min", v: "spill to flash (4MB ≈ 33 min)" }, { k: "Reconnect", v: "drain buffer at 50% bandwidth" }] },
        ],
      } },
      { label: "Edge Function", detail: "/ingest-audio", color: zone.cloud, flowLabel: "decode + analyse", expanded: <>Supabase Edge Function receives Opus frames, decodes them, and forwards to Deepgram for transcription and analysis. Handles authentication, rate limiting, and routing to downstream services.</>, specs: [{ k: "Runtime", v: "Supabase Edge Function" }, { k: "Endpoint", v: "/ingest-audio" }], sampleData: {
        scenario: "Opus frames arrive at the /ingest-audio Edge Function. It authenticates the device, decodes the audio, and fans out to Deepgram STT and analysis services.",
        rows: [
          { field: "Input", type: "Opus frames", group: "Processing", example: [{ k: "Source", v: "WebSocket from device" }, { k: "Rate", v: "~50 frames/sec (~2 KB/s)" }, { k: "Auth", v: "device JWT validated" }] },
          { field: "Routing", type: "fan-out", group: "Processing", example: [{ k: "STT", v: "forwarded to Deepgram Nova-2" }, { k: "Tagging", v: "ambient frames routed to passive pipeline" }] },
        ],
      } },
      { label: "Deepgram STT", detail: "Deepgram STT + analysis", color: zone.cloud, timing: "~800 ms", flowLabel: "structured signal", expanded: <>Streaming transcription and analysis via Deepgram Nova-2. Produces transcripts with speaker diarization, timestamps, keywords, and topics. The Edge Function collects the STT results and produces a structured Tier 1 signal ready for storage.</>, specs: [{ k: "STT", v: "Deepgram Nova-2" }, { k: "Latency", v: "~800ms" }, { k: "Output", v: "Tier 1 signal" }], sampleData: {
        scenario: "A 5-second audio segment from the meeting is processed by Deepgram. The Edge Function collects the transcript and produces a Tier 1 signal.",
        rows: [
          { field: "Deepgram STT", type: "transcript", group: "Analysis (~800ms)", example: [{ k: "Text", v: "\"We can't — the client demo is locked in\"" }, { k: "Speaker", v: "B (via diarization)" }, { k: "Timestamps", v: "2:15:04.0 → 2:15:06.8" }, { k: "Confidence", v: "0.94" }] },
          { field: "Keywords", type: "extracted", group: "Analysis (~800ms)", example: [{ k: "Event", v: "client demo" }, { k: "Temporal", v: "locked in" }] },
          { field: "Topics", type: "classified", group: "Analysis (~800ms)", example: [{ k: "work", v: "94% confidence" }, { k: "finances", v: "28% (secondary)" }] },
          { field: "Output", type: "Tier 1 signal", group: "Result", example: [{ k: "Size", v: "~2.8 KB" }, { k: "Format", v: "JSON, schema-versioned" }, { k: "Destination", v: "INSERT into tier_1_signals table" }] },
        ],
      } },
      { label: "Tier 1 Write", detail: "INSERT into tier_1_signals", color: zone.storage, expanded: <>The Edge Function writes the structured Tier 1 signal directly to the Supabase tier_1_signals table. Each row represents one analysis window with transcript, keywords, topics, and metadata. Retention is managed by Supabase — old Tier 1 data is pruned after 1 hour by a scheduled function.</>, specs: [{ k: "Table", v: "tier_1_signals" }, { k: "Retention", v: "1 hour" }, { k: "Storage", v: "Supabase Postgres" }], sampleData: {
        scenario: "The Tier 1 signal for the 2:15–2:20 PM window is written to Supabase. The Edge Function INSERTs into tier_1_signals. This is the final step of the passive capture pipeline.",
        rows: [
          { field: "Payload received", type: "Tier 1", group: "Write operation", example: [{ k: "Size", v: "~2.8 KB" }, { k: "Window", v: "2:15:04 → 2:15:09 PM" }, { k: "Source", v: "Edge Function /ingest-audio" }] },
          { field: "Write path", type: "Supabase", group: "Write operation", example: [{ k: "Table", v: "tier_1_signals" }, { k: "Method", v: "INSERT via Supabase client" }] },
          { field: "Retention", type: "timer", group: "Lifecycle", example: [{ k: "Keep for", v: "1 hour" }, { k: "Then", v: "compressed by Hourly Edge Function into Tier 2 summary" }, { k: "After compression", v: "Tier 1 rows deleted, replaced by 2-4KB Tier 2 summary" }] },
        ],
      } },
    ],
  },
  {
    id: "consult",
    title: "Active Consultation",
    description: "Button press to E-Ink display response (~2.8s).",
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
      { label: "Fetch Context", detail: "Recent T1 + today T2 + week T3 + top T4", color: zone.cloud, timing: "~10 ms", flowLabel: "context bundle", expanded: <>Queries Supabase for relevant context across all four tiers: recent Tier 1 signals from the last hour, today's Tier 2 hourly summaries, this week's Tier 3 daily digests, and the top Tier 4 long-term themes. All data is fetched in a single batched query to minimize latency.</>, specs: [{ k: "Tier 1", v: "Recent signals (last hour)" }, { k: "Tier 2", v: "Today's hourly summaries" }, { k: "Tier 3", v: "This week's daily digests" }, { k: "Tier 4", v: "Top long-term themes" }, { k: "Latency", v: "~10ms" }], sampleData: {
        scenario: 'Tuesday 2:20 PM — the user presses the consultation button during a tense meeting and asks: "Should I push back on the deadline or just go along with it?" Fetch Context gathers data from all four tiers in Supabase.',
        rows: [
          { field: "Tier 1", type: "recent signals", group: "Context gathered", example: [{ k: "Window", v: "last hour of tier_1_signals" }, { k: "Content", v: "transcripts, topics, emotional context from meeting" }] },
          { field: "Tier 2", type: "hourly summaries", group: "Context gathered", example: [{ k: "Window", v: "today's hourly summaries" }, { k: "Content", v: "morning calm, afternoon stress building" }] },
          { field: "Tier 3", type: "daily digests", group: "Context gathered", example: [{ k: "Window", v: "this week's daily digests" }, { k: "Content", v: "work pressure recurring, Speaker B tension" }] },
          { field: "Tier 4", type: "long-term themes", group: "Context gathered", example: [{ k: "Themes", v: "work_pressure, career_uncertainty, relationship_with_B" }, { k: "Selection", v: "top themes by relevance" }] },
          { field: "Total", type: "timing", group: "Performance", example: [{ k: "Latency", v: "~10ms (single batched Supabase query)" }, { k: "Size", v: "~1,400 tokens of context" }] },
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
      { label: "E-Ink Display", detail: "3 glyphs + 1 word rendered", color: zone.app, expanded: <>The 3 glyphs and 1 word are transmitted back to the device over WebSocket. The <DV value="e-ink display" defense="E-ink over OLED/LCD because: zero power to hold an image (critical for a device that displays the same content for hours), sunlight readability, and the 1-bit aesthetic aligns with the glyph system's symbolic visual language. The 200×200 resolution is the smallest that renders glyphs with sufficient detail." vocab={[
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
      { label: "Tier 1", detail: "Processed signals", color: zone.audio, timing: "1 h", flowLabel: "hourly cron", expanded: <>The richest data tier — all analysis results from the Edge Function. Retained for <DV value="1 hour" defense="1 hour balances context richness against flash wear. At ~2.5MB/hour, Tier 1 consumes ~2.5MB of the 12MB partition. Longer retention provides diminishing returns for consultation quality while accelerating flash wear cycles." vocab={[{ term: "flash wear", definition: "Flash memory degrades after repeated write/erase cycles. Minimizing unnecessary writes extends the device's physical lifespan." }, { term: "partition", definition: "A reserved section of flash memory dedicated to a specific tier's data, preventing one tier from consuming another's storage budget." }, { term: "context richness", definition: "The amount of detail preserved in a data tier. Raw signals are richest; each compression step trades detail for longer retention." }]} /> before compression. Contains transcripts, tonal scores, keywords, topics, speaker labels, environment class, ambient events, motion state, and social context.</>, specs: [{ k: "Retention", v: "1 hour" }, { k: "Location", v: "Flash (LittleFS)" }], sampleData: {
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
      { label: "Hourly Edge Fn", detail: "Supabase Edge Function + LLM", color: zone.storage, flowLabel: "summary", expanded: <>Supabase Edge Function triggered every hour. Reads the last hour of Tier 1 signals from the tier_1_signals table, sends them to an LLM to extract dominant patterns (top topics, emotional arc, key moments), and produces a Tier 2 hourly summary.</>, specs: [{ k: "Trigger", v: "Hourly cron" }, { k: "Runtime", v: "Supabase Edge Function" }], sampleData: {
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
      { label: "Daily Edge Fn", detail: "Supabase Edge Function + LLM", color: zone.storage, flowLabel: "digest", expanded: <>Supabase Edge Function triggered daily. Merges 24 hourly summaries into a single daily digest via LLM. Identifies cross-hour patterns — emotional trajectories that span the day, recurring interaction patterns, environment transition sequences.</>, specs: [{ k: "Trigger", v: "Daily cron" }, { k: "Runtime", v: "Supabase Edge Function" }, { k: "Input", v: "24 hourly summaries" }], sampleData: {
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
      { label: "Weekly Edge Fn", detail: "Theme extraction via LLM", color: zone.privacy, flowLabel: "themes", sampleData: {
        scenario: "End-of-week compression. The Theme Merger processes 7 daily digests via LLM and identifies which themes are new, reinforced, or fading. 'work_pressure' was reinforced all 5 weekdays so its decay resets. 'travel_planning' from 2 months ago received no new data and decays further.",
        rows: [
          { field: "Input size", type: "bytes", group: "Compression", example: [{ k: "Total", v: "~35KB" }, { k: "Source", v: "7 daily digests × ~5KB each" }] },
          { field: "Themes reinforced", type: "ThemeUpdate[]", group: "Theme Merger", example: [{ k: "work pressure", v: "appeared 5/5 weekdays → weight reset to 1.0" }, { k: "sleep quality", v: "appeared 4/7 days → weight reset to 1.0" }] },
          { field: "Themes created", type: "ThemeUpdate[]", group: "Theme Merger", example: [{ k: "career uncertainty", v: 'new — emerged from repeated "should I stay?" consultations' }] },
          { field: "Themes decayed", type: "ThemeUpdate[]", group: "Theme Merger", example: [{ k: "travel planning", v: "0.40 → 0.33 (no data in 8 weeks)" }, { k: "fitness routine", v: "0.25 → 0.21 (no data in 10 weeks)" }] },
          { field: "Decay weights", type: "WeightMap", group: "Theme lifecycle", example: [{ k: "work pressure", v: "1.00 — reinforced" }, { k: "career uncertainty", v: "1.00 — new" }, { k: "sleep quality", v: "0.92 — reinforced 2 wks ago" }, { k: "travel planning", v: "0.33 — fading (8 wks)" }, { k: "fitness routine", v: "0.21 — fading (10 wks)" }] },
        ],
      }, expanded: <>The most sophisticated compression step. A Supabase Edge Function feeds weekly data into the Theme Merger via LLM, which extracts long-term themes with <DV value="time-decay weighting" defense="Exponential decay with half-life of 12 weeks without reinforcement. A pattern that is never reinforced fades to 50% weight in 3 months, 25% in 6 months, and effectively zero (<1%) within 18 months. Patterns that are reinforced by new data resist decay — a recurring weekly stress trigger stays strong as long as it keeps appearing. This ensures themes drift to reflect the user's current state rather than historical averages." vocab={[{ term: "exponential decay", definition: "A weighting curve where older data loses influence over time — after one half-life, a theme carries half its original weight. Reinforced themes reset their decay clock." }, { term: "half-life", definition: "The time it takes for an unreinforced theme's weight to drop to 50%. At 12 weeks, a 3-month-old theme with no new supporting data has only 50% influence." }, { term: "reinforcement", definition: "When new weekly data contains patterns that match an existing theme, that theme's decay clock resets and its weight is restored. Persistent life patterns stay strong; transient ones fade naturally." }]} />.</>, specs: [{ k: "Runtime", v: "Supabase Edge Function" }, { k: "Themes", v: "time-decay weighted" }] },
      { label: "Tier 4", detail: "Long-term themes", color: zone.privacy, timing: "2 yr", sampleData: {
        scenario: "The user's identity model after 4 months of daily wear. This is what makes Madie personal — stress triggers learned from hundreds of hours, relationship dynamics tracked across thousands of conversations, decision habits inferred from patterns the user may not consciously recognize. Stored in Supabase, encrypted at rest.",
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

          { field: "work_pressure", type: "theme", group: "4d — Long-term Themes", example: [{ k: "Weight", v: "1.00 (reinforced this week)" }, { k: "Age", v: "14 weeks" }, { k: "Reinforced", v: "12 of last 14 weeks" }, { k: "Matches", v: "deadlines, work stress, time pressure, project anxiety" }] },
          { field: "career_uncertainty", type: "theme", group: "4d — Long-term Themes", example: [{ k: "Weight", v: "1.00 (new this week)" }, { k: "Age", v: "this week" }, { k: "Origin", v: 'repeated "should I stay?" consultations' }, { k: "Matches", v: "job changes, career direction, professional identity" }] },
          { field: "relationship_with_B", type: "theme", group: "4d — Long-term Themes", example: [{ k: "Weight", v: "0.88 (reinforced 3 weeks ago)" }, { k: "Age", v: "11 weeks" }, { k: "Matches", v: "conflict, workplace tension, power dynamics, assertiveness" }] },
          { field: "evening_recovery", type: "theme", group: "4d — Long-term Themes", example: [{ k: "Weight", v: "0.95 (reinforced last week)" }, { k: "Age", v: "9 weeks" }, { k: "Matches", v: "relaxation, decompression, self-care, alone time" }] },
          { field: "travel_planning", type: "theme", group: "4d — Long-term Themes", example: [{ k: "Weight", v: "0.33 (fading)" }, { k: "Age", v: "20 weeks" }, { k: "Stale", v: "8 weeks with no new data" }, { k: "Matches", v: "vacation, trips, adventure, time off" }, { k: "Projection", v: "will reach ~0 at 18 months if unreinforced" }] },
          { field: "fitness_routine", type: "theme", group: "4d — Long-term Themes", example: [{ k: "Weight", v: "0.21 (fading)" }, { k: "Age", v: "16 weeks" }, { k: "Stale", v: "10 weeks with no new data" }, { k: "Matches", v: "exercise, gym, running, physical health" }, { k: "Projection", v: "will drop below threshold in ~6 weeks" }] },
        ],
      }, expanded: <>The most compressed representation — <DV value="four sub-stores" defense="Separating themes into 4a (Emotional), 4b (Relational), 4c (Decision), 4d (Long-term Themes) enables per-category deletion. A user can delete their relational patterns without losing emotional history. It also allows the consultation pipeline to weight categories differently per query type." vocab={[{ term: "per-category deletion", definition: "Deleting just one category of data while leaving other categories intact. A user can remove relational patterns without losing emotional history." }, { term: "consultation pipeline", definition: "The end-to-end flow that processes a user's spoken question, searches their stored themes, and generates a glyph+word response." }]} /> of long-term themes. Stored in Supabase with <DV value="2-year rolling window" defense="2 years captures enough history for meaningful long-term pattern recognition (seasonal emotional cycles, annual relationship dynamics) while ensuring data doesn't persist indefinitely. Themes older than 2 years are automatically deleted." vocab={[{ term: "seasonal emotional cycles", definition: "Recurring mood patterns tied to time of year — such as winter low energy or summer social expansiveness — that require a full year of data to detect." }, { term: "annual relationship dynamics", definition: "How someone's social patterns shift across a year, including holiday gatherings, work-cycle rhythms, and recurring life events." }]} /> retention.</>, specs: [{ k: "Retention", v: "2-year rolling" }, { k: "Storage", v: "Supabase" }, { k: "Sub-stores", v: "4a-4d" }] },
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
  { key: "cloud", label: "Supabase" },
  { key: "tiers", label: "Tiers" },
  { key: "app", label: "Companion App" },
  { key: "privacy", label: "Privacy" },
] as const;

export default function ArchitectureV5Page() {
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
          progressive tiers on Supabase, and responds to consultations with 3 glyphs and 1 word on an E-Ink display.
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
        <MiniStat label="Cloud Services" value="1" />
        <MiniStat label="Platform" value="Supabase" />
        <MiniStat label="Consultation Latency" value="~2.8s" />
        <MiniStat label="Battery" value="~6–12h" />
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
        {tab === "app" && <CompanionApp />}
        {tab === "privacy" && <PrivacyLifecycle />}
      </div>
    </div>
  );
}
