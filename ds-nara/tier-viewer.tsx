"use client";

import { useState, useEffect, useCallback } from "react";
import { colors, fonts, weights, spacing, borders, typography } from "./tokens";
import { zone } from "./architecture-tokens";

const SUPABASE_URL = "https://tsblsjjlrjnllsqyusmb.supabase.co";
// Service role key — bypasses RLS for internal dev dashboard.
// DO NOT expose this in a user-facing app. This cockpit is local dev only.
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzYmxzampscmpubGxzcXl1c21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY3NjY2NywiZXhwIjoyMDkxMjUyNjY3fQ.ZfyFpDlJcHJ-3k8IC80h_PuBPErQ20ONuRG22rcpcm0";

const DEVICE_ID = "a0000000-0000-0000-0000-000000000001";

interface T1Signal {
  id: number;
  transcript: string | null;
  keywords: string[] | null;
  topics: string[] | null;
  emotional_valence: string | null;
  arousal: number | null;
  environment_class: string | null;
  ambient_events: string[] | null;
  motion_state: string | null;
  created_at: string;
}

interface T2Daily {
  id: number;
  date: string;
  dominant_topics: string[] | null;
  emotional_arc: Array<{ hour: string; valence: string; arousal: number }> | null;
  key_moments: Array<{ time: string; description: string }> | null;
  environment_profile: Record<string, number> | null;
  motion_summary: Record<string, number> | null;
  created_at: string;
}

interface T3Weekly {
  id: number;
  week_start: string;
  recurring_topics: string[] | null;
  emotional_patterns: unknown;
  decision_trends: unknown;
  environment_mood_correlations: unknown;
  created_at: string;
}

interface T4Theme {
  id: number;
  theme_type: string;
  theme_name: string;
  description: string | null;
  strength: number;
  last_reinforced_at: string;
  created_at: string;
}

interface Consultation {
  id: number;
  query_transcript: string | null;
  glyph_ids: string[] | null;
  word: string | null;
  latency_ms: number | null;
  created_at: string;
}

type TierTab = "t1" | "t2" | "t3" | "t4" | "consultations";

const TIER_META: Record<TierTab, { label: string; color: string; retention: string }> = {
  t1: { label: "T1 Signals", color: zone.audio, retention: "2 hours" },
  t2: { label: "T2 Daily", color: zone.cloud, retention: "1 day" },
  t3: { label: "T3 Weekly", color: zone.device, retention: "1 week" },
  t4: { label: "T4 Themes", color: zone.glyph, retention: "2 years" },
  consultations: { label: "Consultations", color: zone.privacy, retention: "permanent" },
};

async function supabaseFetch<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${query}`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) return [];
  return res.json();
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 0,
        fontSize: 11,
        fontFamily: fonts.mono,
        fontWeight: weights.medium,
        background: color + "18",
        color,
        border: `1px solid ${color}40`,
        marginRight: 4,
        marginBottom: 4,
      }}
    >
      {children}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: spacing.xxl,
        textAlign: "center",
        color: colors.ink3,
        fontFamily: fonts.mono,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

function TimeBadge({ time }: { time: string }) {
  const d = new Date(time);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  let label: string;
  if (diffMin < 1) label = "just now";
  else if (diffMin < 60) label = `${diffMin}m ago`;
  else if (diffHr < 24) label = `${diffHr}h ago`;
  else label = d.toLocaleDateString();

  return (
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize: 10,
        color: colors.ink3,
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  );
}

function T1Row({ signal }: { signal: T1Signal }) {
  const [expanded, setExpanded] = useState(false);
  const valColor = signal.emotional_valence === "positive" ? colors.help : signal.emotional_valence === "negative" ? colors.harm : colors.ink3;

  return (
    <div
      style={{
        borderBottom: borders.rule,
        padding: `${spacing.sm}px ${spacing.md}px`,
        cursor: "pointer",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Row 1: Environment badge + transcript + time */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.xs, flex: 1, minWidth: 0 }}>
          {signal.environment_class && signal.environment_class !== "unknown" && (
            <Pill color={zone.social}>{signal.environment_class}</Pill>
          )}
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 13,
              lineHeight: 1.5,
              color: signal.transcript ? colors.ink : colors.ink3,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: expanded ? "normal" : "nowrap",
            }}
          >
            {signal.transcript || "(ambient audio)"}
          </div>
        </div>
        <TimeBadge time={signal.created_at} />
      </div>

      {/* Row 2: Always visible — emotion, arousal, ambient events, motion */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
        {signal.emotional_valence && signal.emotional_valence !== "neutral" && (
          <span style={{
            fontFamily: fonts.mono, fontSize: 10, padding: "1px 6px", borderRadius: 0,
            background: valColor + "12", color: valColor, border: `1px solid ${valColor}30`,
          }}>
            {signal.emotional_valence}
          </span>
        )}
        {signal.arousal != null && signal.arousal !== 0.5 && (
          <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3 }}>
            arousal {(signal.arousal as number).toFixed(1)}
          </span>
        )}
        {signal.ambient_events?.map((e: string) => (
          <Pill key={e} color={zone.glyph}>{e}</Pill>
        ))}
        {signal.motion_state && signal.motion_state !== "still" && (
          <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3 }}>{signal.motion_state}</span>
        )}
      </div>

      {/* Row 3: Expanded — keywords, topics */}
      {expanded && (
        <div style={{ marginTop: spacing.xs }}>
          {signal.keywords?.length ? (
            <div style={{ marginBottom: spacing.xxs }}>
              {signal.keywords.map((k) => (
                <Pill key={k} color={zone.audio}>{k}</Pill>
              ))}
            </div>
          ) : null}
          {signal.topics?.length ? (
            <div style={{ marginBottom: spacing.xxs }}>
              {signal.topics.map((t) => (
                <Pill key={t} color={zone.cloud}>{t}</Pill>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function T2Card({ daily }: { daily: T2Daily }) {
  return (
    <div
      style={{
        border: borders.rule,
        borderRadius: 0,
        padding: spacing.md,
        marginBottom: spacing.md,
        background: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.sm }}>
        <span style={{ ...typography.eyebrow }}>{daily.date}</span>
        <TimeBadge time={daily.created_at} />
      </div>

      {daily.dominant_topics?.length ? (
        <div style={{ marginBottom: spacing.sm }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3, marginBottom: 4, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>Topics</div>
          {daily.dominant_topics.map((t) => (
            <Pill key={t} color={zone.cloud}>{t}</Pill>
          ))}
        </div>
      ) : null}

      {daily.key_moments?.length ? (
        <div style={{ marginBottom: spacing.sm }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3, marginBottom: 4, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>Key Moments</div>
          {daily.key_moments.map((m, i) => (
            <div key={i} style={{ fontFamily: fonts.mono, fontSize: 12, lineHeight: 1.6, color: colors.ink2 }}>
              <span style={{ color: colors.ink3 }}>{m.time}</span> — {m.description}
            </div>
          ))}
        </div>
      ) : null}

      {daily.emotional_arc?.length ? (
        <div style={{ marginBottom: spacing.sm }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3, marginBottom: 4, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>Emotional Arc</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {daily.emotional_arc.map((e, i) => {
              const valColor = e.valence === "positive" ? colors.help : e.valence === "negative" ? colors.harm : colors.ink3;
              return (
                <span
                  key={i}
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 0,
                    background: valColor + "12",
                    color: valColor,
                    border: `1px solid ${valColor}30`,
                  }}
                >
                  {e.hour} {e.valence}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {daily.environment_profile ? (
        <div>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3, marginBottom: 4, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>Environment</div>
          {Object.entries(daily.environment_profile).map(([env, pct]) => (
            <div key={env} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.ink2, width: 80 }}>{env}</div>
              <div style={{ flex: 1, height: 6, background: colors.inkSubtle, borderRadius: 0 }}>
                <div style={{ width: `${Math.min(pct as number, 100)}%`, height: "100%", background: zone.device, borderRadius: 0 }} />
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3, width: 35, textAlign: "right" }}>{pct}%</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function T3Card({ weekly }: { weekly: T3Weekly }) {
  return (
    <div
      style={{
        border: borders.rule,
        borderRadius: 0,
        padding: spacing.md,
        marginBottom: spacing.md,
        background: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.sm }}>
        <span style={{ ...typography.eyebrow }}>Week of {weekly.week_start}</span>
        <TimeBadge time={weekly.created_at} />
      </div>

      {weekly.recurring_topics?.length ? (
        <div style={{ marginBottom: spacing.sm }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3, marginBottom: 4, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>Recurring Topics</div>
          {weekly.recurring_topics.map((t) => (
            <Pill key={t} color={zone.device}>{t}</Pill>
          ))}
        </div>
      ) : null}

      {weekly.emotional_patterns ? (
        <div style={{ marginBottom: spacing.sm }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3, marginBottom: 4, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>Emotional Patterns</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.ink2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {typeof weekly.emotional_patterns === "string"
              ? weekly.emotional_patterns
              : JSON.stringify(weekly.emotional_patterns, null, 2)}
          </div>
        </div>
      ) : null}

      {weekly.decision_trends ? (
        <div>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3, marginBottom: 4, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>Decision Trends</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.ink2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {typeof weekly.decision_trends === "string"
              ? weekly.decision_trends
              : JSON.stringify(weekly.decision_trends, null, 2)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function T4Card({ theme }: { theme: T4Theme }) {
  const strengthPct = Math.round(theme.strength * 100);
  const typeColor =
    theme.theme_type === "emotional" ? colors.harm :
    theme.theme_type === "relational" ? zone.social :
    zone.storage;

  return (
    <div
      style={{
        border: borders.rule,
        borderRadius: 0,
        padding: spacing.md,
        marginBottom: spacing.sm,
        background: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Pill color={typeColor}>{theme.theme_type}</Pill>
          <span style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: weights.medium, color: colors.ink, marginLeft: 8 }}>
            {theme.theme_name}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: weights.bold, color: typeColor }}>{strengthPct}%</div>
          <TimeBadge time={theme.last_reinforced_at} />
        </div>
      </div>
      {theme.description && (
        <div style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.ink2, lineHeight: 1.6, marginTop: spacing.xs }}>
          {theme.description}
        </div>
      )}
      <div style={{ marginTop: spacing.xs, height: 4, background: colors.inkSubtle, borderRadius: 0 }}>
        <div style={{ width: `${strengthPct}%`, height: "100%", background: typeColor, borderRadius: 0, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function ConsultationCard({ consult }: { consult: Consultation }) {
  return (
    <div
      style={{
        border: borders.rule,
        borderRadius: 0,
        padding: spacing.md,
        marginBottom: spacing.sm,
        background: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.xs }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.ink3 }}>#{consult.id}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {consult.latency_ms && (
            <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3 }}>{(consult.latency_ms / 1000).toFixed(1)}s</span>
          )}
          <TimeBadge time={consult.created_at} />
        </div>
      </div>
      {consult.query_transcript && (
        <div style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.ink2, marginBottom: spacing.xs, lineHeight: 1.5 }}>
          &ldquo;{consult.query_transcript}&rdquo;
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
        {consult.glyph_ids?.map((g, i) => {
          const arcLabel = ["setup", "tension", "resolve"][i] || "";
          return (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.ink3, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>{arcLabel}</div>
              <Pill color={zone.glyph}>{g}</Pill>
            </div>
          );
        })}
        {consult.word && (
          <div style={{ marginLeft: "auto" }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.ink3, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>word</div>
            <div style={{ fontFamily: fonts.serif, fontSize: 18, fontWeight: weights.medium, color: colors.ink }}>{consult.word}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TierViewer() {
  const [tab, setTab] = useState<TierTab>("t1");
  const [t1, setT1] = useState<T1Signal[]>([]);
  const [t2, setT2] = useState<T2Daily[]>([]);
  const [t3, setT3] = useState<T3Weekly[]>([]);
  const [t4, setT4] = useState<T4Theme[]>([]);
  const [consults, setConsults] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const deviceFilter = `device_id=eq.${DEVICE_ID}`;

    const [t1Data, t2Data, t3Data, t4Data, consultData] = await Promise.all([
      supabaseFetch<T1Signal>("tier_1_signals", `${deviceFilter}&order=created_at.desc&limit=50`),
      supabaseFetch<T2Daily>("tier_2_daily", `${deviceFilter}&order=date.desc&limit=7`),
      supabaseFetch<T3Weekly>("tier_3_weekly", `${deviceFilter}&order=week_start.desc&limit=4`),
      supabaseFetch<T4Theme>("tier_4_themes", `${deviceFilter}&order=strength.desc&limit=20`),
      supabaseFetch<Consultation>("consultations", `${deviceFilter}&order=created_at.desc&limit=20`),
    ]);

    setT1(t1Data);
    setT2(t2Data);
    setT3(t3Data);
    setT4(t4Data);
    setConsults(consultData);
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const counts: Record<TierTab, number> = {
    t1: t1.length,
    t2: t2.length,
    t3: t3.length,
    t4: t4.length,
    consultations: consults.length,
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: `${spacing.xl}px ${spacing.lg}px` }}>
      {/* Header */}
      <div style={{ marginBottom: spacing.xl }}>
        <div style={{ ...typography.eyebrow, marginBottom: spacing.xs }}>Project Nara</div>
        <h1 style={{ ...typography.h1, marginBottom: spacing.sm }}>Context Tiers</h1>
        <p style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.ink2, lineHeight: 1.6 }}>
          Live view of the tiered memory cascade. T1 signals compress into T2 daily digests,
          which compress into T3 weekly patterns, which distill into T4 long-term themes.
        </p>
      </div>

      {/* Stat strip */}
      <div
        style={{
          display: "flex",
          gap: spacing.md,
          marginBottom: spacing.lg,
          padding: `${spacing.sm}px 0`,
          borderTop: borders.rule,
          borderBottom: borders.rule,
        }}
      >
        {(Object.keys(TIER_META) as TierTab[]).map((key) => {
          const meta = TIER_META[key];
          return (
            <div key={key} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 22, fontWeight: weights.bold, color: meta.color }}>
                {counts[key]}
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                {meta.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: spacing.lg, borderBottom: borders.rule }}>
        {(Object.keys(TIER_META) as TierTab[]).map((key) => {
          const meta = TIER_META[key];
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                padding: `${spacing.sm}px ${spacing.xs}px`,
                fontFamily: fonts.mono,
                fontSize: 11,
                fontWeight: active ? weights.medium : weights.regular,
                color: active ? meta.color : colors.ink3,
                background: "none",
                border: "none",
                borderBottom: active ? `2px solid ${meta.color}` : "2px solid transparent",
                cursor: "pointer",
                letterSpacing: "0.05em",
                transition: "all 0.15s",
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Refresh bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.ink3 }}>
          Retention: {TIER_META[tab].retention} · Auto-refresh 30s
          {lastRefresh && ` · Last: ${lastRefresh.toLocaleTimeString()}`}
        </span>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            padding: "4px 12px",
            border: borders.rule,
            borderRadius: 0,
            background: loading ? colors.inkSubtle : "white",
            color: colors.ink2,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {/* Content */}
      {tab === "t1" && (
        t1.length === 0 ? <EmptyState message="No T1 signals yet. Speak near the device to generate context." /> :
        <div style={{ border: borders.rule, borderRadius: 0, background: "white", overflow: "hidden" }}>
          {t1.map((s) => <T1Row key={s.id} signal={s} />)}
        </div>
      )}

      {tab === "t2" && (
        t2.length === 0 ? <EmptyState message="No T2 daily digests yet. Compression runs at :05 past each hour." /> :
        t2.map((d) => <T2Card key={d.id} daily={d} />)
      )}

      {tab === "t3" && (
        t3.length === 0 ? <EmptyState message="No T3 weekly patterns yet. Compression runs daily at 01:00 UTC." /> :
        t3.map((w) => <T3Card key={w.id} weekly={w} />)
      )}

      {tab === "t4" && (
        t4.length === 0 ? <EmptyState message="No T4 themes yet. Themes emerge after weekly compression runs." /> :
        t4.map((t) => <T4Card key={t.id} theme={t} />)
      )}

      {tab === "consultations" && (
        consults.length === 0 ? <EmptyState message="No consultations yet. Hold the button and speak to consult." /> :
        consults.map((c) => <ConsultationCard key={c.id} consult={c} />)
      )}
    </div>
  );
}
