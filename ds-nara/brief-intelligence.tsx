"use client";

import { useState } from "react";
import { colors, fonts, spacing } from "./tokens";
import {
  H2,
  H3,
  Body,
  Caption,
  Italic,
  Card,
  StatPair,
  Label,
  ContentDivider,
  SectionHeader,
  Rule,
  StatusBadge,
  MiniStat,
  GaugeBar,
  Tag,
  TagRow,
  KeyValueTable,
  TensionGrid,
  FrictionTrack,
  NavButtons,
  ProgressDots,
  SlideCarousel,
  Legend,
} from "./components";
import { mod } from "./brief-tokens";
import { FlowArrow, NodeBox } from "./brief-shared";
import { BriefSidebar, useSidebarObserver } from "./brief-nav";

const SIDEBAR_SECTIONS = [
  { id: "tiers", label: "Memory Tiers", color: mod.compress },
  { id: "cascade", label: "Compression Cascade", color: mod.compress },
  { id: "consultation", label: "Consultation Steps", color: mod.consult },
  { id: "latency", label: "Latency Budget", color: mod.consult },
  { id: "glyph-system", label: "Glyph System", color: mod.glyph },
  { id: "glyph-lifecycle", label: "Inventory & Lifecycle", color: mod.glyph },
  { id: "relevance", label: "Relevance Scoring", color: mod.glyph },
];

export default function BriefIntelligence() {
  const activeSection = useSidebarObserver(SIDEBAR_SECTIONS.map((s) => s.id));
  const [currentTier, setCurrentTier] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const tierLabels = [
    "Tier 0 — Raw Audio",
    "Tier 1 — Processed",
    "Tier 2 — Hourly",
    "Tier 3 — Daily",
    "Tier 4 — Long-Term",
  ];

  const tierColors = Array(5).fill(mod.compress);

  const stepLabels = [
    "Button Press", "Query STT", "Embedding", "Semantic Search",
    "Context Assembly", "Deep Reasoner", "Glyph Picker", "Validation & Display",
  ];
  const stepColors = Array(8).fill(mod.consult);

  const steps = [
    { title: "Button Press", body: "GPIO 2 interrupt triggers the consultation flow. 50ms debounce filter prevents spurious activations.", latency: "~0ms" },
    { title: "Query STT", body: "Deepgram Nova-2 performs speech-to-text conversion. Audio encoded as Opus, streamed to cloud for transcription.", latency: "~800ms" },
    { title: "Embedding", body: "E5-small-v2 generates a 384-dimensional vector from the transcribed query for semantic matching.", latency: "~50ms" },
    { title: "Semantic Search", body: "Qdrant HNSW index searches stored themes for top-k nearest neighbors to the query embedding.", latency: "~20ms" },
    { title: "Context Assembly", body: "Template concatenation merges retrieved context from Tiers 1-4 into a structured prompt.", latency: "~10ms" },
    { title: "Deep Reasoner", body: "OpenAI/Claude performs full reasoning over assembled context. This response is never shown to the user directly.", latency: "~1500ms" },
    { title: "Glyph Picker", body: "Haiku-class LLM selects 3 glyphs and 1 word from the deep reasoner output. Constrained to the 22-glyph inventory.", latency: "~400ms" },
    { title: "Validation & Display", body: "Rule constraints validated, E-Ink display renders the glyph sequence, and haptic motor provides tactile confirmation.", latency: "~5ms" },
  ];

  const latencyBudget = [
    { label: "Query STT", ms: 800, value: 29 },
    { label: "Deep Reasoner", ms: 1500, value: 54 },
    { label: "Glyph Picker", ms: 400, value: 14 },
    { label: "Embedding", ms: 50, value: 2 },
    { label: "Semantic Search", ms: 20, value: 1 },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: spacing.lg }}>
      <BriefSidebar sections={SIDEBAR_SECTIONS} activeSection={activeSection} />

      <div style={{ maxWidth: 760, padding: `${spacing.lg}px 0` }}>
        {/* ── Module 3: Context Compression Pipeline ── */}
        <SectionHeader label="Module 03" color={mod.compress} />
        <H2 style={{ color: mod.compress, marginBottom: spacing.md }}>
          Context Compression Pipeline
        </H2>

        <Body style={{ marginBottom: spacing.lg }}>
          Transforms a continuous stream of environmental signals into increasingly abstract representations. Five tiers form a temporal hierarchy: raw buffered audio at the bottom, long-term identity patterns at the top.
        </Body>

        <section id="tiers">
          <ProgressDots
            total={5}
            current={currentTier}
            onChange={setCurrentTier}
            labels={tierLabels}
            colors={tierColors}
          />

          <SlideCarousel current={currentTier} minHeight={280}>
            <Card>
              <Label color={mod.compress}>Tier 0</Label>
              <H3 style={{ marginBottom: spacing.xs }}>Raw Audio Buffer</H3>
              <Body style={{ marginBottom: spacing.sm }}>64KB PSRAM ring buffer with 2-second rolling capacity.</Body>
              <KeyValueTable rows={[
                { label: "Storage", value: "PSRAM" },
                { label: "Size", value: "64KB" },
                { label: "Duration", value: "~2s" },
                { label: "Format", value: "16-bit PCM" },
              ]} />
            </Card>
            <Card>
              <Label color={mod.compress}>Tier 1</Label>
              <H3 style={{ marginBottom: spacing.xs }}>Processed Signals</H3>
              <Body style={{ marginBottom: spacing.sm }}>1 hour retention window, 50-150KB structured data.</Body>
              <KeyValueTable rows={[
                { label: "Storage", value: "Flash" },
                { label: "Retention", value: "1 hour" },
                { label: "Size", value: "50-150KB" },
                { label: "Fields", value: "transcript + emotions + scene + motion + speakers" },
              ]} />
            </Card>
            <Card>
              <Label color={mod.compress}>Tier 2</Label>
              <H3 style={{ marginBottom: spacing.xs }}>Hourly Summaries</H3>
              <Body style={{ marginBottom: spacing.sm }}>24 hours retention, 2-4KB per summary.</Body>
              <KeyValueTable rows={[
                { label: "Storage", value: "Flash" },
                { label: "Retention", value: "24 hours" },
                { label: "Size", value: "2-4KB/summary" },
                { label: "Contains", value: "topics + emotional arc + key moments" },
              ]} />
            </Card>
            <Card>
              <Label color={mod.compress}>Tier 3</Label>
              <H3 style={{ marginBottom: spacing.xs }}>Daily Digests</H3>
              <Body style={{ marginBottom: spacing.sm }}>7 days retention, 3-6KB per digest.</Body>
              <KeyValueTable rows={[
                { label: "Storage", value: "Flash" },
                { label: "Retention", value: "7 days" },
                { label: "Size", value: "3-6KB/digest" },
                { label: "Contains", value: "themes + interactions + activity" },
              ]} />
            </Card>
            <Card>
              <Label color={mod.compress}>Tier 4</Label>
              <H3 style={{ marginBottom: spacing.xs }}>Long-Term Themes</H3>
              <Body style={{ marginBottom: spacing.sm }}>Permanent storage with 2-year decay, 75-250KB encrypted.</Body>
              <KeyValueTable rows={[
                { label: "Storage", value: "Flash (encrypted)" },
                { label: "Retention", value: "Permanent" },
                { label: "Size", value: "75-250KB" },
                { label: "Sub-models", value: "Emotional + Relational + Decision + Embeddings" },
              ]} />
            </Card>
          </SlideCarousel>

          <NavButtons
            current={currentTier}
            total={5}
            onBack={() => setCurrentTier((p) => Math.max(0, p - 1))}
            onNext={() => setCurrentTier((p) => (p >= 4 ? 0 : p + 1))}
            endLabel="Start over"
          />
        </section>

        <section id="cascade">
          <ContentDivider style={{ marginTop: spacing.xl }} />
          <Label color={mod.compress} style={{ marginBottom: spacing.sm }}>COMPRESSION CASCADE</Label>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, marginTop: spacing.md, marginBottom: spacing.lg }}>
            <NodeBox label="Tier 1 — Processed Signals" sublabel="50-150KB" color={mod.compress} />
            <FlowArrow direction="down" color={mod.compress} />
            <NodeBox label="Hourly Compressor" sublabel="50-150KB → 2-4KB" color={mod.compress} dashed />
            <FlowArrow direction="down" color={mod.compress} />
            <NodeBox label="Tier 2 — Hourly Summaries" sublabel="2-4KB each" color={mod.compress} />
            <FlowArrow direction="down" color={mod.compress} />
            <NodeBox label="Daily Compressor" color={mod.compress} dashed />
            <FlowArrow direction="down" color={mod.compress} />
            <NodeBox label="Tier 3 — Daily Digests" sublabel="3-6KB each" color={mod.compress} />
            <FlowArrow direction="down" color={mod.compress} />
            <NodeBox label="Weekly Compressor" color={mod.compress} dashed />
            <FlowArrow direction="down" color={mod.compress} />
            <NodeBox label="Theme Merger" color={mod.compress} dashed />
            <FlowArrow direction="down" color={mod.compress} />
            <NodeBox label="Tier 4 — Long-Term Themes" sublabel="75-250KB" color={mod.compress} />
          </div>

          <Label color={mod.compress} style={{ marginBottom: spacing.sm }}>COMPRESSION RATIOS</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm, marginBottom: spacing.lg }}>
            <div>
              <Caption style={{ marginBottom: spacing.xxs }}>Hourly: 50-150KB to 2-4KB (~97% reduction)</Caption>
              <GaugeBar value={97} color={mod.compress} />
            </div>
            <div>
              <Caption style={{ marginBottom: spacing.xxs }}>Daily: 48-96KB to 3-6KB (~94% reduction)</Caption>
              <GaugeBar value={94} color={mod.compress} />
            </div>
            <div>
              <Caption style={{ marginBottom: spacing.xxs }}>Weekly: 21-42KB to theme deltas (~85% reduction)</Caption>
              <GaugeBar value={85} color={mod.compress} />
            </div>
          </div>

          <FrictionTrack
            leftLabel="Raw Audio"
            centerLabel="Compression Cascade"
            rightLabel="Identity Themes"
            leftColor={`${mod.compress}52`}
            rightColor={`${mod.compress}32`}
            markerColor={mod.compress}
          />
        </section>

        <div style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}><Rule /></div>

        {/* ── Module 4: Consultation Pipeline ── */}
        <SectionHeader label="Module 04" color={mod.consult} />
        <H2 style={{ color: mod.consult, marginBottom: spacing.md }}>
          Consultation Pipeline
        </H2>

        <Body style={{ marginBottom: spacing.lg }}>
          The only user-initiated flow. Every other pipeline runs autonomously. This starts with a deliberate act: you press a button and asks a question. 3 glyphs + 1 word within 2.8 seconds.
        </Body>

        <section id="consultation">
          <ProgressDots total={8} current={currentStep} onChange={setCurrentStep} labels={stepLabels} colors={stepColors} />

          <SlideCarousel current={currentStep} minHeight={200}>
            {steps.map((step, i) => (
              <Card key={step.title}>
                <Label color={mod.consult}>Step {i}</Label>
                <H3 style={{ marginBottom: spacing.xs }}>{step.title}</H3>
                <Body style={{ marginBottom: spacing.sm }}>{step.body}</Body>
                <StatPair label="Latency" value={step.latency} valueColor={mod.consult} />
              </Card>
            ))}
          </SlideCarousel>

          <NavButtons
            current={currentStep}
            total={8}
            onBack={() => setCurrentStep((p) => Math.max(0, p - 1))}
            onNext={() => setCurrentStep((p) => (p >= 7 ? 0 : p + 1))}
            endLabel="Start over"
          />
        </section>

        <section id="latency">
          <ContentDivider style={{ marginTop: spacing.xl }} />
          <Label color={mod.consult} style={{ marginBottom: spacing.sm }}>LATENCY BUDGET</Label>

          <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md }}>
            {latencyBudget.map((item) => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.xxs }}>
                  <Caption>{item.label}</Caption>
                  <Caption style={{ color: mod.consult }}>{item.ms}ms</Caption>
                </div>
                <GaugeBar value={item.value} color={mod.consult} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.lg }}>
            <MiniStat label="Total Budget" value="~2.8s" valueColor={mod.consult} />
            <StatusBadge tone="help" label="Within Target" />
          </div>

          <TensionGrid
            left={{ label: "Visual Output", text: "3 glyphs as narrative arc (setup → tension → resolution) + 1 word" }}
            right={{ label: "Haptic Feedback", text: "Single tap on press (50ms), double pulse on response (80-40-80ms)" }}
          />
        </section>

        <div style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}><Rule /></div>

        {/* ── Module 5: Glyph System ── */}
        <SectionHeader label="Module 05" color={mod.glyph} />
        <H2 style={{ color: mod.glyph }}>Glyph System</H2>

        <section id="glyph-system">
          <Body>
            <Italic>
              Nara is not an oracle. Its entire output paradigm is built around symbolic nudging: three glyphs and one word, delivered to a 200×200 E-Ink display. The glyphs are a Rorschach test anchored loosely to the user{"'"}s context.
            </Italic>
          </Body>

          <H3 style={{ marginTop: spacing.lg }}>Narrative Arc</H3>
          <FrictionTrack leftLabel="Setup" centerLabel="Tension" rightLabel="Resolution" leftColor={mod.glyph} rightColor={mod.glyph} />
          <Body style={{ marginTop: spacing.md }}>
            Three glyphs ordered as a narrative arc, composed in real time by a Haiku-class LLM. The single closing word acts as tonal punctuation.
          </Body>

          <H3 style={{ marginTop: spacing.lg }}>Example Glyph</H3>
          <Card>
            <Label color={mod.glyph}>glyph_shoreline_004</Label>
            <TagRow>
              <Tag variant="neutral">boundary</Tag>
              <Tag variant="neutral">transition</Tag>
              <Tag variant="neutral">threshold</Tag>
              <Tag variant="help">contemplative</Tag>
              <Tag variant="help">liminal</Tag>
              <Tag variant="help">calm</Tag>
            </TagRow>
            <Body style={{ marginTop: spacing.sm, whiteSpace: "pre-line" }}>
              {"\u2022"} Standing at the edge of a decision{"\n"}
              {"\u2022"} The space between what was and what comes next{"\n"}
              {"\u2022"} Finding stillness in movement
            </Body>
            <ContentDivider />
            <StatPair label="Relevance Score" value="0.73" />
            <StatPair label="Selection Count" value="14" />
          </Card>
        </section>

        <section id="glyph-lifecycle">
          <H3 style={{ marginTop: spacing.lg }}>Inventory & Lifecycle</H3>
          <Card>
            <StatPair label="Inventory Size" value="22 glyphs (constant)" />
            <StatPair label="Weekly Turnover" value="2-3 replacements (~12%)" />
            <StatPair label="Min Lifespan" value="1 week (spaced repetition)" />
            <StatPair label="Avg Lifespan" value="8-11 weeks" />
            <StatPair label="Storage" value="256KB flash partition" />
            <StatPair label="Image Format" value="200×200 1-bit PBM (~5KB)" />
          </Card>
        </section>

        <section id="relevance">
          <H3 style={{ marginTop: spacing.lg }}>Relevance Scoring</H3>
          <Card>
            <Caption style={{ fontFamily: fonts.mono, display: "block", marginBottom: spacing.sm }}>
              relevance(glyph, t) = base_score × exp(-λ × weeks_since_creation)
            </Caption>
            <Body>
              Half-life ≈ 6 weeks. base_score combines theme_proximity (cosine similarity to Tier 4), emotional_coverage (tag overlap), and semantic_breadth (Shannon entropy of interpretation embeddings).
            </Body>
          </Card>
          <div style={{ marginTop: spacing.md }}>
            <Legend items={[
              { label: "Theme Proximity", color: mod.glyph },
              { label: "Emotional Coverage", color: colors.amber },
              { label: "Semantic Breadth", color: colors.help },
            ]} />
          </div>
        </section>
      </div>
    </div>
  );
}
