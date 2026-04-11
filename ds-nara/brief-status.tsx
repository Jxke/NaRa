"use client";

import { useState } from "react";
import { spacing } from "./tokens";
import {
  H2,
  Body,
  Card,
  SectionHeader,
  FilterPills,
  MiniStat,
  Collapsible,
  Tag,
} from "./components";
import { mod } from "./brief-tokens";
import { BriefSidebar, useSidebarObserver } from "./brief-nav";

const SIDEBAR_SECTIONS = [
  { id: "overview", label: "Overview", color: mod.questions },
  { id: "hardware-q", label: "Hardware", color: mod.questions },
  { id: "firmware-q", label: "Firmware", color: mod.questions },
  { id: "cloud-q", label: "Cloud", color: mod.questions },
  { id: "glyph-q", label: "Glyph", color: mod.questions },
  { id: "privacy-q", label: "Privacy", color: mod.questions },
];

const QUESTIONS: Record<string, { text: string; priority: "amber" | "neutral" }[]> = {
  Hardware: [
    { text: "Actual SNR of INMP441 in target enclosure?", priority: "amber" },
    { text: "LED color and brightness for recording indicator?", priority: "amber" },
    { text: "Self-test mechanism for burned-out LED?", priority: "neutral" },
    { text: "Minimum brightness for outdoor visibility?", priority: "amber" },
  ],
  Firmware: [
    { text: "DC offset removal filter before ring buffer?", priority: "neutral" },
    { text: "Lock-free SPSC vs FreeRTOS stream buffer?", priority: "neutral" },
    { text: "Is 500ms pre-roll sufficient?", priority: "amber" },
    { text: "ESP-SR false-positive rate in real environments?", priority: "amber" },
    { text: "Light sleep between VAD frames (~80mA \u2192 ~20mA)?", priority: "amber" },
    { text: "Optimal WiFi hold-off timer duration?", priority: "neutral" },
    { text: "Opus SILK vs CELT vs hybrid mode?", priority: "neutral" },
    { text: "CPU utilization of Opus on Core 1?", priority: "neutral" },
  ],
  Cloud: [
    { text: "Optimal Deepgram model for expected audio quality?", priority: "neutral" },
  ],
  Glyph: [
    { text: "Custom image generation model architecture?", priority: "amber" },
    { text: "Diversity constraints beyond pairwise cosine sim?", priority: "neutral" },
    { text: "Cross-cultural interpretation of default 22?", priority: "amber" },
    { text: "Selection count feedback loop mitigation?", priority: "neutral" },
  ],
  Privacy: [
    { text: "Audible bystander notification for v2?", priority: "amber" },
    { text: "Hardware secure element (ATECC608B) for v2?", priority: "neutral" },
  ],
};

export default function BriefStatus() {
  const activeSection = useSidebarObserver(SIDEBAR_SECTIONS.map((s) => s.id));
  const [filter, setFilter] = useState<string | null>(null);

  const categories = Object.keys(QUESTIONS);
  const totalCount = Object.values(QUESTIONS).reduce((sum, qs) => sum + qs.length, 0);
  const filteredCategories = !filter ? categories : categories.filter((c) => c === filter);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: spacing.lg }}>
      <BriefSidebar sections={SIDEBAR_SECTIONS} activeSection={activeSection} />

      <div style={{ maxWidth: 760, padding: `${spacing.lg}px 0` }}>
        <SectionHeader label="Module 09" color={mod.questions} />
        <H2 style={{ color: mod.questions }}>Open Questions & Deferred Items</H2>

        <section id="overview">
          <Body style={{ marginBottom: spacing.md }}>
            Unresolved questions and deferred decisions consolidated from all modules.
          </Body>

          <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap", marginBottom: spacing.lg }}>
            <MiniStat label="Total" value={String(totalCount)} />
            {categories.map((cat) => (
              <MiniStat key={cat} label={cat} value={String(QUESTIONS[cat].length)} />
            ))}
          </div>

          <FilterPills
            options={["All", ...categories]}
            value={filter}
            onChange={setFilter}
            allLabel="All"
          />
        </section>

        <div style={{ marginTop: spacing.md }}>
          {filteredCategories.map((cat) => (
            <section key={cat} id={`${cat.toLowerCase()}-q`}>
              <Collapsible title={cat} count={QUESTIONS[cat].length} defaultOpen={!!filter}>
                <div style={{ display: "flex", flexDirection: "column", gap: spacing.xs, padding: `${spacing.xs}px ${spacing.md}px` }}>
                  {QUESTIONS[cat].map((q) => (
                    <Card key={q.text}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
                        <Body>{q.text}</Body>
                        <Tag variant={q.priority}>{q.priority === "amber" ? "Key" : "Open"}</Tag>
                      </div>
                    </Card>
                  ))}
                </div>
              </Collapsible>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
