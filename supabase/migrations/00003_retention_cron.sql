-- 00003_retention_cron.sql
-- pg_cron jobs for tiered memory retention
-- T1: 1 hour, T2: 1 day, T3: 1 week, T4: 2 years (by last_reinforced_at)

-- Enable the pg_cron extension
create extension if not exists pg_cron;

-- Grant usage to postgres role so cron jobs can execute
grant usage on schema cron to postgres;

-- ============================================================================
-- cleanup-tier1: run every hour at :55, delete signals older than 2 hours
-- Uses 2-hour window (not 1h) to give compress-hourly (runs at :05) safe margin.
-- Compression must run BEFORE cleanup. Stagger: compress at :05, cleanup at :55.
-- ============================================================================
select cron.schedule(
  'cleanup-tier1',
  '55 * * * *',  -- every hour at :55 (after compress-hourly at :05)
  $$delete from public.tier_1_signals where created_at < now() - interval '2 hours'$$
);

-- ============================================================================
-- cleanup-tier2: run daily at 02:00 UTC, delete daily summaries older than 1 day
-- ============================================================================
select cron.schedule(
  'cleanup-tier2',
  '0 2 * * *',  -- daily at 02:00 UTC
  $$delete from public.tier_2_daily where created_at < now() - interval '1 day'$$
);

-- ============================================================================
-- cleanup-tier3: run weekly on Sunday at 03:00 UTC, delete weekly summaries older than 1 week
-- ============================================================================
select cron.schedule(
  'cleanup-tier3',
  '0 3 * * 0',  -- every Sunday at 03:00 UTC
  $$delete from public.tier_3_weekly where created_at < now() - interval '1 week'$$
);

-- ============================================================================
-- cleanup-tier4: run monthly on 1st at 04:00 UTC, delete themes not reinforced in 2 years
-- ============================================================================
select cron.schedule(
  'cleanup-tier4',
  '0 4 1 * *',  -- 1st of each month at 04:00 UTC
  $$delete from public.tier_4_themes where last_reinforced_at < now() - interval '2 years'$$
);
