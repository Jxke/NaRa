-- 00001_initial_schema.sql
-- Full database schema for Maddi context pipeline
-- Tiered memory architecture: T1 (raw signals) -> T2 (daily) -> T3 (weekly) -> T4 (themes)

-- ============================================================================
-- devices
-- ============================================================================
create table if not exists public.devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Maddi',
  firmware_version text,
  last_seen_at timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.devices is 'Physical Maddi devices linked to a user account.';

-- ============================================================================
-- tier_1_signals — raw per-utterance data, retained ~1 hour
-- ============================================================================
create table if not exists public.tier_1_signals (
  id                bigint generated always as identity primary key,
  device_id         uuid not null references public.devices (id) on delete cascade,
  transcript        text,
  speaker_label     text,
  keywords          text[],
  topics            text[],
  emotional_valence text,          -- positive / neutral / negative
  arousal           float,
  stress            float,
  environment_class text,
  ambient_events    text[],
  noise_floor_db    float,
  motion_state      text,
  created_at        timestamptz not null default now()
);

comment on table public.tier_1_signals is 'Raw signal ingestion from device microphone + sensors. Short-lived (1 hour retention).';

-- ============================================================================
-- tier_2_daily — compressed daily summaries, retained ~1 day
-- ============================================================================
create table if not exists public.tier_2_daily (
  id                  bigint generated always as identity primary key,
  device_id           uuid not null references public.devices (id) on delete cascade,
  date                date not null,
  dominant_topics     text[],
  emotional_arc       jsonb,
  key_moments         jsonb,
  environment_profile jsonb,
  motion_summary      jsonb,
  created_at          timestamptz not null default now()
);

comment on table public.tier_2_daily is 'Daily compressed summaries from T1 signals. Retained ~1 day.';

-- ============================================================================
-- tier_3_weekly — weekly pattern summaries, retained ~1 week
-- ============================================================================
create table if not exists public.tier_3_weekly (
  id                            bigint generated always as identity primary key,
  device_id                     uuid not null references public.devices (id) on delete cascade,
  week_start                    date not null,
  recurring_topics              text[],
  emotional_patterns            jsonb,
  decision_trends               jsonb,
  environment_mood_correlations jsonb,
  created_at                    timestamptz not null default now()
);

comment on table public.tier_3_weekly is 'Weekly pattern summaries from T2 daily data. Retained ~1 week.';

-- ============================================================================
-- tier_4_themes — long-lived identity themes, retained up to 2 years
-- ============================================================================
create table if not exists public.tier_4_themes (
  id                 bigint generated always as identity primary key,
  device_id          uuid not null references public.devices (id) on delete cascade,
  theme_type         text not null,
  theme_name         text not null,
  description        text,
  strength           float not null default 0.0,
  last_reinforced_at timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

comment on table public.tier_4_themes is 'Persistent identity themes distilled from weekly patterns. Retained up to 2 years.';

-- ============================================================================
-- consultations — glyph consultation sessions
-- ============================================================================
create table if not exists public.consultations (
  id               bigint generated always as identity primary key,
  device_id        uuid not null references public.devices (id) on delete cascade,
  query_transcript text,
  glyph_ids        text[],
  word             text,
  reasoning        text,
  latency_ms       int,
  created_at       timestamptz not null default now()
);

comment on table public.consultations is 'Records of glyph consultations: query, selected glyphs, word, and reasoning.';

-- ============================================================================
-- glyphs — the symbolic glyph library (shared, read-only for users)
-- ============================================================================
create table if not exists public.glyphs (
  id              text primary key,
  tags            text[] not null default '{}',
  interpretations text[] not null default '{}',
  prompt_questions text[] not null default '{}',
  bitmap_url      text,
  created_at      timestamptz not null default now()
);

comment on table public.glyphs is 'The shared NaRa glyph library. Shared across all users, read-only.';
