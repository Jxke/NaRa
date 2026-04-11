-- 00006_compression_cron.sql
-- pg_cron schedules to trigger compression Edge Functions via pg_net HTTP POST.
-- Compression runs BEFORE cleanup (cleanup-tier1 at :55, see 00003_retention_cron.sql).
-- Auth via X-Cron-Secret header (set via: supabase secrets set CRON_SECRET=<value>).

-- Enable pg_net for HTTP calls from within Postgres
create extension if not exists pg_net with schema extensions;

-- ============================================================================
-- compress-hourly: T1 → T2, runs at :05 past every hour
-- ============================================================================
select cron.schedule(
  'compress-hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://tsblsjjlrjnllsqyusmb.supabase.co/functions/v1/compress-hourly',
    headers := '{"Content-Type": "application/json", "X-Cron-Secret": "maddi-cron-2024"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- compress-daily: T2 → T3, runs daily at 01:00 UTC
-- ============================================================================
select cron.schedule(
  'compress-daily',
  '0 1 * * *',
  $$
  select net.http_post(
    url := 'https://tsblsjjlrjnllsqyusmb.supabase.co/functions/v1/compress-daily',
    headers := '{"Content-Type": "application/json", "X-Cron-Secret": "maddi-cron-2024"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- compress-weekly: T3 → T4, runs Sunday at 01:00 UTC
-- ============================================================================
select cron.schedule(
  'compress-weekly',
  '0 1 * * 0',
  $$
  select net.http_post(
    url := 'https://tsblsjjlrjnllsqyusmb.supabase.co/functions/v1/compress-weekly',
    headers := '{"Content-Type": "application/json", "X-Cron-Secret": "maddi-cron-2024"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
