"use client";

import Link from "next/link";
import { colors, fonts, weights, spacing, typography } from "./tokens";
import {
  Title,
  Eyebrow,
  H2,
  Body,
  Italic,
  Card,
  StatPair,
  Label,
  ContentDivider,
  InteractiveCard,
  MiniStat,
  Swatch,
  FrictionTrack,
  Rule,
} from "./components";
import { mod } from "./brief-tokens";

const PAGE_LINKS = [
  {
    href: "/brief/philosophy",
    label: "Philosophy",
    color: mod.privacy,
    desc: "Restraint AI, cognitive offloading, friction design, and what Nara is not.",
  },
  {
    href: "/architecture",
    label: "Architecture",
    color: mod.audio,
    desc: "Interactive system diagram, device hardware, cloud pipeline, compression tiers, and privacy lifecycle.",
  },
  {
    href: "/brief/sensing",
    label: "Sensing",
    color: mod.cloud,
    desc: "Audio capture, voice activity detection, and six cloud analyzers.",
  },
  {
    href: "/brief/intelligence",
    label: "Intelligence",
    color: mod.compress,
    desc: "Memory compression, consultation pipeline, and the glyph narrative system.",
  },
  {
    href: "/brief/platform",
    label: "Platform",
    color: mod.companion,
    desc: "Companion app, social exchange, privacy architecture, and ESP32-S3 hardware.",
  },
  {
    href: "/brief/status",
    label: "Status",
    color: mod.questions,
    desc: "Open questions across hardware, firmware, cloud, glyph design, and privacy.",
  },
];

export default function BriefIntro() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: `${spacing.xxl}px ${spacing.lg}px` }}>
      {/* ── Hook ── */}
      <div style={{ textAlign: "center", marginBottom: spacing.xxl, paddingTop: spacing.xl }}>
        <Eyebrow>Project Nara</Eyebrow>
        <Title>Restraint AI</Title>
        <Body style={{ marginTop: spacing.lg, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          <Italic>
            What if the most useful thing AI could do is not answer your question, but redirect your attention?
          </Italic>
        </Body>
      </div>

      <ContentDivider />

      {/* ── What It Is ── */}
      <div style={{ marginBottom: spacing.xxl }}>
        <Eyebrow>The Device</Eyebrow>
        <H2>A Portable Context Engine</H2>
        <Body style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
          Nara is a palm-sized bag charm that passively captures ambient audio, compresses it through five layers of memory, and when consulted, responds with three glyphs and one word. No chat. No feed. No sycophancy.
        </Body>
        <Card>
          <StatPair label="Form Factor" value="Bag charm" />
          <StatPair label="Display" value="200\u00d7200 E-Ink" />
          <StatPair label="Output" value="3 glyphs + 1 word" />
          <StatPair label="Response Time" value="2.8 seconds" />
          <StatPair label="Battery" value="~8 hours" />
          <StatPair label="Microphone" value="Always-on (hardwired LED)" />
        </Card>
      </div>

      <Rule />

      {/* ── Core Idea ── */}
      <div style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
        <Eyebrow>Core Idea</Eyebrow>
        <H2>Friction as a Feature</H2>
        <Body style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
          People are outsourcing personal decisions to sycophantic chatbots. Nara adds deliberate friction — ambiguous symbols that redirect attention instead of prescribing answers. The user does the thinking, not the AI.
        </Body>
        <FrictionTrack
          leftLabel="AI dependency"
          centerLabel="Symbolic friction"
          rightLabel="Human agency"
          leftColor="rgba(192,57,43,0.32)"
          rightColor="rgba(26,107,69,0.32)"
        />
      </div>

      <Rule />

      {/* ── Explore ── */}
      <div style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
        <Eyebrow>Explore</Eyebrow>
        <H2>Dive Deeper</H2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm, marginTop: spacing.lg }}>
          {PAGE_LINKS.map((p) => (
            <Link key={p.href} href={p.href} style={{ textDecoration: "none", color: "inherit" }}>
              <InteractiveCard
                isActive={false}
                activeColor={p.color}
                padding={`${spacing.md}px`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs }}>
                  <Swatch color={p.color} size={8} />
                  <Label style={{ color: p.color, marginBottom: 0 }}>{p.label}</Label>
                </div>
                <Body>{p.desc}</Body>
              </InteractiveCard>
            </Link>
          ))}
        </div>
      </div>

      <Rule />

      {/* ── Key Numbers ── */}
      <div style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <Eyebrow>By the Numbers</Eyebrow>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: spacing.md,
          marginTop: spacing.lg,
        }}>
          <MiniStat label="Battery Life" value="~8h" />
          <MiniStat label="Microphone" value="Always-on" />
          <MiniStat label="Memory Tiers" value="5" />
          <MiniStat label="Cloud Analyzers" value="6" />
          <MiniStat label="Glyph Inventory" value="22" />
          <MiniStat label="Response Time" value="2.8s" />
          <MiniStat label="Encryption" value="AES-256" />
          <MiniStat label="Compliance" value="GDPR" />
        </div>
      </div>
    </div>
  );
}
