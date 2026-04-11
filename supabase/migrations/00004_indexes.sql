-- 00004_indexes.sql
-- Performance indexes for common query patterns
-- NOTE: idx_devices_user is created in 00002_rls_policies.sql (required by RLS subqueries)

-- ============================================================================
-- Query indexes — consultation context fetch pattern
-- ============================================================================

-- tier_1_signals: "last 5 signals for device" (ORDER BY created_at DESC LIMIT 5)
create index if not exists idx_tier1_device_created
  on public.tier_1_signals (device_id, created_at desc);

-- tier_2_daily: "today's digest for device" (WHERE date = CURRENT_DATE)
create index if not exists idx_tier2_device_date
  on public.tier_2_daily (device_id, date desc);

-- tier_3_weekly: "this week's summary for device"
create index if not exists idx_tier3_device_week
  on public.tier_3_weekly (device_id, week_start desc);

-- tier_4_themes: "top 5 themes by strength for device"
create index if not exists idx_tier4_device_strength
  on public.tier_4_themes (device_id, strength desc);

-- consultations: "recent consultations for device"
create index if not exists idx_consultations_device_created
  on public.consultations (device_id, created_at desc);

-- ============================================================================
-- Cleanup indexes — retention cron jobs delete by time
-- ============================================================================

-- tier_1_signals: hourly cleanup (WHERE created_at < now() - 1 hour)
create index if not exists idx_tier1_created
  on public.tier_1_signals (created_at);

-- tier_2_daily: daily cleanup (WHERE created_at < now() - 1 day)
create index if not exists idx_tier2_created
  on public.tier_2_daily (created_at);

-- tier_3_weekly: weekly cleanup (WHERE created_at < now() - 1 week)
create index if not exists idx_tier3_created
  on public.tier_3_weekly (created_at);

-- tier_4_themes: monthly cleanup (WHERE last_reinforced_at < now() - 2 years)
create index if not exists idx_tier4_last_reinforced
  on public.tier_4_themes (last_reinforced_at);
