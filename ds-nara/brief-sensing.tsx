"use client";

import { colors, spacing } from "./tokens";
import {
  H2,
  H3,
  Body,
  Caption,
  Card,
  StatPair,
  Label,
  SectionHeader,
  Rule,
  StatusBadge,
  MiniStat,
  Collapsible,
  GaugeBar,
  Tag,
  KeyValueTable,
} from "./components";
import { mod } from "./brief-tokens";
import { FlowArrow, NodeBox } from "./brief-shared";
import { BriefSidebar, useSidebarObserver } from "./brief-nav";

const SIDEBAR_SECTIONS = [
  { id: "signal-path", label: "Signal Path", color: mod.audio },
  { id: "inmp441", label: "INMP441 Specs", color: mod.audio },
  { id: "ring-buffer", label: "Ring Buffer", color: mod.audio },
  { id: "vad-power", label: "VAD Power", color: mod.audio },
  { id: "recording-led", label: "Recording LED", color: mod.audio },
  { id: "gateway", label: "API Gateway", color: mod.cloud },
  { id: "analyzers", label: "Analyzers", color: mod.cloud },
  { id: "aggregator", label: "Aggregator", color: mod.cloud },
];

export default function BriefSensing() {
  const activeSection = useSidebarObserver(SIDEBAR_SECTIONS.map((s) => s.id));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: spacing.lg }}>
      <BriefSidebar sections={SIDEBAR_SECTIONS} activeSection={activeSection} />

      <div style={{ maxWidth: 760, padding: `${spacing.lg}px 0` }}>
        {/* ── Module 1: Audio Capture & VAD ── */}
        <SectionHeader label="Module 01" color={mod.audio} />
        <H2 style={{ color: mod.audio }}>Audio Capture & VAD</H2>
        <Body style={{ marginBottom: spacing.lg }}>
          The sensory front door. Converts ambient sound into a compressed, VAD-gated Opus stream. Every other pipeline depends on the fidelity and power efficiency of this module.
        </Body>

        <section id="signal-path">
          <Label style={{ marginBottom: spacing.sm, color: colors.ink3 }}>SIGNAL PATH</Label>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: spacing.xxs, marginBottom: spacing.lg }}>
            <NodeBox label="INMP441" sublabel="I2S DMA" color={mod.audio} />
            <FlowArrow direction="right" color={mod.audio} />
            <NodeBox label="PSRAM Ring Buffer" sublabel="64 KB, 2 s" color={mod.audio} />
            <FlowArrow direction="right" color={mod.audio} />
            <NodeBox label="ESP-SR WakeNet" sublabel="Core 0" color={mod.audio} />
            <FlowArrow direction="right" color={mod.audio} />
            <NodeBox label="Opus Encoder" sublabel="16 kbps" color={mod.audio} />
            <FlowArrow direction="right" color={mod.audio} />
            <NodeBox label="Cloud" sublabel="Fan-out" color={mod.cloud} dashed />
          </div>
        </section>

        <section id="inmp441">
          <Label style={{ marginBottom: spacing.sm, color: colors.ink3 }}>INMP441 SPECIFICATIONS</Label>
          <KeyValueTable
            monoValues
            rows={[
              { label: "Interface", value: "I2S" },
              { label: "Sample Rate", value: "16 kHz" },
              { label: "Bit Depth", value: "16-bit" },
              { label: "Data Rate", value: "256 kbps" },
              { label: "Power", value: "~2 mA" },
            ]}
            style={{ marginBottom: spacing.lg }}
          />
        </section>

        <section id="ring-buffer">
          <Card style={{ marginBottom: spacing.md }}>
            <Label style={{ marginBottom: spacing.sm, color: mod.audio }}>RING BUFFER</Label>
            <StatPair label="Size" value="64 KB" valueColor={mod.audio} />
            <StatPair label="Capacity" value="~2 seconds" valueColor={mod.audio} />
            <StatPair label="Pre-roll" value="500 ms" valueColor={mod.audio} />
          </Card>
        </section>

        <section id="vad-power">
          <Card style={{ marginBottom: spacing.md }}>
            <Label style={{ marginBottom: spacing.sm, color: mod.audio }}>VAD POWER STRATEGY</Label>
            <div style={{ marginBottom: spacing.xs }}>
              <Caption style={{ color: colors.ink3 }}>Idle — ~80 mA</Caption>
              <GaugeBar value={47} color={mod.audio} style={{ marginTop: spacing.xxs }} />
            </div>
            <div>
              <Caption style={{ color: colors.ink3 }}>Active — ~180 mA</Caption>
              <GaugeBar value={100} color={mod.audio} style={{ marginTop: spacing.xxs }} />
            </div>
          </Card>
        </section>

        <section id="recording-led">
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs }}>
              <Label style={{ color: mod.audio }}>RECORDING LED</Label>
              <StatusBadge tone="help" label="Hardwired" />
            </div>
            <Body>
              The recording indicator LED is hardwired to the microphone power rail. It cannot be disabled in software, providing an unforgeable hardware guarantee that the user always knows when audio is being captured.
            </Body>
          </Card>
        </section>

        <div style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}><Rule /></div>

        {/* ── Module 2: Cloud Analysis Pipeline ── */}
        <SectionHeader label="Module 02" color={mod.cloud} />
        <H2 style={{ color: mod.cloud }}>Cloud Analysis Pipeline</H2>
        <Body style={{ marginBottom: spacing.lg }}>
          Real-time audio analysis. The device sends one Opus stream; the cloud fans it out to six parallel analyzers, merges results, and returns a unified Tier 1 payload within 5 seconds.
        </Body>

        <section id="gateway">
          <H3 style={{ color: mod.cloud }}>API Gateway</H3>
          <KeyValueTable
            monoValues
            rows={[
              { label: "Software", value: "Kong" },
              { label: "TLS", value: "1.3 mTLS" },
              { label: "Auth", value: "X.509 client cert" },
              { label: "Latency", value: "<5 ms" },
            ]}
            style={{ marginBottom: spacing.lg }}
          />
        </section>

        <section id="analyzers">
          <H3 style={{ color: mod.cloud }}>Six Parallel Analyzers</H3>
          <Body style={{ marginBottom: spacing.md }}>
            NATS JetStream fans the single audio stream to three parallel consumer groups. Three analyzers run off STT output sequentially.
          </Body>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm, marginBottom: spacing.lg }}>
            <Collapsible title="Deepgram STT" defaultOpen={false}>
              <div style={{ padding: `${spacing.xs}px ${spacing.md}px ${spacing.sm}px` }}>
                <Tag variant="help">Nova-2</Tag>
                <MiniStat label="Latency" value="~800 ms" valueColor={mod.cloud} style={{ marginTop: spacing.xs }} />
                <Body style={{ marginTop: spacing.xs }}>Transcript with word-level timestamps.</Body>
              </div>
            </Collapsible>
            <Collapsible title="wav2vec2-emotion" defaultOpen={false}>
              <div style={{ padding: `${spacing.xs}px ${spacing.md}px ${spacing.sm}px` }}>
                <Tag variant="neutral">Tonal</Tag>
                <MiniStat label="Latency" value="<500 ms" valueColor={mod.cloud} style={{ marginTop: spacing.xs }} />
                <Body style={{ marginTop: spacing.xs }}>Valence, arousal, and stress scores.</Body>
              </div>
            </Collapsible>
            <Collapsible title="YAMNet" defaultOpen={false}>
              <div style={{ padding: `${spacing.xs}px ${spacing.md}px ${spacing.sm}px` }}>
                <Tag variant="neutral">Environment</Tag>
                <MiniStat label="Latency" value="<200 ms" valueColor={mod.cloud} style={{ marginTop: spacing.xs }} />
                <Body style={{ marginTop: spacing.xs }}>Scene labels and crowd density estimation.</Body>
              </div>
            </Collapsible>
            <Collapsible title="Resemblyzer" defaultOpen={false}>
              <div style={{ padding: `${spacing.xs}px ${spacing.md}px ${spacing.sm}px` }}>
                <Tag variant="neutral">Speaker ID</Tag>
                <MiniStat label="Latency" value="<300 ms" valueColor={mod.cloud} style={{ marginTop: spacing.xs }} />
                <Body style={{ marginTop: spacing.xs }}>Anonymous speaker labels (A, B, C).</Body>
              </div>
            </Collapsible>
            <Collapsible title="spaCy NER" defaultOpen={false}>
              <div style={{ padding: `${spacing.xs}px ${spacing.md}px ${spacing.sm}px` }}>
                <Tag variant="neutral">Keywords</Tag>
                <MiniStat label="Latency" value="<200 ms" valueColor={mod.cloud} style={{ marginTop: spacing.xs }} />
                <Body style={{ marginTop: spacing.xs }}>Named entity extraction from transcript.</Body>
              </div>
            </Collapsible>
            <Collapsible title="BART-MNLI" defaultOpen={false}>
              <div style={{ padding: `${spacing.xs}px ${spacing.md}px ${spacing.sm}px` }}>
                <Tag variant="neutral">Topics</Tag>
                <MiniStat label="Latency" value="<300 ms" valueColor={mod.cloud} style={{ marginTop: spacing.xs }} />
                <Body style={{ marginTop: spacing.xs }}>Zero-shot topic classification.</Body>
              </div>
            </Collapsible>
          </div>
        </section>

        <section id="aggregator">
          <H3 style={{ color: mod.cloud }}>Aggregator</H3>
          <Card>
            <Body style={{ marginBottom: spacing.sm }}>
              A 5-second sliding window merges all six analyzer outputs into a single Tier 1 payload. The aggregator waits for all results (or timeouts) before emitting the fused context object back to the device.
            </Body>
            <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.xs }}>
              <StatusBadge tone="help" label="Deepgram" />
              <StatusBadge tone="help" label="wav2vec2" />
              <StatusBadge tone="help" label="YAMNet" />
              <StatusBadge tone="help" label="Resemblyzer" />
              <StatusBadge tone="help" label="spaCy" />
              <StatusBadge tone="help" label="BART-MNLI" />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
