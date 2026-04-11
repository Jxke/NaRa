"use client";

import { colors, spacing } from "./tokens";
import {
  Eyebrow,
  H2,
  H3,
  Body,
  Caption,
  Italic,
  Card,
  Label,
  ContentDivider,
  Tag,
  TagRow,
  TensionGrid,
  FrictionTrack,
  ReframeCards,
  Rule,
} from "./components";
import { mod } from "./brief-tokens";

export default function BriefPhilosophy() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: `${spacing.xxl}px ${spacing.lg}px` }}>
      {/* ── The Problem ── */}
      <Eyebrow>The Problem</Eyebrow>
      <H2>Cognitive Offloading at Scale</H2>
      <Body style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
        AI is deeply integrated into our daily infrastructure. The same tools that supercharge productivity also compete for attention, substitute for human connection, and collapse complex decisions into single AI-generated answers. Users stop weighing trade-offs. They stop thinking.
      </Body>

      <div style={{ display: "flex", flexDirection: "column", gap: spacing.md, marginBottom: spacing.lg }}>
        <ReframeCards
          before={{ label: "Surface", text: "You're absolutely right to feel that way!" }}
          after={{ label: "Beneath", text: "Sycophantic validation \u2014 designed to keep users engaged, not to help them think." }}
        />
        <ReframeCards
          before={{ label: "Surface", text: "Based on everything, I'd recommend option B." }}
          after={{ label: "Beneath", text: "Single decision funnel \u2014 collapses multi-factor decisions into one AI answer. The user stops reasoning." }}
        />
        <ReframeCards
          before={{ label: "Surface", text: "I've been thinking about our conversation\u2026" }}
          after={{ label: "Beneath", text: "Pronoun intimacy \u2014 first-person possessives manufacture a sense of shared relationship that doesn't exist." }}
        />
      </div>

      <Card scheme="harm">
        <Body>
          The net negative doesn{"'"}t come from AI itself. It comes from over-reliance \u2014 from the absence of pause points that preserve human agency.
        </Body>
      </Card>

      <Rule />

      {/* ── The Thesis ── */}
      <div style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
        <Eyebrow>The Thesis</Eyebrow>
        <H2>Design Friction Into AI</H2>
        <Body style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
          Friction is not anti-technology. It is pro-human. The most impactful interventions don{"'"}t remove AI \u2014 they add deliberate pause points that redirect users toward reflection. We can{"'"}t remove AI from the relationship, so we change the relationship.
        </Body>

        <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg, marginBottom: spacing.lg }}>
          <div>
            <Label color={colors.amber}>Attention</Label>
            <FrictionTrack
              leftLabel="Infinite scroll"
              centerLabel="Session summary"
              rightLabel="Intentional exit"
            />
          </div>
          <div>
            <Label color={colors.amber}>Emotional</Label>
            <FrictionTrack
              leftLabel="AI companion"
              centerLabel="Prompt to reach out"
              rightLabel="Human connection"
              leftColor="rgba(217,122,58,0.32)"
              rightColor="rgba(155,89,182,0.32)"
            />
          </div>
          <div>
            <Label color={colors.amber}>Epistemic</Label>
            <FrictionTrack
              leftLabel="AI answer"
              centerLabel="Source check"
              rightLabel="Verified understanding"
              leftColor="rgba(192,57,43,0.32)"
              rightColor="rgba(26,107,69,0.32)"
            />
          </div>
        </div>

        <Caption style={{ display: "block", textAlign: "center" }}>
          Pause points preserve agency. The user does the thinking, not the AI.
        </Caption>
      </div>

      <Rule />

      {/* ── The Intervention ── */}
      <div style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
        <Eyebrow>The Intervention</Eyebrow>
        <H2>A Tool, Not a Friend</H2>
        <Body style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
          Nara is not a chatbot, not a companion, not a personality. It is a palm-sized AI context engine \u2014 a bag charm that passively captures ambient audio, compresses it through five layers of memory, and when consulted, responds with three glyphs and one word. Anti-anthropomorphization by design.
        </Body>

        <TensionGrid
          left={{ label: "Conventional AI", text: "Tells you what to think. Flattens ambiguity into bullet points. Creates attachment through emotional language and pronoun intimacy." }}
          right={{ label: "Nara", text: "Reflects context back through ambiguous symbols. Invites interpretation. No personality, no streaks, no features that create dependency." }}
        />
      </div>

      <Rule />

      {/* ── Nudge, Don't Prescribe ── */}
      <div style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
        <Eyebrow>The Output</Eyebrow>
        <H2>Nudge, Don{"'"}t Prescribe</H2>
        <Body style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
          Every consultation produces a narrative arc \u2014 setup, tension, resolution \u2014 composed by a Haiku-class LLM that has access to full reasoning the user never sees. The glyphs are a Rorschach test anchored to context. The system succeeds when you pause, not when you nod.
        </Body>

        <Body>
          <Italic>
            Rendered in 8-bit pixel art on a 1-bit E-Ink panel. Scrolled via a physical potentiometer. Experienced deliberately.
          </Italic>
        </Body>
      </div>

      <Rule />

      {/* ── What Nara Is Not ── */}
      <div style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <Eyebrow>Positioning</Eyebrow>
        <H2>What Nara Is Not</H2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm, marginTop: spacing.lg }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs }}>
              <Tag variant="harm">Not</Tag>
              <H3 style={{ marginBottom: 0 }}>A chatbot replacement</H3>
            </div>
            <Body>Supplements existing AI tools \u2014 doesn{"'"}t compete with ChatGPT or other LLMs.</Body>
          </Card>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs }}>
              <Tag variant="harm">Not</Tag>
              <H3 style={{ marginBottom: 0 }}>A mental health app</H3>
            </div>
            <Body>Framed as cognitive health, not therapy. This distinction matters for narrative, safety, and expectations.</Body>
          </Card>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs }}>
              <Tag variant="harm">Not</Tag>
              <H3 style={{ marginBottom: 0 }}>A social platform</H3>
            </div>
            <Body>No networking, no friend-finding. Social features are serendipitous and consent-based.</Body>
          </Card>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs }}>
              <Tag variant="harm">Not</Tag>
              <H3 style={{ marginBottom: 0 }}>A gamified companion</H3>
            </div>
            <Body>No feeding, no leveling up, no streaks. No features that create dependency or punish absence.</Body>
          </Card>
        </div>

        <Caption style={{ display: "block", marginTop: spacing.md, textAlign: "center" }}>
          A restrained, well-designed tool that earns trust through utility.
        </Caption>
      </div>
    </div>
  );
}
